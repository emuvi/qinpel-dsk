const server = require("./server");
const path = require("path");
const url = require("url");
const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const configs = new ElectronStore();

server.start();

console.log(__dirname);

const mainPath = path.join(__dirname, "qinpel", "index.html");
const mainURL = url.pathToFileURL(mainPath).href;

function createWindow() {
  mainOptions = {
    icon: __dirname + "/favicon.ico",
    show: false,
  };
  Object.assign(mainOptions, configs.get("winBounds"));

  const mainWindow = new BrowserWindow(mainOptions);
  mainWindow.removeMenu();
  mainWindow.loadURL(mainURL);

  mainWindow.once("ready-to-show", mainWindow.show);
  mainWindow.on("close", () => {
    configs.set("winBounds", mainWindow.getBounds());
  });
  mainWindow.webContents.on("new-window", (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
