import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("synth", {
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke("fs:toggle"),
  setFullscreen: (v: boolean): Promise<boolean> => ipcRenderer.invoke("fs:set", v),
  loadFile: (filters: { name: string; extensions: string[] }[]): Promise<{ name: string; content: string } | null> =>
    ipcRenderer.invoke("dialog:open-file", filters),
  saveFile: (content: string, filters: { name: string; extensions: string[] }[], defaultName: string): Promise<boolean> =>
    ipcRenderer.invoke("dialog:save-file", content, filters, defaultName),
  saveVideo: (data: Uint8Array, defaultName: string): Promise<boolean> =>
    ipcRenderer.invoke("video:save", data, defaultName),
  spoutSendFrame: (w: number, h: number, pixels: Uint8Array): Promise<void> =>
    ipcRenderer.invoke("spout:frame", w, h, pixels),
});
