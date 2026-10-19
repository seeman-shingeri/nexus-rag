import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock MediaStream and MediaStreamTrack
class MockMediaStreamTrack {
  constructor(kind = 'video') {
    this.kind = kind;
    this.readyState = 'live';
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
    this.readyState = 'ended';
  }
  getSettings() {
    return { width: 1280, height: 720, frameRate: 30 };
  }
}

class MockMediaStream {
  constructor(tracks = [new MockMediaStreamTrack()]) {
    this._tracks = tracks;
  }
  getTracks() {
    return this._tracks;
  }
  getVideoTracks() {
    return this._tracks.filter(t => t.kind === 'video');
  }
}

// Mock Video Element
class MockVideoElement {
  constructor() {
    this.srcObject = null;
    this.autoplay = false;
    this.muted = false;
    this.playsInline = false;
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.readyState = 0;
    this.paused = true;
    this.listeners = {};
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(h => h(event));
  }
  async play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

// Emulate the LiveVision camera engine logic for isolated verification
class CameraEngine {
  constructor(options = {}) {
    this.isSecureContext = options.isSecureContext ?? true;
    this.mediaDevices = options.mediaDevices ?? null;
    this.videoElement = options.videoElement ?? new MockVideoElement();
    this.isStreaming = false;
    this.isInitializing = false;
    this.webcamActive = false;
    this.activeStream = null;
    this.realResolution = null;
    this.cameraError = null;
    this.inferenceStatus = 'idle';
    this.initSeq = 0;
    this.isMounted = true;
    this.intervalId = null;
  }

  async startStream() {
    if (this.isStreaming || this.isInitializing) return;
    this.cameraError = null;
    this.isInitializing = true;
    const currentSeq = ++this.initSeq;

    if (!this.isSecureContext) {
      this.isInitializing = false;
      this.cameraError = 'Camera access requires a secure connection (HTTPS) or localhost. MediaDevices is disabled in insecure contexts.';
      return;
    }

    if (!this.mediaDevices || !this.mediaDevices.getUserMedia) {
      this.isInitializing = false;
      this.cameraError = 'Browser does not support camera capture via navigator.mediaDevices.getUserMedia.';
      return;
    }

    try {
      let mediaStream;
      try {
        mediaStream = await this.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (err.name === 'OverconstrainedError') {
          mediaStream = await this.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw err;
        }
      }

      if (currentSeq !== this.initSeq || !this.isMounted) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      this.activeStream = mediaStream;
      const video = this.videoElement;
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      // Simulate metadata loading
      await new Promise((resolve, reject) => {
        if (video.readyState >= 1 && video.videoWidth > 0) {
          resolve();
          return;
        }
        const onMetadata = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Video element failed loading camera stream metadata.'));
        };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onMetadata);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('loadedmetadata', onMetadata);
        video.addEventListener('error', onError);

        // Auto-trigger for simulation
        setTimeout(() => {
          video.videoWidth = 1280;
          video.videoHeight = 720;
          video.readyState = 2;
          video.dispatchEvent({ type: 'loadedmetadata' });
        }, 10);
      });

      if (currentSeq !== this.initSeq || !this.isMounted) {
        mediaStream.getTracks().forEach(t => t.stop());
        this.activeStream = null;
        return;
      }

      await video.play();

      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings?.();
      this.realResolution = `${settings?.width || video.videoWidth}x${settings?.height || video.videoHeight}`;

      this.webcamActive = true;
      this.isStreaming = true;
      this.isInitializing = false;
      this.inferenceStatus = 'connecting';
    } catch (err) {
      if (currentSeq !== this.initSeq || !this.isMounted) return;

      this.isInitializing = false;
      this.isStreaming = false;
      this.webcamActive = false;

      if (this.activeStream) {
        this.activeStream.getTracks().forEach(t => t.stop());
        this.activeStream = null;
      }

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraError = 'Camera permission was denied. Please allow camera access in your browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraError = 'No camera hardware found on this device. Connect a webcam or switch to a synthetic demo stream.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.cameraError = 'Camera is currently in use by another application or locked by the operating system.';
      } else if (err.name === 'OverconstrainedError') {
        this.cameraError = 'Requested camera resolution constraints cannot be satisfied by hardware.';
      } else if (err.name === 'SecurityError') {
        this.cameraError = 'Camera access blocked by browser security or iframe feature policy.';
      } else {
        this.cameraError = err.message || `Camera initialization failed (${err.name || 'Unknown Error'})`;
      }
    }
  }

  stopStream() {
    this.initSeq += 1;
    this.isInitializing = false;
    this.isStreaming = false;
    this.webcamActive = false;

    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop());
      this.activeStream = null;
    }

    if (this.videoElement) {
      if (this.videoElement.srcObject) {
        const ms = this.videoElement.srcObject;
        ms.getTracks().forEach(t => t.stop());
        this.videoElement.srcObject = null;
      }
      this.videoElement.pause();
    }

    this.realResolution = null;
    this.inferenceStatus = 'idle';
  }

  unmount() {
    this.isMounted = false;
    this.stopStream();
  }
}

