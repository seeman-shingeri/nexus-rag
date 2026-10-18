import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.camera import CameraSource
from app.schemas.vision import ProcessFrameRequest, ProcessFrameResponse, CameraItem
from app.services.vision_service import VisionService
from app.api.deps import get_current_user

router = APIRouter(prefix="/vision", tags=["Live Vision & Computer Vision"])

@router.get("/cameras", response_model=List[CameraItem])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CameraSource).where(CameraSource.is_active == True))
    return result.scalars().all()

@router.post("/process-frame", response_model=ProcessFrameResponse)
async def process_frame(payload: ProcessFrameRequest):
    start_t = time.time()

    frame = VisionService.decode_base64_frame(payload.image_base64)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    detections = VisionService.detect_objects_in_frame(
        frame=frame,
        camera_id=payload.camera_id,
        zone_id=payload.zone_id,
        is_demo=payload.is_demo
    )

    annotated = VisionService.render_detection_overlays(frame, detections)
    annotated_b64 = VisionService.encode_frame_to_base64(annotated)

    proc_time = round((time.time() - start_t) * 1000, 2)
    now_str = datetime.now(timezone.utc).isoformat()

    return ProcessFrameResponse(
        camera_id=payload.camera_id,
        detections=detections,
        annotated_frame_base64=annotated_b64,
        processing_time_ms=proc_time,
        timestamp=now_str
    )

@router.get("/demo-frame/{camera_id}", response_model=ProcessFrameResponse)
async def get_demo_frame(camera_id: int, tick: int = 0):
    start_t = time.time()
    frame, detections = VisionService.generate_synthetic_demo_frame(camera_id=camera_id, tick=tick)
    annotated = VisionService.render_detection_overlays(frame, detections)
    annotated_b64 = VisionService.encode_frame_to_base64(annotated)

    proc_time = round((time.time() - start_t) * 1000, 2)
    now_str = datetime.now(timezone.utc).isoformat()

    return ProcessFrameResponse(
        camera_id=camera_id,
        detections=detections,
        annotated_frame_base64=annotated_b64,
        processing_time_ms=proc_time,
        timestamp=now_str
    )

@router.websocket("/ws")
async def vision_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for high-frequency live frame processing.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            b64_frame = data.get("frame")
            camera_id = data.get("camera_id", 1)
            is_demo = data.get("is_demo", False)
            tick = data.get("tick", 0)

            start_t = time.time()
            if is_demo or not b64_frame:
                frame, detections = VisionService.generate_synthetic_demo_frame(camera_id=camera_id, tick=tick)
            else:
                frame = VisionService.decode_base64_frame(b64_frame)
                if frame is None:
                    await websocket.send_json({"error": "Failed to decode frame"})
                    continue
                detections = VisionService.detect_objects_in_frame(frame, camera_id=camera_id)

            annotated = VisionService.render_detection_overlays(frame, detections)
            annotated_b64 = VisionService.encode_frame_to_base64(annotated)
            proc_time = round((time.time() - start_t) * 1000, 2)

            await websocket.send_json({
                "camera_id": camera_id,
                "detections": detections,
                "annotated_frame": annotated_b64,
                "processing_time_ms": proc_time,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close()
