const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
    "nodeAPI", {
    send: (channel, data) => {
        let validChannels = ["logOnMain"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    }
});