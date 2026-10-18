import React from 'react';
import { Camera, Radio, Video, Play, Square, Settings as SettingsIcon } from 'lucide-react';

export const LiveVision: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>REAL-TIME VISION STREAM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Optical Surveillance & Detection</h1>
          <p className="text-sm text-slate-400 mt-1">
            Webcam frame acquisition and synthetic demo stream with bounding box object detection.
          </p>
        </div>
      </div>

      <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 flex flex-col items-center justify-center p-8 relative overflow-hidden group shadow-2xl">
        <div className="text-center space-y-3 z-10">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center mx-auto text-cyan-400">
            <Camera className="w-8 h-8" />
          </div>
          <div className="font-mono text-sm font-bold text-slate-200">OPTICAL PROCESSING PIPELINE READY</div>
          <p className="text-xs text-slate-400 max-w-md">
            Milestone 5 will attach real-time browser webcam capture (`getUserMedia`), OpenCV WebSocket streaming, and visual detection overlays.
          </p>
        </div>
      </div>
    </div>
  );
};
