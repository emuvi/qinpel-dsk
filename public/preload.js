"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("deskAPI", {
    send: (channel, data) => {
        let validChannels = ["logOnMain", "toggleDevTools"];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, data);
        }
    },
});
//# sourceMappingURL=preload.js.map