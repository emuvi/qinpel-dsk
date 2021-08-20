const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();
const starter = require("./handler");

const qinpelStpRoot = "http://www.pointel.com.br/qinpel"

const constants = [qinpelStpRoot]

const refMainDsk = {
  constants,
  setup: null,
  rootAddress: "file://" + __dirname,
  fullAddress: "file://" + __dirname + "/desk.html",
  subLoad: null,
  window: null,
  load: windowLoad,
  subLoad: windowSubLoad,
  call: windowCall,
  putLoadMsg: putLoadMsg,
  putInfoMsg: putInfoMsg,
  putErrorMsg: putErrorMsg,
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
  window.loadURL(refMainDsk.fullAddress);
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

app.whenReady().then(() => {
  windowCreate();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});


function windowLoad(address) {
  url = new URL(address);
  refMainDsk.rootAddress = url.host;
  refMainDsk.fullAddress = url.href;
  console.log(
    "[DEBUG] Check if this is the proper root address: '" +
      refMainDsk.rootAddress +
      "' of: '" +
      address +
      "'"
  );
  refMainDsk.window.loadURL(refMainDsk.fullAddress);
}

function windowSubLoad(subAddress) {
  refMainDsk.subLoad = new URL(subAddress, refMainDsk.rootAddress).href;
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
    console.log("[LOAD] : " + message);
  }
}

function putInfoMsg(message) {
  if (isDeskLoaded()) {
    refMainDsk.call("putInfoMsg(`" + message + "`)");
  } else {
    console.log("[INFO] : " + message);
  }
}

function putErrorMsg(message) {
  if (isDeskLoaded()) {
    refMainDsk.call("putErrorMsg(`" + message + "`)");
  } else {
    console.log("[Error] : " + message);
  }
}

function getOs() {
  if (process.platform.startsWith("win")) {
    return "win";
  } else if (process.platform.startsWith("lin")) {
    return "lin";
  } else if (process.platform.startsWith("dar")) {
    return "mac";
  } else {
    throw "Operation system not supported.";
  }
}

function getArch() {
  if (process.arch.contains("64")) {
    return "64";
  } else if (process.arch.contains("32")) {
    return "32";
  } else {
    throw "System architecture not supported.";
  }
}

function getExecExtension() {
  if (process.platform.startsWith("win")) {
    return ".exe";
  } else {
    return "";
  }
}
