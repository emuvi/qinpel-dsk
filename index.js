const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();
const starter = require("./starter");

const refMainDsk = {
  setup: null,
  address: "file://" + __dirname + "/desk.html",
  subLoad: null,
  window: null,
  load: windowLoad,
  subLoad: windowSubLoad,
  call: windowCall,
  putLoadMsg: putLoadMsg,
  putInfoMsg: putInfoMsg,
  putErroMsg: putErroMsg,
};

function windowCreate() {
  const options = {
    icon: __dirname + "/favicon.ico",
    show: false,
  };
  Object.assign(options, storage.get("QinpelDskMainWindowBounds"));
  const window = new BrowserWindow(options);
  refMainDsk.window = window;
  window.removeMenu();
  window.setMaximizable(false);
  window.loadURL(refMainDsk.address);
  window.once("ready-to-show", window.show);
  window.on("close", () => {
    storage.set("QinpelDskMainWindowBounds", window.getBounds());
  });
  var firstLoad = true;
  window.webContents.on("did-finish-load", () => {
    if (firstLoad) {
      firstLoad = false;
      refMainDsk.call("putLoadMsg('Starting...')");
      starter.init(refMainDsk);
    }
  });
  
}

function windowLoad(address) {
  refMainDsk.address = address;
  refMainDsk.window.loadURL(address);
}

function windowSubLoad(subAddress) {
  refMainDsk.subLoad = new URL(subAddress, refMainDsk.address).href;
  refMainDsk.window.loadURL(refMainDsk.subLoad);
}

function windowCall(script) {
  refMainDsk.window.webContents.executeJavaScript(script);
}

function isDeskLoaded() {
  const loaded = refMainDsk.window.webContents.getURL().toString().toLowerCase();
  return loaded.startsWith("file://") && loaded.endsWith("/desk.html");
}

function putLoadMsg(message) {
  if (isDeskLoaded()) {
    refMainDsk.call("putLoadMsg(`" + message + "`)");
  } else {
    console.log("LOAD: " + message);
  }
}

function putInfoMsg(message) {
  if (isDeskLoaded()) {
    refMainDsk.call("putInfoMsg(`" + message + "`)");
  } else {
    console.log("INFO: " + message);
  }
}

function putErroMsg(message) {
  if (isDeskLoaded()) {
    refMainDsk.call("putErroMsg(`" + message + "`)");
  } else {
    console.log("ERRO: " + message);
  }
}

app.whenReady().then(() => {
  windowCreate();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
