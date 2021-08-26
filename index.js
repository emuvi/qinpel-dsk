const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();
const constants = require("./constants");
const handler = require("./handler");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const refMainDsk = {
	constants,
	setup: null,
	window: null,
	load: mainLoad,
	call: mainCall,
	loadApp: mainLoadApp,
	callCmd: mainCallCmd,
	putLoadMsg: mainPutLoadMsg,
	putInfoMsg: mainPutInfoMsg,
	putErrorMsg: mainPutErrorMsg,
	utils: { downloadFile },
	mods: {},
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
	window.loadURL(refMainDsk.constants.rootAddress + "/desk.html");
	window.once("ready-to-show", window.show);
	window.on("close", () => {
		storage.set("QinpelDskMainWindowBounds", window.getBounds());
	});
	var firstLoad = true;
	window.webContents.on("did-finish-load", () => {
		if (firstLoad) {
			firstLoad = false;
			refMainDsk.call("putLoadMsg('Starting...')");
			handler.init(refMainDsk);
		}
	});
}

app.whenReady().then(() => {
	windowCreate();
});

app.on("window-all-closed", function() {
	if (process.platform !== "darwin") app.quit();
});


function mainLoad(address) {
	refMainDsk.window.loadURL(address);
}

function mainCall(script) {
	refMainDsk.window.webContents.executeJavaScript(script);
}

function mainLoadApp(name) {
	refMainDsk.window.loadURL(refMainDsk.constants.rootAddress
		+ "/run/apps/" + name + "/index.html");
}

function mainCallCmd(name, arguments) {
	return new Promise((resolve, reject) => {
		let workDir = path.join(__dirname, "run", "cmds", name);
		let calling = path.join(workDir, name + refMainDsk.constants.execExtension)
			+ " " + arguments;
		console.log(`CallCmd ${name} calling: ${calling}`);
		console.log(`CallCmd ${name} directory: ${workDir}`);
		exec(calling, {
			cwd: workDir
		}, (error, stdout, stderr) => {
			if (stdout) {
				console.log(`CallCmd ${name} stdout: ${stdout}`);
			}
			if (stderr) {
				console.log(`CallCmd ${name} stderr: ${stderr}`);
			}
			if (error) {
				reject(error);
			} else {
				resolve(true);
			}
		});
	});
}

function mainPutLoadMsg(message) {
	console.log("[LOAD] : " + message);
	if (isDeskLoaded()) {
		refMainDsk.call("putLoadMsg(`" + message + "`)");
	}
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
	return loaded.startsWith("file://") && loaded.endsWith("/desk.html");
}


function downloadFile(origin, destiny) {
	const writer = fs.createWriteStream(destiny);

	function remove() {
		try {
			writer.close();
		} catch { }
		setTimeout(() => fs.unlink(destiny, (err) => {
			if (err) { mainPutErrorMsg("Download file remove problem. " + err); }
		}), 1000);
	}

	return axios({
		method: 'get',
		url: origin,
		responseType: 'stream',
	}).then(response => {
		return new Promise((resolve, reject) => {
			response.data.pipe(writer);
			let error = null;
			writer.on('error', err => {
				error = err;
				writer.close();
				remove();
				reject(err);
			});
			writer.on('close', () => {
				if (!error) {
					resolve(true);
				} else {
					remove();
				}
			});
		});
	}).catch(err => {
		remove();
		throw err;
	});
}

