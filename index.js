const console = require("console");
const { app, BrowserWindow, ipcMain } = require("electron");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");

const constants = require("./constants");
const initializer = require("./initializer");

const refMainDsk = {
    constants,
    setup: null,
    window: null,
    load: mainLoad,
    call: mainCall,
    loadApp: mainLoadApp,
    callCmd: mainCallCmd,
    putDebugMsg: mainPutDebugMsg,
    putLoadMsg: mainPutLoadMsg,
    putLoadEnd: mainPutLoadEnd,
    putLoadEndInfoMsg: mainPutLoadEndInfoMsg,
    putLoadEndErrorMsg: mainPutLoadEndErrorMsg,
    putInfoMsg: mainPutInfoMsg,
    putErrorMsg: mainPutErrorMsg,
    utils: { downloadFile, pathJoin },
    mods: {},
};

app.commandLine.appendSwitch("disable-http-cache");
app.console = new console.Console(process.stdout, process.stderr);

app.whenReady().then(() => {
    windowCreate();
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("logOnMain", (_, message) => {
    console.log("[VIEW] : " + message);
});

ipcMain.on("toggleDevTools", () => {
    if (refMainDsk.window.webContents.isDevToolsOpened()) {
        refMainDsk.window.webContents.closeDevTools();
    } else {
        refMainDsk.window.webContents.openDevTools();
    }
});

async function windowCreate() {
    const options = {
        show: false,
        icon: __dirname + "/favicon.ico",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "preload.js")
        }
    };
    Object.assign(options, storage.get("QinpelDskMainWindowBounds"));
    const window = new BrowserWindow(options);
    refMainDsk.window = window;
    window.removeMenu();
    window.loadURL(refMainDsk.constants.deskAddress, {"extraHeaders" : "pragma: no-cache\n"});
    window.once("ready-to-show", window.show);
    window.on("close", () => {
        storage.set("QinpelDskMainWindowBounds", window.getBounds());
    });
    var firstLoad = true;
    window.webContents.on("did-finish-load", () => {
        if (firstLoad) {
            firstLoad = false;
            refMainDsk.call("putInfoMsg('QinpelDsk starting...')");
            initializer.init(refMainDsk);
            mainStart();
            // window.webContents.openDevTools();
        }
    });
}

function mainStart() {
    tryStart();

    function tryStart() {
        if (allReady()) {
            start();
        } else {
            let error = getErrorNever();
            if (error) {
                abort(error);
            } else {
                setTimeout(tryStart, 1000);
            }
        }
    }

    function allReady() {
        for (const mod in refMainDsk.mods) {
            if (!refMainDsk.mods[mod].isReady) {
                return false;
            }
        }
        return true;
    }

    function getErrorNever() {
        for (const mod in refMainDsk.mods) {
            if (refMainDsk.mods[mod].neverReady) {
                return mod.errorReady;
            }
        }
        return false;
    }

    function start() {
        mainLoadApp("qinpel-app");
    }

    function abort(error) {
        mainPutErrorMsg("QinpelDsk had problems to be started. - " + error);
    }
}

function mainLoad(address) {
    refMainDsk.window.loadURL(address, {"extraHeaders" : "pragma: no-cache\n"});
}

function mainCall(script) {
    refMainDsk.window.webContents.executeJavaScript(script);
}

function mainLoadApp(name) {
    let loadAddress = refMainDsk.constants.fileAddress;
    if (refMainDsk.constants.serverAddress) {
        loadAddress = refMainDsk.constants.serverAddress;
    }
    loadAddress += "run/app/" + name + "/index.html";
    mainPutInfoMsg("QinpelDsk loading app: " + loadAddress);
    refMainDsk.window.loadURL(loadAddress, {"extraHeaders" : "pragma: no-cache\n"});
}

function mainCallCmd(name, withArgs) {
    return new Promise((resolve, reject) => {
        let workDir = path.join(__dirname, "run", "cmd", name);
        let calling =
            path.join(workDir, name + refMainDsk.constants.execExtension) + " " + withArgs;
        mainPutInfoMsg(`CallCmd ${name} calling: ${calling} with args: ${withArgs}`);
        exec(
            calling,
            {
                cwd: workDir,
            },
            (error, stdout, stderr) => {
                if (stdout) {
                    console.log(`[INFO] CallCmd ${name} stdout: ${stdout}`);
                }
                if (stderr) {
                    console.log(`[ERROR] CallCmd ${name} stderr: ${stderr}`);
                }
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            }
        );
    });
}

function mainPutDebugMsg(message) {
    console.log("[DEBUG] : " + message);
}

function mainPutLoadMsg(message) {
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
    console.log("[INFO] : " + message);
    if (isDeskLoaded()) {
        refMainDsk.call("putInfoMsg(`" + message + "`)");
    }
}

function mainPutErrorMsg(message) {
    console.log("[ERROR] : " + message);
    if (isDeskLoaded()) {
        refMainDsk.call("putErrorMsg(`" + message + "`)");
    }
}

function isDeskLoaded() {
    const loaded = refMainDsk.window.webContents.getURL().toString().toLowerCase();
    return loaded == refMainDsk.constants.deskAddress;
}

function downloadFile(origin, destiny) {
    refMainDsk.putInfoMsg(
        "QinpelDsk downloading file from: '" + origin + "' to: '" + destiny + "'"
    );
    const writer = fs.createWriteStream(destiny);

    function remove() {
        try {
            writer.close();
        } catch { }
        setTimeout(
            () =>
                fs.unlink(destiny, (err) => {
                    if (err) {
                        mainPutErrorMsg("QinpelDsk download file remove problem. - " + err);
                    }
                }),
            1000
        );
    }

    return axios({
        method: "get",
        url: origin,
        responseType: "stream",
    })
        .then((response) => {
            return new Promise((resolve, reject) => {
                response.data.pipe(writer);
                let error = null;
                writer.on("error", (err) => {
                    error = err;
                    writer.close();
                    remove();
                    reject(err);
                });
                writer.on("close", () => {
                    if (!error) {
                        resolve(true);
                    } else {
                        remove();
                    }
                });
            });
        })
        .catch((err) => {
            remove();
            throw err;
        });
}

function pathJoin(left, right) {
    var result = left;
    if (result) {
        result += constants.pathSeparator;
    }
    result += right;
    return result;
}
