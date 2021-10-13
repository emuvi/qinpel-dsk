const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
    "deskAPI", {
    send: (channel, data) => {
        let validChannels = ["logOnMain", "toggleDevTools"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    }
});