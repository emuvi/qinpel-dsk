const { app, BrowserWindow } = require("electron");
const ElectronStore = require("electron-store");
const storage = new ElectronStore();
const constants = require("./constants");
const handler = require("./handler");
const axios = require("axios");
const fs = require("fs");

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
	utils: { getFile },
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

function putLoadMsg(message) {
	console.log("[LOAD] : " + message);
	if (isDeskLoaded()) {
		refMainDsk.call("putLoadMsg(`" + message + "`)");
	}
}

function putInfoMsg(message) {
	console.log("[INFO] : " + message);
	if (isDeskLoaded()) {
		refMainDsk.call("putInfoMsg(`" + message + "`)");
	}
}

function putErrorMsg(message) {
	console.log("[Error] : " + message);
	if (isDeskLoaded()) {
		refMainDsk.call("putErrorMsg(`" + message + "`)");
	}
}

function isDeskLoaded() {
	const loaded = refMainDsk.window.webContents.getURL().toString().toLowerCase();
	return loaded.startsWith("file://") && loaded.endsWith("/desk.html");
}


function getFile(origin, destiny) {
	const writer = fs.createWriteStream(destiny);
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
				reject(err);
			});
			writer.on('close', () => {
				if (!error) {
					resolve(true);
				}
			});
		});
	});
}

