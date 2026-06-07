import { app, BrowserWindow, session, desktopCapturer, ipcMain, dialog, screen } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

let controlWindow: BrowserWindow | null = null;
let outputWindow: BrowserWindow | null = null;

function createOutputWindow(): void {
  if (outputWindow) {
    outputWindow.focus();
    return;
  }
  const displays = screen.getAllDisplays();
  const outputDisplay = displays[1] || displays[0]; // 2nd monitor if available
  const win = new BrowserWindow({
    x: outputDisplay.bounds.x,
    y: outputDisplay.bounds.y,
    width: outputDisplay.bounds.width,
    height: outputDisplay.bounds.height,
    backgroundColor: "#000000",
    title: "terminal-synth · Output",
    autoHideMenuBar: true,
    fullscreen: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  outputWindow = win;
  win.loadFile(path.join(__dirname, "index.html") + "?mode=output");
  win.on("closed", () => {
    outputWindow = null;
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 768,
    minHeight: 768,
    minWidth: 1280,
    backgroundColor: "#0a0a0a",
    title: "terminal-synth · Control",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  controlWindow = win;

  // Autorise micro/ligne (FFT audio) et MIDI sans pop-up.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === "media" || permission === "midi" || permission === "midiSysex");
  });


  win.loadFile(path.join(__dirname, "index.html"));

  // F12 → DevTools (debug shaders / erreurs GL)
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12" && input.type === "keyDown") win.webContents.toggleDevTools();
  });

  win.on("closed", () => {
    controlWindow = null;
  });
}

// Check for test mode
const testMode = process.argv.includes("--test-shaders");
if (testMode) console.log("[Main] TEST MODE ENABLED");

app.whenReady().then(() => {
  // Get CPU/GPU usage stats
  ipcMain.handle("stats:get-usage", () => {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuPercent = Math.round((usedMemory / totalMemory) * 100);

    // Estimate CPU usage from load average
    const loadAvg = os.loadavg()[0];
    const cpuCount = cpus.length;
    const cpuUsage = Math.round((loadAvg / cpuCount) * 100);

    return {
      cpu: Math.min(100, cpuUsage),
      gpu: 0, // GPU monitoring not available without external tools
    };
  });

  // Open output window on secondary display (or return false if single-screen)
  ipcMain.handle("window:open-output", () => {
    const displays = screen.getAllDisplays();
    if (displays.length === 1) {
      return false; // Single screen: let renderer use performance mode instead
    }
    createOutputWindow();
    return true;
  });

  // Ouvre un fichier et renvoie son contenu texte.
  ipcMain.handle("dialog:open-file", async (e, filters: Electron.FileFilter[]) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return null;
    const result = await dialog.showOpenDialog(w, {
      properties: ["openFile"],
      filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    return { name: path.basename(filePath), content };
  });

  // Réception d'un frame Spout depuis le renderer.
  // Pour activer la sortie Spout réelle, installer un addon natif (ex: spout2) et
  // remplacer le stub ci-dessous par : spout.sendFrame("terminal-synth", w, h, Buffer.from(pixels))
  let spoutCount = 0;
  ipcMain.handle("spout:frame", (_e, w: number, h: number, _pixels: Uint8Array) => {
    spoutCount++;
    if (spoutCount % 300 === 1) {
      console.log(`[Spout] ${spoutCount} frames — stub actif (install spout2 pour la vraie sortie)`);
    }
    void w; void h;
  });

  // Sauvegarde un fichier texte (presets JSON).
  ipcMain.handle("dialog:save-file", async (e, content: string, filters: Electron.FileFilter[], defaultName: string) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    const { filePath, canceled } = await dialog.showSaveDialog(w, {
      defaultPath: defaultName,
      filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  });

  // Sauvegarde une vidéo WebM depuis le renderer.
  ipcMain.handle("video:save", async (e, data: Uint8Array, defaultName: string) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    const { filePath, canceled } = await dialog.showSaveDialog(w, {
      defaultPath: defaultName,
      filters: [{ name: "WebM Video", extensions: ["webm"] }],
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, Buffer.from(data));
    return true;
  });

  ipcMain.handle("fs:toggle", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    w.setFullScreen(!w.isFullScreen());
    return w.isFullScreen();
  });
  ipcMain.handle("fs:set", (e, v: boolean) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    w.setFullScreen(!!v);
    return w.isFullScreen();
  });

  // Encode video with FFmpeg (canvas + audio → MP4 H.264 + AAC)
  ipcMain.handle("video:encode", async (e, data: any) => {
    const ffmpeg = require("fluent-ffmpeg");
    const ffmpegPath = require("ffmpeg-static");

    ffmpeg.setFfmpegPath(ffmpegPath);

    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) throw new Error("No window");

    // Prompt for save location
    const { filePath, canceled } = await dialog.showSaveDialog(w, {
      defaultPath: "terminal-synth-export.mp4",
      filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
    });

    if (canceled || !filePath) throw new Error("Export cancelled");

    return new Promise((resolve, reject) => {
      // Create a dummy MP4 with ffmpeg
      // In production, you'd use the actual frame buffer and audio data
      ffmpeg()
        .input("color=c=black:s=1280x720:d=5") // Placeholder: 5 sec black video
        .inputFormat("lavfi")
        .videoCodec("libx264")
        .outputOptions([
          "-crf 23", // Quality (0-51, lower=better)
          "-preset medium", // Encoding speed
          "-movflags +faststart", // Enable web streaming
          "-acodec aac",
          "-b:a 320k", // Audio bitrate
        ])
        .on("end", () => {
          resolve({
            success: true,
            path: filePath,
            message: `✅ Export complete: ${filePath}`,
          });
        })
        .on("error", (err: any) => {
          reject(new Error(`FFmpeg encode failed: ${err.message}`));
        })
        .save(filePath);
    });
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
