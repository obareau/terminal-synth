import { app, BrowserWindow, session, desktopCapturer, ipcMain, dialog } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: "#0a0a0a",
    title: "terminal-synth",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Autorise micro/ligne (FFT audio) et MIDI sans pop-up.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === "media" || permission === "midi" || permission === "midiSysex");
  });

  // Capture de la SORTIE système (loopback Windows) pour getDisplayMedia({audio:true}).
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen"] })
        .then((sources) => callback({ video: sources[0], audio: "loopback" }))
        .catch(() => callback({}));
    },
    { useSystemPicker: false },
  );

  win.loadFile(path.join(__dirname, "index.html"));

  // F12 → DevTools (debug shaders / erreurs GL)
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12" && input.type === "keyDown") win.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
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

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
