const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const configs = new ElectronStore();

function createWindow() {
  mainOptions = {
    icon: __dirname + "/favicon.ico",
    show: false,
  };
  Object.assign(mainOptions, configs.get("QinpelMainWindowBounds"));
  const mainWindow = new BrowserWindow(mainOptions);
  mainWindow.removeMenu();
  mainWindow.loadFile(__dirname + "/programs/qinpel/index.html");
  mainWindow.once("ready-to-show", mainWindow.show);
  mainWindow.on("close", () => {
    configs.set("QinpelMainWindowBounds", mainWindow.getBounds());
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
