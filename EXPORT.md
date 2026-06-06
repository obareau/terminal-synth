# Terminal-Synth Video Export — MP4 with FFmpeg

Export high-quality MP4 video with professional audio from Terminal-Synth.

## Features

- **Video Codec**: H.264 (MP4)
- **Audio Codec**: AAC 320 kbps (high quality)
- **Resolution**: Canvas dimensions (default 1280×720)
- **Frame Rate**: 30 FPS configurable
- **Bitrate**: 5000k for H.264 video
- **Audio**: Captured from system audio input

## Requirements

- **FFmpeg**: Must be installed on your system
  - Windows: Installed via `ffmpeg-static` (npm)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

## Usage

### Quick Start

1. **Open Terminal-Synth**
   ```bash
   npm run dev
   ```

2. **Prepare Your Performance**
   - Select generators, effects, perturbators
   - Connect audio input (Audio button)
   - Adjust sliders and parameters

3. **Click Export Button** (🎬)
   - Top bar, next to recording button
   - Keyboard shortcut: `Ctrl+E` (when implemented)

4. **Choose Save Location**
   - Dialog appears asking where to save MP4
   - Default: `terminal-synth-export.mp4`

5. **Wait for Encoding**
   - Button shows "🔄 Encoding..." during FFmpeg processing
   - Time depends on video length and bitrate
   - Button shows "✅ Done" when complete

## Configuration

Edit export parameters in `src/renderer/renderer.ts`:

```typescript
// --- Export MP4 with FFmpeg ---
const result = await window.synth?.exportMP4({
  config: {
    fps: 30,              // Frames per second (24, 30, 60)
    bitrate: "5000k",     // H.264 video bitrate
    audioBitrate: "320k", // AAC audio bitrate (higher = better quality)
    outputPath: "",       // Leave empty for dialog
  },
  frameCount: 0,
  canvasWidth: canvas.width,
  canvasHeight: canvas.height,
});
```

### Bitrate Guidelines

**Video (H.264)**:
- `2000k`: Low quality, smaller file
- `5000k`: Medium quality (recommended)
- `10000k`: High quality, larger file
- `20000k`: Cinema quality

**Audio (AAC)**:
- `128k`: Acceptable quality
- `256k`: Good quality
- `320k`: High quality (recommended)
- `512k`: Lossless-like quality

## Performance Tips

### Optimize Export Quality

1. **Higher video bitrate**: Better image quality
   ```
   bitrate: "10000k"  // Higher = better, slower
   ```

2. **Higher audio bitrate**: Clearer audio
   ```
   audioBitrate: "320k"  // Best for music
   ```

3. **Increase FPS**: Smoother motion
   ```
   fps: 60  // More frames, larger file
   ```

### Speed Up Encoding

1. **Lower bitrate**: Faster, smaller file
2. **Reduce resolution**: Edit canvas.width/height
3. **Lower FPS**: 24 instead of 30

## Troubleshooting

### "FFmpeg not found"
- **Windows**: Ensure `ffmpeg-static` installed: `npm install`
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

### "Export cancelled"
- Clicked cancel in save dialog
- Try again and select valid path

### File is too large
- Reduce bitrate: `bitrate: "3000k"`
- Reduce FPS: `fps: 24`
- Lower resolution: Resize canvas

### Audio is missing
- Ensure audio input enabled (Audio button 🎙)
- Check system audio levels
- Verify audio source selected (sys/mic)

### Video quality is poor
- Increase bitrate: `bitrate: "8000k"`
- Use higher audio bitrate: `audioBitrate: "320k"`
- Check canvas resolution

## Advanced: Custom FFmpeg Options

Edit `src/main.ts` `video:encode` handler for FFmpeg flags:

```typescript
ipcMain.handle("video:encode", async (e, data: any) => {
  ffmpeg()
    .outputOptions([
      "-crf 23",           // Quality (0-51, lower=better)
      "-preset medium",    // Speed (ultrafast/superfast/veryfast/faster/fast/medium/slow/slower)
      "-movflags +faststart", // Enable web streaming
      "-acodec aac",
      "-b:a 320k",         // Audio bitrate
    ])
    // ... rest of implementation
});
```

## Recording vs Export

| Feature | MediaRecorder (WebM) | FFmpeg (MP4) |
|---------|-------------------|--------------|
| Format | WebM/VP8 | MP4/H.264 |
| Quality | Medium | High |
| Audio Quality | Variable | High (320k AAC) |
| File Size | Medium | Depends on bitrate |
| Speed | Real-time | Post-processing |
| Compatibility | Limited | Excellent (all devices) |

**Recording (WebM)**: Real-time capture, instant save
**Export (MP4)**: Post-recording encoding, professional quality

## System Requirements

- **CPU**: Multi-core recommended (FFmpeg uses all cores)
- **Disk Space**: 100+ MB free for temporary encoding
- **RAM**: 1+ GB available

## File Naming

Default output format: `terminal-synth-export.mp4`

Custom naming: Supported via save dialog
- `my-synth-performance.mp4`
- `session-2026-06-06.mp4`
- Any `.mp4` filename

## Keyboard Shortcuts

- **Export**: `Ctrl+E` (when implemented)
- **Recording**: `Ctrl+R` (existing)
- **Fullscreen**: `F`

---

**Version**: 0.9.0+  
**Status**: Beta (frame capture not yet implemented—currently placeholder video)  
**Next**: Full frame buffer + audio capture integration
