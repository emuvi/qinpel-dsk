const fs = require("fs");
const axios = require('axios');
const { exec } = require("child_process");

function init(refMainDsk) {
	initSetup();
	initQinpelStp();
	initQinpelSrv();

	function initSetup() {
		refMainDsk.putInfoMsg("Starting setup...");
		const setup = require("./setup.json");
		setup.isLocalHost = isLocalHost;
		refMainDsk.setup = setup;

		function isLocalHost() {
			return setup.clientHost == "localhost" || setup.clientHost == "127.0.0.1";
		}
	}

	function initQinpelStp() {
		const mod = {
			isReady: false,
			neverReady: false,
			errorReady: null,
			executable: "qinpel-stp" + refMainDsk.constants.execExtension,
			rootURL: "http://www.pointel.com.br/qinpel",
			call: call,
		};
		refMainDsk.mods.qinpelStp = mod;
		refMainDsk.putInfoMsg("QinpelStp starting...");
		refMainDsk.putInfoMsg("Checking if installer exists...");
		if (fs.existsSync("./" + mod.executable)) {
			refMainDsk.putInfoMsg("QinpelStp exists, you're good to go!");
			mod.isReady = true;
		} else {
			refMainDsk.putInfoMsg("QinpelStp doesn't exists, must be downloaded.");
			download();
		}

		function download() {
			let origin = mod.rootURL;
			origin += "/cmds/" + refMainDsk.constants.os;
			origin += "/" + refMainDsk.constants.arch;
			origin += "/qinpel-stp/" + mod.executable;
			let destiny = mod.executable;
			refMainDsk.putLoadMsg("QinpelStp downloading from: " + origin);
			refMainDsk.utils.downloadFile(origin, destiny)
				.then(_ => {
					refMainDsk.putLoadEndInfoMsg("QinpelStp downloaded with success.");
					mod.isReady = true;
				})
				.catch(err => {
					refMainDsk.putLoadEndErrorMsg("QinpelStp download problem. " + err);
					mod.neverReady = true;
					mod.errorReady = err;
				});
		}

		function call(arguments) {
			return new Promise((resolve, reject) => {
				tryExecute();

				function tryExecute() {
					if (mod.neverReady) {
						reject(mod.errorReady);
					} else if (mod.isReady) {
						execute();
					} else {
						waitAndTry();
					}
				}

				var tryTimes = 0;
				function waitAndTry() {
					tryTimes++;
					if (tryTimes > 3) {
						reject("It's not ready to install anything yet!");
					}
					setTimeout(tryExecute, tryTimes * 3000);
				}

				function execute() {
					exec(mod.executable + " " + arguments, (error, stdout, stderr) => {
						if (stdout) {
							console.log(`QinpelStp stdout: ${stdout}`);
						}
						if (stderr) {
							console.log(`QinpelStp stderr: ${stderr}`);
						}
						if (error) {
							reject(error);
						} else {
							resolve(true);
						}
					});
				}
			});
		}

	}

	function initQinpelSrv() {
		const mod = {
			isReady: false,
			neverReady: false,
			errorReady: null,
		};
		refMainDsk.mods.qinpelSrv = mod;
		refMainDsk.putInfoMsg("Starting QinpelSrv...");
		refMainDsk.putInfoMsg("Checking server address...");
		if (!refMainDsk.setup.clientHost) {
			refMainDsk.putErrorMsg("Error: The server host must be in the setup file.");
			return;
		}
		refMainDsk.address =
			"http://" +
			refMainDsk.setup.clientHost +
			(refMainDsk.setup.clientPort ? ":" + refMainDsk.setup.clientPort : "") +
			(refMainDsk.setup.clientPath ? refMainDsk.setup.clientPath : "/");
		refMainDsk.putInfoMsg("The server address is: " + refMainDsk.address);
		refMainDsk.putLoadMsg("Checking if the server is online...");
		axios.get(refMainDsk.address)
			.then((res) => {
				refMainDsk.putLoadEndInfoMsg("Response: " + res.toString());
				if (res.startsWith("QinpelSrv")) {
					refMainDsk.putInfoMsg("The server is running alright!");
					mod.isReady = true;
				} else {
					let error = "Error: Another server is running on this address.";
					refMainDsk.putErrorMsg(error);
					mod.neverReady = true;
					mod.errorReady = error;
				}
			})
			.catch((err) => {
				if (!refMainDsk.setup.isLocalHost()) {
					refMainDsk.putLoadEndErrorMsg("QinpelSrv connect problem. " + err);
				} else {
					refMainDsk.putLoadEndInfoMsg("QinpelSrv is not started yet.");
				}
			});
	}
}


module.exports = { init };
