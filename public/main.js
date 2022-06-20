"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const electron_1 = require("electron");
const constants_1 = require("./constants");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const setup = require("./setup.json");
const refMainDsk = {
    setup,
    constants: constants_1.default,
    window: null,
    load: mainLoad,
    call: mainCall,
    putDebugMsg: mainPutDebugMsg,
    putLoadMsg: mainPutLoadMsg,
    putLoadEnd: mainPutLoadEnd,
    putLoadEndInfoMsg: mainPutLoadEndInfoMsg,
    putLoadEndErrorMsg: mainPutLoadEndErrorMsg,
    putInfoMsg: mainPutInfoMsg,
    putErrorMsg: mainPutErrorMsg,
    utils: { downloadFile, pathJoin },
};
if (constants_1.default.debug) {
    electron_1.app.commandLine.appendSwitch("disable-http-cache");
}
function createWindow() {
    const options = {
        show: false,
        icon: path.join(__dirname, "/favicon.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "/preload.js"),
        },
    };
    Object.assign(options, storage.get("QinpelDskMainWindowBounds"));
    const window = new electron_1.BrowserWindow(options);
    refMainDsk.window = window;
    window.removeMenu();
    mainLoad(refMainDsk.constants.deskAddress);
    window.once("ready-to-show", window.show);
    window.on("close", () => {
        storage.set("QinpelDskMainWindowBounds", window.getBounds());
    });
    var firstLoad = true;
    window.webContents.on("did-finish-load", () => {
        if (firstLoad) {
            firstLoad = false;
            mainPutInfoMsg("QinpelDsk starting...");
            if (constants_1.default.debug) {
                window.webContents.openDevTools();
            }
            mainPutInfoMsg("Setup serverHost = " + setup.serverHost);
            mainPutInfoMsg("Setup serverPort = " + setup.serverPort);
            mainPutInfoMsg("Setup serverPath = " + setup.serverPath);
            mainPutInfoMsg("Setup callIfFail = " + setup.callIfFail);
            mainPutInfoMsg("Setup retryDelay = " + setup.retryDelay);
            mainInit();
        }
    });
}
electron_1.app.on("ready", () => {
    createWindow();
    electron_1.app.on("activate", function () {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.ipcMain.on("logOnMain", (_, message) => {
    console.log("[VIEW] : " + message);
});
electron_1.ipcMain.on("toggleDevTools", () => {
    if (refMainDsk.window.webContents.isDevToolsOpened()) {
        refMainDsk.window.webContents.closeDevTools();
    }
    else {
        refMainDsk.window.webContents.openDevTools();
    }
});
function mainInit() {
    let attempt = 0;
    function tryInit() {
        mainPutInfoMsg("Trying to init the application...");
        axios
            .get("http://" + setup.serverHost + ":" + setup.serverPort + "/ping")
            .then((_) => {
            mainLoad("http://" + setup.serverHost + ":" + setup.serverPort + setup.serverPath);
        })
            .catch((err) => {
            var _a, _b;
            if (attempt == 0) {
                mainPutErrorMsg(err.message);
                mainPutInfoMsg("Trying to call fallback command on fail...");
                (0, child_process_1.exec)(refMainDsk.setup.callIfFail, (err, stdout, stderr) => {
                    if (err) {
                        mainPutErrorMsg("Fallback command error: " + err.message);
                    }
                    if (stdout) {
                        mainPutInfoMsg("Fallback command stdout: " + stdout);
                    }
                    if (stderr) {
                        mainPutErrorMsg("Fallback command stderr: " + stderr);
                    }
                });
            }
            attempt++;
            let retryDelay = (_a = refMainDsk.setup.retryDelay) !== null && _a !== void 0 ? _a : 1000;
            let retryTimes = (_b = refMainDsk.setup.retryTimes) !== null && _b !== void 0 ? _b : 3;
            if (attempt < retryTimes) {
                setTimeout(() => {
                    tryInit();
                }, retryDelay);
            }
            else {
                mainPutErrorMsg("Failed to init the application.");
            }
        });
    }
    tryInit();
}
function mainLoad(address) {
    let options = {};
    if (constants_1.default.debug) {
        options["extraHeaders"] = "pragma: no-cache\n";
    }
    refMainDsk.window.loadURL(address, options);
}
function mainCall(script) {
    refMainDsk.window.webContents.executeJavaScript(script);
}
function mainPutDebugMsg(message) {
    console.log("[DEBUG] : " + message);
}
function mainPutLoadMsg(message) {
    message = message ? message.toString() : "";
    message = message.replace(/`/g, "'");
    console.log("[LOAD] : " + message);
    if (isDeskLoaded()) {
        refMainDsk.call("putLoadMsg(`" + message + "`)");
    }
}
function mainPutLoadEnd() {
    if (isDeskLoaded()) {
        refMainDsk.call("putLoadEnd()");
    }
}
function mainPutLoadEndInfoMsg(message) {
    mainPutLoadEnd();
    mainPutInfoMsg(message);
}
function mainPutLoadEndErrorMsg(message) {
    mainPutLoadEnd();
    mainPutErrorMsg(message);
}
function mainPutInfoMsg(message) {
    message = message ? message.toString() : "";
    message = message.replace(/`/g, "'");
    console.log("[INFO] : " + message);
    if (isDeskLoaded()) {
        refMainDsk.call("putInfoMsg(`" + message + "`)");
    }
}
function mainPutErrorMsg(message) {
    message = message ? message.toString() : "";
    message = message.replace(/`/g, "'");
    console.log("[ERROR] : " + message);
    if (isDeskLoaded()) {
        refMainDsk.call("putErrorMsg(`" + message + "`)");
    }
}
function isDeskLoaded() {
    const loaded = refMainDsk.window.webContents.getURL().toString();
    return loaded == refMainDsk.constants.deskAddress;
}
function downloadFile(origin, destiny) {
    refMainDsk.putInfoMsg("QinpelDsk downloading file from: '" + origin + "' to: '" + destiny + "'");
    const writer = fs.createWriteStream(destiny);
    function remove() {
        try {
            writer.close();
        }
        catch (_a) { }
        setTimeout(() => fs.unlink(destiny, null), 1000);
    }
    return new Promise((resolve, reject) => {
        const config = {
            url: origin,
            method: "get",
            responseType: "stream",
        };
        axios(config)
            .then((response) => {
            response.data.pipe(writer);
            var error = null;
            writer.on("error", (err) => {
                error = err;
                remove();
                reject(err);
            });
            writer.on("close", () => {
                if (!error) {
                    resolve(true);
                }
                else {
                    remove();
                }
            });
        })
            .catch((err) => {
            remove();
            reject(err);
        });
    });
}
function pathJoin(left, right) {
    var result = left ? left.toString() : "";
    if (result) {
        result += constants_1.default.pathSeparator;
    }
    result += right ? right.toString() : "";
    return result;
}
//# sourceMappingURL=main.js.map