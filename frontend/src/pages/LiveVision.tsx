import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Video, 
  Play, 
  Square, 
  AlertTriangle, 
  AlertCircle,
  RefreshCw,
  Camera,
  Layers,
  Activity
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
  bounding_box: number[]; // [x, y, w, h] normalized 0..1
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

type InferenceState = 'idle' | 'connecting' | 'active' | 'offline' | 'error';

export const LiveVision: React.FC = () => {
  const [cameras, setCameras] = useState<CameraSource[]>([
    { id: 1, name: 'CAM-01: Main Fabrication Floor', location: 'Zone 1', is_demo: false, resolution: '1280x720', fps: 30 },
    { id: 2, name: 'CAM-02: Chemical Storage Vault', location: 'Zone 2 (Restricted)', is_demo: true, resolution: '1280x720', fps: 15 },
    { id: 3, name: 'CAM-03: Loading Bay Beta', location: 'Zone 3', is_demo: true, resolution: '1920x1080', fps: 30 },
    { id: 4, name: 'CAM-04: Server Infrastructure', location: 'Zone 4 (Restricted)', is_demo: true, resolution: '1280x720', fps: 15 },
  ]);
  const [selectedCamId, setSelectedCamId] = useState<number>(1);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [history, setHistory] = useState<ObservationHistoryItem[]>([]);
  
  // Real measured telemetry (no fabricated numbers)
  const [measuredLatencyMs, setMeasuredLatencyMs] = useState<number | null>(null);
  const [realFps, setRealFps] = useState<number | null>(null);
  const [realResolution, setRealResolution] = useState<string | null>(null);
  const [inferenceStatus, setInferenceStatus] = useState<InferenceState>('idle');
  
  // Specific real error states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [inferenceNotice, setInferenceNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const initSeqRef = useRef<number>(0);
  const streamIntervalRef = useRef<any>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const tickRef = useRef<number>(0);
  const fpsTrackerRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: 0 });

  const selectedCam = cameras.find((c) => c.id === selectedCamId) || cameras[0];

  // Helper for bounding box colors
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'liquid_spill':
      case 'blocked_exit':
        return '#f59e0b'; // Amber
      case 'fire_smoke_suspicion':
      case 'unauthorized':
        return '#ef4444'; // Red
      case 'missing_ppe_helmet':
        return '#ec4899'; // Magenta
      case 'person':
      default:
        return '#3b82f6'; // Restrained Blue
    }
  };

  const addObservationHistory = useCallback((det: DetectionItem) => {
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
  }, [selectedCam]);

  const updateRealFps = () => {
    const now = performance.now();
    const tracker = fpsTrackerRef.current;
    if (tracker.lastTime === 0) {
      tracker.lastTime = now;
      tracker.frames = 1;
      return;
    }
    tracker.frames += 1;
    const elapsed = now - tracker.lastTime;
    if (elapsed >= 1000) {
      const calculatedFps = Math.round((tracker.frames * 1000) / elapsed);
      setRealFps(calculatedFps);
      tracker.frames = 0;
      tracker.lastTime = now;
    }
  };

  // Stop camera tracks and release resources
  const stopStream = useCallback(() => {
    initSeqRef.current += 1; // Invalidate any pending init promises
    setIsInitializing(false);
    setIsStreaming(false);
    setWebcamActive(false);

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    isProcessingFrameRef.current = false;

    // Stop all media tracks on the active stream
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      activeStreamRef.current = null;
    }

    // Clean up video element
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {
            console.warn('Error stopping video srcObject track:', e);
          }
        });
        videoRef.current.srcObject = null;
      }
      try {
        videoRef.current.pause();
      } catch (e) {
        // ignore
      }
    }

    setDetections([]);
    setCurrentFrameUrl(null);
    setMeasuredLatencyMs(null);
    setRealFps(null);
    setRealResolution(null);
    setInferenceStatus('idle');
    setInferenceNotice(null);
    fpsTrackerRef.current = { frames: 0, lastTime: 0 };
  }, []);

  // Frame processing for local webcam
  const captureAndProcessWebcamFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is actually playing and has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
      return;
    }

    // Prevent overlapping inference requests if previous one is still in flight
    if (isProcessingFrameRef.current) return;
    isProcessingFrameRef.current = true;

    try {
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isProcessingFrameRef.current = false;
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.65);

      const start = performance.now();
      try {
        const res = await apiClient.post('/vision/process-frame', {
          image_base64: b64,
          camera_id: selectedCamId,
          is_demo: false,
        });

        const latency = Math.round(performance.now() - start);
        setMeasuredLatencyMs(latency);
        setInferenceStatus('active');
        setInferenceNotice(null);
        updateRealFps();

        const detList: DetectionItem[] = res.data.detections || [];
        setDetections(detList);

        if (detList.length > 0) {
          addObservationHistory(detList[0]);
        }
      } catch (apiErr: any) {
        // Backend perception engine unreachable or error (e.g., Vercel without local backend)
        setInferenceStatus('offline');
        setMeasuredLatencyMs(null);
        setDetections([]);
        const errDetail = apiErr.response?.data?.detail || apiErr.message || 'Connection refused';
        setInferenceNotice(`Perception service offline (${errDetail}). Optical webcam feed is running in raw capture mode.`);
      }
    } catch (captureErr) {
      console.warn('Canvas frame extraction dropped:', captureErr);
    } finally {
      isProcessingFrameRef.current = false;
    }
  }, [selectedCamId, addObservationHistory]);

  // Synthetic demo frame polling
  const fetchDemoFrame = useCallback(async () => {
    tickRef.current += 1;
    const start = performance.now();
    try {
      const res = await apiClient.get(`/vision/demo-frame/${selectedCamId}?tick=${tickRef.current}`);
      const latency = Math.round(performance.now() - start);
      setMeasuredLatencyMs(latency);
      setInferenceStatus('active');
      setInferenceNotice(null);
      updateRealFps();

      const detList: DetectionItem[] = res.data.detections || [];
      setDetections(detList);
      setCurrentFrameUrl(res.data.annotated_frame_base64);

      if (detList.length > 0 && tickRef.current % 5 === 0) {
        addObservationHistory(detList[0]);
      }
    } catch (err: any) {
      // If backend is offline, generate client-side synthetic demonstration frame on canvas
      setInferenceStatus('offline');
      setMeasuredLatencyMs(null);
      setInferenceNotice('Inference service offline. Rendering client-side demonstration canvas.');
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Dark industrial slate background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Synthetic Zone Watermark
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px monospace';
          ctx.fillText(`SYNTHETIC DEMO SIMULATION · ${selectedCam.name}`, 20, 30);
          ctx.fillText(`ZONE: ${selectedCam.location} · TICK: ${tickRef.current}`, 20, 50);
          ctx.fillText(new Date().toISOString(), 20, canvas.height - 20);

          // Simulated machine box
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(160, 100, 320, 180);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(160, 100, 320, 180);
          ctx.fillStyle = '#60a5fa';
          ctx.fillText('EQUIPMENT UNIT #01 (STANDBY)', 180, 130);

          setCurrentFrameUrl(canvas.toDataURL('image/jpeg', 0.8));
        }
      }
    }
  }, [selectedCamId, selectedCam, addObservationHistory]);

  // Primary Camera Start Function
  const startStream = async () => {
    if (isStreaming || isInitializing) return;

    setCameraError(null);
    setInferenceNotice(null);
    setIsInitializing(true);
    const currentSeq = ++initSeqRef.current;

    if (!selectedCam.is_demo) {
      // --- Physical Hardware Webcam Flow ---
      // 1. Verify Browser Support & Secure Context
      if (typeof window === 'undefined') {
        setIsInitializing(false);
        return;
      }

      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setIsInitializing(false);
        setCameraError('Camera access requires a secure connection (HTTPS) or localhost. MediaDevices is disabled in insecure contexts.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsInitializing(false);
        setCameraError('Browser does not support camera capture via navigator.mediaDevices.getUserMedia.');
        return;
      }

      let mediaStream: MediaStream | null = null;
      try {
        // 2. Request userMedia with standard constraints, falling back to basic video
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
            },
            audio: false,
          });
        } catch (constraintErr: any) {
          if (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'ConstraintNotSatisfiedError') {
            // Fallback to minimal constraints
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw constraintErr;
          }
        }

        // 3. Check for cancellation or unmount during async prompt
        if (currentSeq !== initSeqRef.current || !isMountedRef.current) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStreamRef.current = mediaStream;

        // 4. Attach MediaStream to the video element
        const video = videoRef.current;
        if (!video) {
          mediaStream.getTracks().forEach((t) => t.stop());
          activeStreamRef.current = null;
          throw new Error('Video element reference is unavailable in DOM.');
        }

        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        // 5. Wait for valid video metadata to ensure resolution is available
        await new Promise<void>((resolve, reject) => {
          if (video.readyState >= 1 && video.videoWidth > 0) {
            resolve();
            return;
          }

          const onMetadata = () => {
            cleanupListeners();
            resolve();
          };

          const onError = () => {
            cleanupListeners();
            reject(new Error('Video element failed loading camera stream metadata.'));
          };

          const timeoutId = setTimeout(() => {
            cleanupListeners();
            if (video.videoWidth > 0) {
              resolve();
            } else {
              reject(new Error('Timed out waiting for camera stream metadata (6000ms).'));
            }
          }, 6000);

          const cleanupListeners = () => {
            video.removeEventListener('loadedmetadata', onMetadata);
            video.removeEventListener('error', onError);
            clearTimeout(timeoutId);
          };

          video.addEventListener('loadedmetadata', onMetadata);
          video.addEventListener('error', onError);
        });

        // 6. Check again if aborted while waiting for metadata
        if (currentSeq !== initSeqRef.current || !isMountedRef.current) {
          mediaStream.getTracks().forEach((t) => t.stop());
          activeStreamRef.current = null;
          return;
        }

        // 7. Await video.play() and handle rejected playback promises
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError') {
            throw new Error(`Video element playback failed: ${playErr.message || playErr.name}`);
          }
        }

        // 8. Capture actual resolution from hardware video track
        const videoTrack = mediaStream.getVideoTracks()[0];
        const trackSettings = videoTrack?.getSettings?.();
        const actualWidth = trackSettings?.width || video.videoWidth;
        const actualHeight = trackSettings?.height || video.videoHeight;
        setRealResolution(`${actualWidth}x${actualHeight}`);

        // 9. Mark states active
        setWebcamActive(true);
        setIsStreaming(true);
        setIsInitializing(false);
        setInferenceStatus('connecting');

        // 10. Start interval for frame processing
        streamIntervalRef.current = setInterval(captureAndProcessWebcamFrame, 250);
      } catch (err: any) {
        if (currentSeq !== initSeqRef.current || !isMountedRef.current) return;

        setIsInitializing(false);
        setIsStreaming(false);
        setWebcamActive(false);

        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((t) => t.stop());
          activeStreamRef.current = null;
        }

        let friendlyError = '';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyError = 'Camera permission was denied. Please allow camera access in your browser site settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyError = 'No camera hardware found on this device. Connect a webcam or switch to a synthetic demo stream.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          friendlyError = 'Camera is currently in use by another application or locked by the operating system.';
        } else if (err.name === 'OverconstrainedError') {
          friendlyError = 'Requested camera resolution constraints cannot be satisfied by hardware.';
        } else if (err.name === 'SecurityError') {
          friendlyError = 'Camera access blocked by browser security or iframe feature policy.';
        } else {
          friendlyError = err.message || `Camera initialization failed (${err.name || 'Unknown Error'})`;
        }

        setCameraError(friendlyError);
      }
    } else {
      // --- Synthetic Demo Stream Flow ---
      setIsInitializing(false);
      setIsStreaming(true);
      setWebcamActive(false);
      setRealResolution(selectedCam.resolution);
      setInferenceStatus('connecting');
      streamIntervalRef.current = setInterval(fetchDemoFrame, 250);
    }
  };

  // Component lifecycle: load registered cameras and clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;

    const loadCameras = async () => {
      try {
        const res = await apiClient.get('/vision/cameras');
        if (res.data && res.data.length > 0) {
          setCameras(res.data);
        }
      } catch (err) {
        // Keep standard industrial cameras
      }
    };
    loadCameras();

    return () => {
      isMountedRef.current = false;
      stopStream();
    };
  }, [stopStream]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Live Vision & Hazard Detection</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time optical feed ingestion, spatial bounding box overlays, and deterministic rule evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-500 hidden sm:inline">SENSOR:</label>
            <select
              value={selectedCamId}
              disabled={isInitializing}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCamId(id);
                stopStream();
                setCameraError(null);
                setInferenceNotice(null);
              }}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_demo ? '(Demo Stream)' : '(Physical Webcam)'}
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
              disabled={isInitializing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium tracking-wide transition shadow-sm"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Initializing Camera...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Stream</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Camera Hardware or Permission Error Alert */}
      {cameraError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Camera Initialization Failed</span>
              <span className="text-red-800 leading-relaxed">{cameraError}</span>
            </div>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="text-red-600 hover:text-red-800 font-mono text-xs px-2 py-0.5 rounded border border-red-200 bg-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inference Status Notice (e.g. backend offline during live webcam) */}
      {inferenceNotice && isStreaming && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Perception Service Notice: </span>
            <span>{inferenceNotice}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Video Viewport (8 cols) + Detections & History (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Primary Video Area */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative shadow-sm aspect-video flex flex-col justify-between">
            {/* Top Viewport Header */}
            <div className="p-3 flex items-center justify-between z-10 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-white">{selectedCam.name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">{selectedCam.location}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                {selectedCam.is_demo ? (
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-medium">
                    SYNTHETIC DEMO STREAM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-medium">
                    HARDWARE WEBCAM
                  </span>
                )}
              </div>
            </div>

            {/* Video Viewport: Displays Live Video, Synthetic Feed, Loading, or Standby */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
              {/* 1. INITIALIZING STATE */}
              {isInitializing && (
                <div className="text-center p-8 space-y-3 z-20">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <div className="text-xs font-mono font-medium text-slate-200 uppercase tracking-wider">
                    Negotiating Camera Hardware...
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs font-mono mx-auto">
                    Requesting media device stream and waiting for valid video stream metadata.
                  </p>
                </div>
              )}

              {/* 2. STANDBY STATE (INACTIVE) */}
              {!isStreaming && !isInitializing && (
                <div className="text-center p-8 space-y-3 z-20">
                  <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                    Camera Stream Inactive
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs font-mono mx-auto">
                    {selectedCam.is_demo 
                      ? 'Click "Start Stream" to engage synthetic safety hazard simulation.' 
                      : 'Click "Start Stream" to initialize your local camera and engage hazard perception.'}
                  </p>
                  <button
                    onClick={startStream}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium font-mono transition shadow-sm mt-2"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Engage Sensor</span>
                  </button>
                </div>
              )}

              {/* 3. PHYSICAL WEBCAM ELEMENT (DIRECTLY VISIBLE & PLAYING) */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-contain ${webcamActive && isStreaming ? 'block' : 'hidden'}`}
              />

              {/* 4. SYNTHETIC DEMO IMAGE STREAM */}
              {selectedCam.is_demo && isStreaming && currentFrameUrl && (
                <img
                  src={currentFrameUrl}
                  alt="Synthetic Vision Feed"
                  className="w-full h-full object-contain"
                />
              )}

              {/* 5. DETECTION OVERLAYS LAYER (OVERLAID DIRECTLY ON TOP OF LIVE VIDEO) */}
              {isStreaming && detections.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                  {detections.map((det, idx) => {
                    const color = getCategoryColor(det.category);
                    const [bx, by, bw, bh] = det.bounding_box;
                    return (
                      <div
                        key={idx}
                        className="absolute border-2 transition-all duration-75"
                        style={{
                          left: `${Math.max(0, Math.min(100, bx * 100))}%`,
                          top: `${Math.max(0, Math.min(100, by * 100))}%`,
                          width: `${Math.max(0, Math.min(100, bw * 100))}%`,
                          height: `${Math.max(0, Math.min(100, bh * 100))}%`,
                          borderColor: color,
                        }}
                      >
                        <div
                          className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white whitespace-nowrap rounded-t shadow"
                          style={{ backgroundColor: color }}
                        >
                          {det.label} ({(det.confidence * 100).toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Offscreen Canvas for Frame Capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom Viewport Telemetry Bar (Real Measured Metrics Only) */}
            <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  Latency: <strong className="text-slate-200">
                    {measuredLatencyMs !== null ? `${measuredLatencyMs} ms` : '—'}
                  </strong>
                </span>
                <span>
                  Processing Rate: <strong className="text-slate-200">
                    {realFps !== null ? `${realFps} FPS` : (isStreaming ? 'Calculating...' : '—')}
                  </strong>
                </span>
                <span>
                  Resolution: <strong className="text-slate-200">
                    {realResolution || (isStreaming ? selectedCam.resolution : '—')}
                  </strong>
                </span>
              </div>

              {/* Genuine Status Pill */}
              <div className="flex items-center gap-2">
                {isInitializing && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 uppercase">Initializing Hardware</span>
                  </>
                )}
                {!isStreaming && !isInitializing && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-slate-400 uppercase">Standby</span>
                  </>
                )}
                {isStreaming && inferenceStatus === 'active' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-300 uppercase">Inference Active</span>
                  </>
                )}
                {isStreaming && inferenceStatus === 'connecting' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-300 uppercase">Connecting Inference...</span>
                  </>
                )}
                {isStreaming && inferenceStatus === 'offline' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-amber-300 uppercase">Raw Stream (Inference Offline)</span>
                  </>
                )}
                {isStreaming && inferenceStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-400 uppercase">Inference Fault</span>
                  </>
                )}
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
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Active Detections</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {detections.length} Detected
              </span>
            </div>

            {detections.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-mono">
                {isStreaming 
                  ? (inferenceStatus === 'active' ? 'Scanning optical frame (0 hazards)...' : 'Awaiting inference response...') 
                  : 'Stream inactive.'}
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
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 uppercase font-mono">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>Recent Optical Observations</span>
              </div>
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
