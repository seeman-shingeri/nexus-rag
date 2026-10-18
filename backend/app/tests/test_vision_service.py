import numpy as np
import pytest
from app.services.vision_service import VisionService

@pytest.mark.asyncio
async def test_frame_encoding_and_decoding():
    # Create blank test frame
    img = np.zeros((200, 300, 3), dtype=np.uint8)
    img[50:150, 50:250] = (0, 255, 0)  # Green rectangle

    b64 = VisionService.encode_frame_to_base64(img)
    assert b64.startswith("data:image/jpeg;base64,")

    decoded = VisionService.decode_base64_frame(b64)
    assert decoded is not None
    assert decoded.shape == (200, 300, 3)

@pytest.mark.asyncio
async def test_synthetic_demo_frame_generation():
    frame, detections = VisionService.generate_synthetic_demo_frame(camera_id=1, tick=15)
    assert frame.shape == (360, 640, 3)
    assert len(detections) > 0
    # Expect liquid spill detection in CAM-01
    assert any(d["category"] == "liquid_spill" for d in detections)

    # Test CAM-02 unauthorized vault
    frame2, detections2 = VisionService.generate_synthetic_demo_frame(camera_id=2, tick=5)
    assert any(d["category"] == "person" for d in detections2)

@pytest.mark.asyncio
async def test_render_detection_overlays():
    frame = np.zeros((300, 400, 3), dtype=np.uint8)
    sample_detections = [
        {
            "category": "liquid_spill",
            "confidence": 0.85,
            "bounding_box": [0.2, 0.4, 0.3, 0.2],
            "label": "Liquid Spill",
            "requires_review": True
        }
    ]
    annotated = VisionService.render_detection_overlays(frame, sample_detections)
    assert annotated.shape == frame.shape
    # Frame should have colored bounding box pixels (not all black)
    assert np.count_nonzero(annotated) > 0

@pytest.mark.asyncio
async def test_vision_api_endpoints(client):
    # 1. Test cameras list
    res = await client.get("/api/v1/vision/cameras")
    assert res.status_code == 200

    # 2. Test demo frame endpoint
    demo_res = await client.get("/api/v1/vision/demo-frame/1?tick=10")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert demo_data["camera_id"] == 1
    assert len(demo_data["detections"]) > 0
    assert "annotated_frame_base64" in demo_data

    # 3. Test process-frame endpoint
    test_img = np.zeros((240, 320, 3), dtype=np.uint8)
    test_b64 = VisionService.encode_frame_to_base64(test_img)
    proc_res = await client.post(
        "/api/v1/vision/process-frame",
        json={
            "image_base64": test_b64,
            "camera_id": 1,
            "is_demo": False
        }
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["camera_id"] == 1
    assert "processing_time_ms" in proc_data
