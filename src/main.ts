import { exec } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import constants from "./constants";
import ElectronStore = require("electron-store");
const storage = new ElectronStore();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const setup = require("./setup.json");

const refMainDsk = {
  setup,
  constants,
  window: null as BrowserWindow,
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

if (constants.debug) {
  app.commandLine.appendSwitch("disable-http-cache");
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
  const window = new BrowserWindow(options);
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
      if (constants.debug) {
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

app.on("ready", () => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
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

function mainInit() {
  let attempt = 0;
  function tryInit() {
    mainPutInfoMsg("Trying to init the application...");
    axios
      .get("http://" + setup.serverHost + ":" + setup.serverPort + "/ping")
      .then((_: any) => {
        mainLoad("http://" + setup.serverHost + ":" + setup.serverPort + setup.serverPath);
      })
      .catch((err: any) => {
        if (attempt == 0) {
          mainPutErrorMsg(err.message);
          mainPutInfoMsg("Trying to call fallback command on fail...");
          exec(refMainDsk.setup.callIfFail, (err: any, stdout: any, stderr: any) => {
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
        let retryDelay = refMainDsk.setup.retryDelay ?? 1000;
        let retryTimes = refMainDsk.setup.retryTimes ?? 3;
        if (attempt < retryTimes) {
          setTimeout(() => {
            tryInit();
          }, retryDelay);
        } else {
          mainPutErrorMsg("Failed to init the application.");
        }
      });
  }
  tryInit();
}

function mainLoad(address: string) {
  let options: any = {};
  if (constants.debug) {
    options["extraHeaders"] = "pragma: no-cache\n";
  }
  refMainDsk.window.loadURL(address, options);
}

function mainCall(script: string) {
  refMainDsk.window.webContents.executeJavaScript(script);
}

function mainPutDebugMsg(message: string) {
  console.log("[DEBUG] : " + message);
}

function mainPutLoadMsg(message: string) {
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

function mainPutLoadEndInfoMsg(message: string) {
  mainPutLoadEnd();
  mainPutInfoMsg(message);
}

function mainPutLoadEndErrorMsg(message: string) {
  mainPutLoadEnd();
  mainPutErrorMsg(message);
}

function mainPutInfoMsg(message: string) {
  message = message ? message.toString() : "";
  message = message.replace(/`/g, "'");
  console.log("[INFO] : " + message);
  if (isDeskLoaded()) {
    refMainDsk.call("putInfoMsg(`" + message + "`)");
  }
}

function mainPutErrorMsg(message: string) {
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

function downloadFile(origin: string, destiny: string) {
  refMainDsk.putInfoMsg(
    "QinpelDsk downloading file from: '" + origin + "' to: '" + destiny + "'"
  );
  const writer = fs.createWriteStream(destiny);

  function remove() {
    try {
      writer.close();
    } catch {}
    setTimeout(() => fs.unlink(destiny, null), 1000);
  }

  return new Promise((resolve, reject) => {
    const config = {
      url: origin,
      method: "get",
      responseType: "stream",
    };
    axios(config)
      .then((response: any) => {
        response.data.pipe(writer);
        var error: any = null;
        writer.on("error", (err: any) => {
          error = err;
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
      })
      .catch((err: any) => {
        remove();
        reject(err);
      });
  });
}

function pathJoin(left: string, right: string) {
  var result = left ? left.toString() : "";
  if (result) {
    result += constants.pathSeparator;
  }
  result += right ? right.toString() : "";
  return result;
}
