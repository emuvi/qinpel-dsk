const { app, BrowserWindow } = require("electron");
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
	utils: { downloadFile },
	mods: [],
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
	window.loadURL(refMainDsk.constants.deskAddress);
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
		}
	});
}

app.whenReady().then(() => {
	windowCreate();
});

app.on("window-all-closed", function() {
	if (process.platform !== "darwin") app.quit();
});

function mainStart() {
	tryStart();

	function tryStart() {
		mainPutInfoMsg("QinpelDsk trying to start.");
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
		for (let mod of refMainDsk.mods) {
			if (!mod.isReady) {
				return false;
			}
		}
		return true;
	}

	function getErrorNever() {
		for (let mod of refMainDsk.mods) {
			if (mod.neverReady) {
				return mod.errorReady;
			}
		}
		return false;
	}

	function start() {
		mainLoadApp("qinpel");
	}

	function abort(error) {
		mainPutErrorMsg("QinpelDsk had problems to be started. - " + error);
	}
}

function mainLoad(address) {
	refMainDsk.window.loadURL(address);
}

function mainCall(script) {
	refMainDsk.window.webContents.executeJavaScript(script);
}

function mainLoadApp(name) {
	refMainDsk.window.loadURL(refMainDsk.constants.fileAddress
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
	refMainDsk.putInfoMsg("QinpelDsk downloading file from: '" + origin + "' to: '" + destiny + "'")
	const writer = fs.createWriteStream(destiny);

	function remove() {
		try {
			writer.close();
		} catch { }
		setTimeout(() => fs.unlink(destiny, (err) => {
			if (err) { mainPutErrorMsg("QinpelDsk download file remove problem. - " + err); }
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

