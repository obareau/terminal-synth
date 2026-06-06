import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("synth", {
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke("fs:toggle"),
  setFullscreen: (v: boolean): Promise<boolean> => ipcRenderer.invoke("fs:set", v),
});
