import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("deskAPI", {
  send: (channel: string, data: any) => {
    let validChannels = ["logOnMain", "toggleDevTools"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});
