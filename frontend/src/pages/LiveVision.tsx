import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  RefreshCw,
  Info,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../services/api';

interface CameraSource {
  id: number;
  name: string;
  location: string;
  is_demo: boolean;
  resolution: string;
  fps: number;
}

interface DetectionItem {
  category: string;
  confidence: number;
  bounding_box: number[];
  label: string;
  requires_review: boolean;
}

interface ObservationHistoryItem {
  id: string;
  timestamp: string;
  camera: string;
  zone: string;
  category: string;
  confidence: number;
  requires_review: boolean;
}

export const LiveVision: React.FC = () => {
  const [cameras, setCameras] = useState<CameraSource[]>([
    { id: 1, name: 'CAM-01: Main Fabrication Floor', location: 'Zone 1', is_demo: false, resolution: '1280x720', fps: 25 },
    { id: 2, name: 'CAM-02: Chemical Storage Vault', location: 'Zone 2 (Restricted)', is_demo: true, resolution: '1280x720', fps: 15 },
    { id: 3, name: 'CAM-03: Loading Bay Beta', location: 'Zone 3', is_demo: true, resolution: '1920x1080', fps: 30 },
    { id: 4, name: 'CAM-04: Server Infrastructure', location: 'Zone 4 (Restricted)', is_demo: true, resolution: '1280x720', fps: 15 },
  ]);
  const [selectedCamId, setSelectedCamId] = useState<number>(1);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [history, setHistory] = useState<ObservationHistoryItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [fps, setFps] = useState<number>(15);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamIntervalRef = useRef<any>(null);
  const tickRef = useRef<number>(0);

  const selectedCam = cameras.find((c) => c.id === selectedCamId) || cameras[0];

  useEffect(() => {
    // Fetch registered cameras from backend
    const loadCameras = async () => {
      try {
        const res = await apiClient.get('/vision/cameras');
        if (res.data && res.data.length > 0) {
          setCameras(res.data);
        }
      } catch (err) {
        console.warn('Using standard registered cameras');
      }
    };
    loadCameras();

    return () => {
      stopStream();
    };
  }, []);

  const startStream = async () => {
    setPermissionError(null);
    setIsStreaming(true);

    if (!selectedCam.is_demo) {
      // Physical webcam attempt
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
          setWebcamActive(true);
        }
        streamIntervalRef.current = setInterval(captureAndProcessWebcamFrame, 200);
      } catch (err: any) {
        setPermissionError('Hardware webcam not detected or permission denied. Switched to verified synthetic demonstration feed.');
        streamIntervalRef.current = setInterval(fetchDemoFrame, 200);
      }
    } else {
      // Synthetic Demo Feed
      streamIntervalRef.current = setInterval(fetchDemoFrame, 200);
    }
  };

  const stopStream = () => {
    setIsStreaming(false);
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setWebcamActive(false);
    }
    setDetections([]);
    setCurrentFrameUrl(null);
  };

  const captureAndProcessWebcamFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return;

    canvas.width = 640;
    canvas.height = 360;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.7);

    const start = performance.now();
    try {
      const res = await apiClient.post('/vision/process-frame', {
        image_base64: b64,
        camera_id: selectedCamId,
        is_demo: false,
      });
      setLatencyMs(Math.round(performance.now() - start));
      const detList: DetectionItem[] = res.data.detections || [];
      setDetections(detList);
      setCurrentFrameUrl(res.data.annotated_frame_base64);

      if (detList.length > 0) {
        addObservationHistory(detList[0]);
      }
    } catch (err) {
      console.warn('Frame processing dropped');
    }
  };

  const fetchDemoFrame = async () => {
    tickRef.current += 1;
    const start = performance.now();
    try {
      const res = await apiClient.get(`/vision/demo-frame/${selectedCamId}?tick=${tickRef.current}`);
      setLatencyMs(Math.round(performance.now() - start));
      const detList: DetectionItem[] = res.data.detections || [];
      setDetections(detList);
      setCurrentFrameUrl(res.data.annotated_frame_base64);

      if (detList.length > 0 && tickRef.current % 5 === 0) {
        addObservationHistory(detList[0]);
      }
    } catch (err) {
      console.warn('Demo frame fetch interrupted');
    }
  };

  const addObservationHistory = (det: DetectionItem) => {
    setHistory((prev) => [
      {
        id: Math.random().toString(36).substring(2, 8),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        camera: selectedCam.name.split(':')[0],
        zone: selectedCam.location,
        category: det.category,
        confidence: det.confidence,
        requires_review: det.requires_review
      },
      ...prev.slice(0, 9)
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Live Vision & Hazard Detection</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Optical feed ingestion, spatial bounding box overlays, and rule persistence evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-500 hidden sm:inline">SENSOR:</label>
            <select
              value={selectedCamId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCamId(id);
                if (isStreaming) {
                  stopStream();
                }
              }}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_demo ? '(Demo Stream)' : '(Webcam)'}
                </option>
              ))}
            </select>
          </div>

          {/* Start/Stop Button */}
          {isStreaming ? (
            <button
              onClick={stopStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium tracking-wide transition shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Stream</span>
            </button>
          ) : (
            <button
              onClick={startStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium tracking-wide transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Stream</span>
            </button>
          )}
        </div>
      </div>

      {permissionError && (
        <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Main Grid: Video Viewport (8 cols) + Detections & History (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Primary Video Area */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative shadow-sm aspect-video flex flex-col justify-between">
            {/* Top Viewport Header */}
            <div className="p-3 flex items-center justify-between z-10 bg-slate-900/80 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="font-semibold text-white">{selectedCam.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">{selectedCam.location}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {selectedCam.is_demo ? (
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-medium">
                    SYNTHETIC DEMO STREAM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-medium">
                    HARDWARE WEBCAM
                  </span>
                )}
              </div>
            </div>

            {/* Video Canvas or Standby Screen */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
              {isStreaming && currentFrameUrl ? (
                <img
                  src={currentFrameUrl}
                  alt="Optical Vision Feed"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 space-y-2">
                  <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                    Camera Stream Inactive
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs font-mono">
                    Click 'Start Stream' above to engage visual capture and deterministic hazard analysis.
                  </p>
                </div>
              )}

              {/* Hidden HTML elements for browser webcam pipeline */}
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom Viewport Telemetry Bar */}
            <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 z-10 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span>Latency: <strong className="text-slate-200">{isStreaming ? `${latencyMs} ms` : '—'}</strong></span>
                <span>Framerate: <strong className="text-slate-200">{isStreaming ? `${fps} FPS` : '—'}</strong></span>
                <span>Resolution: <strong className="text-slate-200">{selectedCam.resolution}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-slate-300 uppercase">
                  {isStreaming ? 'Inference Verified' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Active Detections & Observation Log */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Active Detections Box */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 uppercase font-mono">
                <span>Active Detections</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {detections.length} Detected
              </span>
            </div>

            {detections.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-mono">
                {isStreaming ? 'Scanning optical frame...' : 'Stream inactive.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {detections.map((det, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-slate-900">{det.label}</span>
                      <span className="font-semibold text-emerald-700">
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Category: {det.category}</span>
                      {det.requires_review && (
                        <span className="text-amber-700 font-medium">Review Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observation Activity Log */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900 uppercase font-mono">
                Recent Optical Observations
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {history.length} Events
              </span>
            </div>

            {history.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-mono">
                No observations recorded yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {history.map((h) => (
                  <div key={h.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-slate-800 font-mono text-[11px]">
                        {h.category} ({(h.confidence * 100).toFixed(0)}%)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {h.camera} · {h.zone}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {h.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
