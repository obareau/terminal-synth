/**
 * Video Export — Capture canvas + audio, encode to MP4 with FFmpeg
 * Usage: call startRecording() to begin, stopRecording() to finalize
 */

import { ipcRenderer } from 'electron';

export interface VideoExportConfig {
  fps: number; // 24, 30, 60
  bitrate: string; // '5000k' for H.264 video
  audioBitrate: string; // '320k' for AAC audio
  outputPath: string;
  durationSeconds?: number; // Optional: auto-stop after duration
}

export interface RecordingState {
  isRecording: boolean;
  frameCount: number;
  startTime: number;
  audioData: Float32Array[];
  sampleRate: number;
}

class VideoExporter {
  private state: RecordingState = {
    isRecording: false,
    frameCount: 0,
    startTime: 0,
    audioData: [],
    sampleRate: 48000,
  };

  private canvas: HTMLCanvasElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private frameBuffer: ImageData[] = [];
  private animationFrameId: number = 0;
  private config: VideoExportConfig | null = null;

  /**
   * Initialize with canvas and audio context
   */
  init(canvas: HTMLCanvasElement, audioContext: AudioContext) {
    this.canvas = canvas;
    this.audioContext = audioContext;
    this.state.sampleRate = audioContext.sampleRate;

    // Create analyser for audio capture
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    // Create script processor to capture audio
    this.scriptProcessor = audioContext.createScriptProcessor(4096, 2, 2);
    this.scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      this.state.audioData.push(new Float32Array(inputData));
    };

    // Connect nodes
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(audioContext.destination);
  }

  /**
   * Start recording frames and audio
   */
  startRecording(config: VideoExportConfig) {
    if (!this.canvas || !this.audioContext) {
      console.error('VideoExporter not initialized');
      return;
    }

    this.config = config;
    this.state.isRecording = true;
    this.state.frameCount = 0;
    this.state.startTime = Date.now();
    this.state.audioData = [];
    this.frameBuffer = [];

    console.log(`📹 Recording started: ${config.fps}fps, bitrate ${config.bitrate}`);

    // Start frame capture loop
    this.captureFrames();
  }

  /**
   * Capture frames at specified FPS
   */
  private captureFrames() {
    if (!this.state.isRecording || !this.canvas || !this.config) {
      return;
    }

    const frameInterval = 1000 / this.config.fps;
    const now = Date.now();
    const elapsed = now - this.state.startTime;

    // Check if we should stop
    if (this.config.durationSeconds && elapsed > this.config.durationSeconds * 1000) {
      this.stopRecording();
      return;
    }

    // Capture frame every interval
    if (elapsed >= this.state.frameCount * frameInterval) {
      try {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          this.frameBuffer.push(imageData);
          this.state.frameCount++;
        }
      } catch (err) {
        console.error('Frame capture error:', err);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.captureFrames());
  }

  /**
   * Stop recording and trigger encoding
   */
  async stopRecording() {
    if (!this.state.isRecording) return;

    this.state.isRecording = false;
    cancelAnimationFrame(this.animationFrameId);

    console.log(`⏹️ Recording stopped: ${this.state.frameCount} frames, ${this.state.audioData.length} audio chunks`);

    if (!this.config) return;

    // Send to main process for FFmpeg encoding
    try {
      const result = await ipcRenderer.invoke('video:encode', {
        config: this.config,
        frameCount: this.state.frameCount,
        canvasWidth: this.canvas?.width,
        canvasHeight: this.canvas?.height,
        fps: this.config.fps,
        audioSampleRate: this.state.sampleRate,
        audioDurationMs: (this.state.audioData.length * 4096) / this.state.sampleRate,
      });

      console.log('✅ Video export complete:', result);
      return result;
    } catch (err) {
      console.error('❌ Video export failed:', err);
      throw err;
    }
  }

  /**
   * Get recording status
   */
  getStatus() {
    return {
      isRecording: this.state.isRecording,
      frameCount: this.state.frameCount,
      durationMs: Date.now() - this.state.startTime,
      audioChunks: this.state.audioData.length,
    };
  }
}

// Export singleton
export const videoExporter = new VideoExporter();
