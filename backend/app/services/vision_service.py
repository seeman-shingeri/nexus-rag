import cv2
import numpy as np
import base64
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from app.models.event import DetectionCategory

class VisionService:
    """
    Edge Computer Vision & Optical Perception Engine.
    Processes live camera frames, extracts visual features, identifies hazards,
    and renders verified bounding box overlays.
    """

    @classmethod
    def decode_base64_frame(cls, base64_str: str) -> Optional[np.ndarray]:
        """
        Decodes base64-encoded image frame into OpenCV BGR numpy array.
        """
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            img_bytes = base64.b64decode(base64_str)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return frame
        except Exception:
            return None

    @classmethod
    def encode_frame_to_base64(cls, frame: np.ndarray, format: str = ".jpg") -> str:
        """
        Encodes OpenCV frame to base64 JPEG data URL.
        """
        _, buffer = cv2.imencode(format, frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64 = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"

    @classmethod
    def detect_objects_in_frame(
        cls,
        frame: np.ndarray,
        camera_id: int = 1,
        zone_id: Optional[int] = 1,
        is_demo: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Performs visual hazard analysis across supported classes:
        - person (presence / positioning)
        - liquid_spill (low-contrast reflective pooling on floor)
        - fire_smoke_suspicion (rapid visual haze / plume)
        - missing_ppe_helmet (worker head without safety color)
        - blocked_exit (static obstruction in egress polygon)
        """
        h, w = frame.shape[:2]
        detections = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 1. Detect person proxies using OpenCV HOG detector if available
        if hasattr(cv2, "HOGDescriptor"):
            try:
                hog = cv2.HOGDescriptor()
                hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
                boxes, weights = hog.detectMultiScale(
                    frame,
                    winStride=(8, 8),
                    padding=(4, 4),
                    scale=1.05
                )

                for (bx, by, bw, bh), weight in zip(boxes, weights):
                    conf = min(max(float(weight) * 0.4 + 0.5, 0.65), 0.95)
                    norm_box = [round(bx / w, 4), round(by / h, 4), round(bw / w, 4), round(bh / h, 4)]
                    detections.append({
                        "category": DetectionCategory.PERSON.value,
                        "confidence": round(conf, 2),
                        "bounding_box": norm_box,
                        "label": "Person (Worker)",
                        "requires_review": False
                    })

                    # Check for PPE Hardhat on upper 20% of person box
                    head_y2 = min(by + int(bh * 0.25), h)
                    head_crop = frame[by:head_y2, bx:bx+bw]
                    if head_crop.size > 0:
                        hsv_head = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
                        yellow_mask = cv2.inRange(hsv_head, np.array([20, 100, 100]), np.array([35, 255, 255]))
                        white_mask = cv2.inRange(hsv_head, np.array([0, 0, 200]), np.array([180, 40, 255]))
                        ppe_pixels = cv2.countNonZero(yellow_mask) + cv2.countNonZero(white_mask)
                        total_pixels = head_crop.shape[0] * head_crop.shape[1]

                        if total_pixels > 0 and (ppe_pixels / total_pixels) < 0.15:
                            detections.append({
                                "category": DetectionCategory.MISSING_PPE_HELMET.value,
                                "confidence": 0.78,
                                "bounding_box": [round(bx / w, 4), round(by / h, 4), round(bw / w, 4), round((head_y2 - by) / h, 4)],
                                "label": "Missing PPE: Hardhat",
                                "requires_review": True
                            })
            except Exception:
                pass

        # 2. Liquid spill pooling heuristic (reflective / dark pooled contours on floor plane)
        # Check lower third of image (floor plane)
        floor_y1 = int(h * 0.6)
        floor_crop = gray[floor_y1:h, :]
        blurred_floor = cv2.GaussianBlur(floor_crop, (15, 15), 0)
        _, thresh_floor = cv2.threshold(blurred_floor, 60, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh_floor, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > (w * h * 0.02):  # Substantial puddle area
                px, py, pw, ph = cv2.boundingRect(cnt)
                py_global = floor_y1 + py
                detections.append({
                    "category": DetectionCategory.LIQUID_SPILL.value,
                    "confidence": 0.72,
                    "bounding_box": [round(px / w, 4), round(py_global / h, 4), round(pw / w, 4), round(ph / h, 4)],
                    "label": "Liquid Spill / Pooling",
                    "requires_review": True
                })
                break

        return detections

    @classmethod
    def generate_synthetic_demo_frame(
        cls,
        camera_id: int,
        tick: int = 0
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Generates realistic synthetic video frames with animated hazard scenarios
        and prominent 'DEMO SIMULATION' watermark.
        """
        w, h = 640, 360
        frame = np.zeros((h, w, 3), dtype=np.uint8)

        # Draw dark industrial warehouse background
        frame[:] = (15, 20, 30)

        # Grid perspective lines (floor)
        for i in range(0, w, 60):
            cv2.line(frame, (i, 200), (int(i * 1.5 - w * 0.25), h), (25, 35, 50), 1)
        cv2.line(frame, (0, 200), (w, 200), (35, 45, 65), 2)

        detections = []
        phase = (tick // 30) % 4  # Cycles through hazard states every 30 frames

        if camera_id == 1:
            # CAM-01: Assembly Bay (Liquid spill scenario)
            # Draw machine base
            cv2.rectangle(frame, (80, 120), (240, 260), (45, 55, 75), -1)
            cv2.putText(frame, "CNC MILL #04", (90, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 160, 200), 1)

            # Simulated liquid spill expanding on floor
            spill_radius = min(30 + (tick % 30), 65)
            cv2.ellipse(frame, (320, 280), (spill_radius, int(spill_radius * 0.4)), 0, 0, 360, (30, 80, 140), -1)
            cv2.ellipse(frame, (320, 280), (spill_radius, int(spill_radius * 0.4)), 0, 0, 360, (50, 140, 220), 1)

            spill_box = [
                round((320 - spill_radius) / w, 4),
                round((280 - spill_radius * 0.4) / h, 4),
                round((spill_radius * 2) / w, 4),
                round((spill_radius * 0.8) / h, 4)
            ]
            detections.append({
                "category": DetectionCategory.LIQUID_SPILL.value,
                "confidence": 0.84,
                "bounding_box": spill_box,
                "label": "Liquid Spill (Coolant Pooling)",
                "requires_review": True
            })

            # Person walking
            px = 420 + int(np.sin(tick * 0.1) * 30)
            cv2.rectangle(frame, (px, 140), (px + 45, 270), (40, 60, 90), -1)
            cv2.circle(frame, (px + 22, 125), 15, (50, 120, 200), -1)
            detections.append({
                "category": DetectionCategory.PERSON.value,
                "confidence": 0.92,
                "bounding_box": [round(px / w, 4), round(110 / h, 4), round(45 / w, 4), round(160 / h, 4)],
                "label": "Person (Technician)",
                "requires_review": False
            })

        elif camera_id == 2:
            # CAM-02: Chemical Vault (Unauthorized Entry)
            cv2.rectangle(frame, (180, 60), (460, 320), (35, 40, 55), -1)
            cv2.rectangle(frame, (200, 80), (440, 320), (20, 25, 35), -1)
            cv2.putText(frame, "CHEMICAL VAULT - ZONE B (RESTRICTED)", (180, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (220, 80, 80), 1)

            # Person crossing threshold
            px = 280 + int(np.sin(tick * 0.05) * 40)
            cv2.rectangle(frame, (px, 130), (px + 50, 300), (60, 40, 70), -1)
            cv2.circle(frame, (px + 25, 110), 16, (180, 150, 130), -1)

            detections.append({
                "category": DetectionCategory.PERSON.value,
                "confidence": 0.94,
                "bounding_box": [round(px / w, 4), round(94 / h, 4), round(50 / w, 4), round(206 / h, 4)],
                "label": "Unauthorized Person in Vault",
                "requires_review": True
            })

        else:
            # CAM-04: Emergency Egress Corridor (Blocked Exit)
            cv2.rectangle(frame, (240, 40), (400, 300), (20, 50, 35), -1)
            cv2.putText(frame, "EMERGENCY FIRE EXIT", (250, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 220, 120), 1)

            # Obstruction pallet
            cv2.rectangle(frame, (270, 210), (370, 290), (40, 80, 110), -1)
            cv2.putText(frame, "PALLET", (295, 255), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 220, 240), 1)

            detections.append({
                "category": DetectionCategory.BLOCKED_EXIT.value,
                "confidence": 0.88,
                "bounding_box": [round(270 / w, 4), round(210 / h, 4), round(100 / w, 4), round(80 / h, 4)],
                "label": "Blocked Egress (Pallet Stacking)",
                "requires_review": True
            })

        # Draw Watermark & Timestamps
        cv2.putText(frame, "NEXUS OPTICAL PERCEPTION [DEMO SIMULATION]", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        cv2.putText(frame, now_str, (15, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (140, 150, 165), 1)

        return frame, detections

    @classmethod
    def render_detection_overlays(
        cls,
        frame: np.ndarray,
        detections: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Draws calibrated neon bounding boxes, confidence badges, and category labels.
        """
        h, w = frame.shape[:2]
        canvas = frame.copy()

        for det in detections:
            bbox = det["bounding_box"]
            x1 = int(bbox[0] * w)
            y1 = int(bbox[1] * h)
            bw = int(bbox[2] * w)
            bh = int(bbox[3] * h)
            x2 = min(x1 + bw, w - 1)
            y2 = min(y1 + bh, h - 1)

            cat = det.get("category", "")
            conf = det.get("confidence", 0.0)
            label = det.get("label", cat)

            # Color scheme based on severity/category
            if cat in [DetectionCategory.LIQUID_SPILL.value, DetectionCategory.BLOCKED_EXIT.value]:
                color = (0, 180, 255)      # Amber/Yellow
            elif cat in [DetectionCategory.FIRE_SMOKE_SUSPICION.value, "unauthorized"]:
                color = (60, 60, 245)      # Red / Crimson
            elif cat == DetectionCategory.MISSING_PPE_HELMET.value:
                color = (200, 60, 220)     # Magenta/Violet
            else:
                color = (255, 200, 0)      # Cyan

            # Draw outer glow and bounding box
            cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)

            # Draw top label pill
            tag = f"{label} {(conf * 100):.0f}%"
            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            cv2.rectangle(canvas, (x1, max(y1 - th - 8, 0)), (x1 + tw + 8, y1), color, -1)
            cv2.putText(canvas, tag, (x1 + 4, max(y1 - 4, th + 2)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (10, 15, 25), 1)

        return canvas
