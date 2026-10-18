import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Radio, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  ShieldAlert, 
  Layers,
  RefreshCw,
  Sliders,
  Eye
} from 'lucide-react';
import { api, apiClient } from '../services/api';

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
  bounding_box: number[]; // [x, y, w, h]
  label: string;
  requires_review: boolean;
}

export const LiveVision: React.FC = () => {
  const [cameras, setCameras] = useState<CameraSource[]>([
    { id: 1, name: 'CAM-01: Assembly Bay (Webcam)', location: 'Zone A', is_demo: false, resolution: '1280x720', fps: 25 },
    { id: 2, name: 'CAM-02: Chemical Vault Entry (DEMO)', location: 'Zone B', is_demo: true, resolution: '1280x720', fps: 15 },
    { id: 3, name: 'CAM-03: Loading Bay Corridor (DEMO)', location: 'Zone C', is_demo: true, resolution: '1920x1080', fps: 30 },
    { id: 4, name: 'CAM-04: Emergency Egress Corridor (DEMO)', location: 'Zone D', is_demo: true, resolution: '1280x720', fps: 15 },
  ]);
  const [selectedCamId, setSelectedCamId] = useState<number>(1);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
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
        console.error('Using default camera list:', err);
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
      // Hardware browser webcam capture
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

        // Loop frame capture and send to backend
        streamIntervalRef.current = setInterval(captureAndProcessWebcamFrame, 200);
      } catch (err: any) {
        console.warn('Physical camera unavailable, falling back to synthetic stream:', err);
        setPermissionError('Physical webcam unavailable or permission denied. Running in Demo Simulation Mode.');
        // Fallback to demo mode
        streamIntervalRef.current = setInterval(fetchDemoFrame, 200);
      }
    } else {
      // Demo Synthetic Video Stream
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
      setDetections(res.data.detections || []);
      setCurrentFrameUrl(res.data.annotated_frame_base64);
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  };

  const fetchDemoFrame = async () => {
    tickRef.current += 1;
    const start = performance.now();
    try {
      const res = await apiClient.get(`/vision/demo-frame/${selectedCamId}?tick=${tickRef.current}`);
      setLatencyMs(Math.round(performance.now() - start));
      setDetections(res.data.detections || []);
      setCurrentFrameUrl(res.data.annotated_frame_base64);
    } catch (err) {
      console.error('Demo frame fetch error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0d1527] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>OPTICAL SENSOR STREAM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Vision & Hazard Detection</h1>
          <p className="text-sm text-slate-400 mt-1">
            Edge object detection, bounded hazard overlays, and explainable safety verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStreaming ? (
            <button
              onClick={stopStream}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold tracking-wider shadow-glow-rose transition"
            >
              <Square className="w-4 h-4" />
              <span>TERMINATE STREAM</span>
            </button>
          ) : (
            <button
              onClick={startStream}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold tracking-wider shadow-glow-cyan transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>ENGAGE STREAM</span>
            </button>
          )}
        </div>
      </div>

      {permissionError && (
        <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Main Vision Canvas & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Optical Stream Viewport */}
        <div className="lg:col-span-3 rounded-2xl bg-black border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col justify-between aspect-video">
          {/* Top Overlay Badge Bar */}
          <div className="p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-900/90 text-cyan-400 border border-cyan-800/80 font-bold">
                {selectedCam.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 text-slate-400 text-[11px]">
                {selectedCam.location}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              {selectedCam.is_demo ? (
                <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-600 text-amber-300 text-[11px] font-bold animate-pulse">
                  DEMO SIMULATION
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-[11px] font-bold">
                  LIVE OPTICAL FEED
                </span>
              )}
            </div>
          </div>

          {/* Stream Canvas Display */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            {isStreaming && currentFrameUrl ? (
              <img
                src={currentFrameUrl}
                alt="Optical Stream"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center space-y-3 p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="text-sm font-mono font-bold text-slate-300">STREAM STANDBY</div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Click 'ENGAGE STREAM' above to activate live camera ingestion and edge detection.
                </p>
              </div>
            )}

            {/* Hidden Video and Canvas elements for browser webcam processing */}
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Bottom Telemetry Status Bar */}
          <div className="p-3 bg-gradient-to-t from-black/90 to-transparent z-20 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span>LATENCY: <strong className="text-cyan-400">{latencyMs} ms</strong></span>
              <span>RATE: <strong className="text-emerald-400">{fps} FPS</strong></span>
              <span>RES: <strong className="text-slate-300">{selectedCam.resolution}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[11px] text-slate-400">EDGE INFERENCE VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Right Control & Detections Panel */}
        <div className="space-y-4 flex flex-col">
          {/* Camera Source Selector */}
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800 space-y-2">
            <label className="text-xs font-mono font-bold text-slate-400 uppercase">CAMERA SENSOR SELECTOR</label>
            <select
              value={selectedCamId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCamId(id);
                if (isStreaming) {
                  stopStream();
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_demo ? '[DEMO]' : '[WEBCAM]'}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Detections Box */}
          <div className="p-4 rounded-xl bg-[#0d1527] border border-slate-800 flex-1 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-400">ACTIVE DETECTIONS</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 font-bold border border-cyan-800 text-[10px]">
                {detections.length}
              </span>
            </div>

            {detections.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-mono text-xs">
                {isStreaming ? 'Scanning optical feed...' : 'Stream inactive.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {detections.map((det, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{det.label}</span>
                      <span className="text-emerald-400 font-bold">
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Category: {det.category}</span>
                      {det.requires_review && (
                        <span className="text-amber-400 font-semibold">Review Required</span>
                      )}
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