describe('Live Vision Camera Lifecycle & Error Handling Tests', () => {
  it('1. Successfully starts camera, attaches MediaStream, awaits play(), and sets resolution', async () => {
    const mockTrack = new MockMediaStreamTrack();
    const mockStream = new MockMediaStream([mockTrack]);
    const mockMediaDevices = {
      getUserMedia: async () => mockStream,
    };

    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: mockMediaDevices,
    });

    assert.equal(engine.isStreaming, false);
    assert.equal(engine.isInitializing, false);

    await engine.startStream();

    assert.equal(engine.isStreaming, true, 'Stream should be marked streaming');
    assert.equal(engine.webcamActive, true, 'Webcam should be marked active');
    assert.equal(engine.isInitializing, false, 'Initialization state should be cleared');
    assert.equal(engine.cameraError, null, 'No error should be recorded');
    assert.equal(engine.realResolution, '1280x720', 'Resolution should be extracted from track/video');
    assert.equal(engine.videoElement.srcObject, mockStream, 'Stream should be bound to video.srcObject');
    assert.equal(engine.videoElement.muted, true, 'Video must be muted');
    assert.equal(engine.videoElement.playsInline, true, 'Video must be playsInline');
    assert.equal(engine.videoElement.autoplay, true, 'Video must be autoplay');
    assert.equal(engine.videoElement.paused, false, 'Video play() must have been called');
  });

  it('2. Stops all tracks and cleans up video element on stopStream()', async () => {
    const mockTrack = new MockMediaStreamTrack();
    const mockStream = new MockMediaStream([mockTrack]);
    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: { getUserMedia: async () => mockStream },
    });

    await engine.startStream();
    assert.equal(mockTrack.stopped, false);

    engine.stopStream();

    assert.equal(engine.isStreaming, false);
    assert.equal(engine.webcamActive, false);
    assert.equal(mockTrack.stopped, true, 'Track must be stopped on stopStream');
    assert.equal(engine.activeStream, null, 'Active stream ref must be cleared');
    assert.equal(engine.videoElement.srcObject, null, 'video.srcObject must be null');
    assert.equal(engine.videoElement.paused, true, 'video must be paused');
    assert.equal(engine.realResolution, null);
  });

  it('3. Handles NotAllowedError (permission denied) with clear friendly message', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';

    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: {
        getUserMedia: async () => { throw error; }
      },
    });

    await engine.startStream();

    assert.equal(engine.isStreaming, false);
    assert.equal(engine.webcamActive, false);
    assert.match(engine.cameraError, /Camera permission was denied/);
  });

  it('4. Handles NotFoundError (missing hardware) with clear friendly message', async () => {
    const error = new Error('Device not found');
    error.name = 'NotFoundError';

    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: {
        getUserMedia: async () => { throw error; }
      },
    });

    await engine.startStream();

    assert.equal(engine.isStreaming, false);
    assert.match(engine.cameraError, /No camera hardware found/);
  });

  it('5. Handles NotReadableError (device busy/in use) with clear friendly message', async () => {
    const error = new Error('Hardware busy');
    error.name = 'NotReadableError';

    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: {
        getUserMedia: async () => { throw error; }
      },
    });

    await engine.startStream();

    assert.equal(engine.isStreaming, false);
    assert.match(engine.cameraError, /Camera is currently in use by another application/);
  });

  it('6. Blocks camera access on insecure contexts (non-HTTPS / non-localhost)', async () => {
    const engine = new CameraEngine({
      isSecureContext: false,
      mediaDevices: { getUserMedia: async () => new MockMediaStream() },
    });

    await engine.startStream();

    assert.equal(engine.isStreaming, false);
    assert.match(engine.cameraError, /secure connection \(HTTPS\)/);
  });

  it('7. Handles component unmounting during active stream and stops tracks', async () => {
    const mockTrack = new MockMediaStreamTrack();
    const mockStream = new MockMediaStream([mockTrack]);
    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: { getUserMedia: async () => mockStream },
    });

    await engine.startStream();
    assert.equal(mockTrack.stopped, false);

    engine.unmount();

    assert.equal(engine.isMounted, false);
    assert.equal(mockTrack.stopped, true, 'Tracks must be stopped when unmounting');
    assert.equal(engine.videoElement.srcObject, null);
  });

  it('8. Concurrency guard prevents duplicate initialization and cleans up if aborted', async () => {
    const mockTrack = new MockMediaStreamTrack();
    const mockStream = new MockMediaStream([mockTrack]);
    let resolveStream;
    const pendingPromise = new Promise((resolve) => {
      resolveStream = () => resolve(mockStream);
    });

    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: { getUserMedia: () => pendingPromise },
    });

    const p1 = engine.startStream();
    assert.equal(engine.isInitializing, true);

    // Call stopStream before getUserMedia resolves (e.g. user quickly clicks Stop)
    engine.stopStream();
    assert.equal(engine.isInitializing, false);

    // Now resolve the mediaStream promise
    resolveStream();
    await p1;

    // The stream must have been discarded and stopped, NOT attached
    assert.equal(engine.isStreaming, false);
    assert.equal(engine.webcamActive, false);
    assert.equal(mockTrack.stopped, true, 'Track must be stopped because operation was aborted');
  });

  it('9. Allows clean restart without leaking previous stream tracks', async () => {
    const track1 = new MockMediaStreamTrack();
    const stream1 = new MockMediaStream([track1]);
    const track2 = new MockMediaStreamTrack();
    const stream2 = new MockMediaStream([track2]);

    let callCount = 0;
    const engine = new CameraEngine({
      isSecureContext: true,
      mediaDevices: {
        getUserMedia: async () => {
          callCount++;
          return callCount === 1 ? stream1 : stream2;
        }
      },
    });

    // Start 1
    await engine.startStream();
    assert.equal(engine.isStreaming, true);
    assert.equal(track1.stopped, false);

    // Stop 1
    engine.stopStream();
    assert.equal(engine.isStreaming, false);
    assert.equal(track1.stopped, true, 'First track must be stopped');

    // Start 2
    await engine.startStream();
    assert.equal(engine.isStreaming, true);
    assert.equal(track2.stopped, false, 'Second track should be live');
    assert.equal(engine.videoElement.srcObject, stream2);

    // Stop 2
    engine.stopStream();
    assert.equal(track2.stopped, true, 'Second track must be stopped');
  });
});
