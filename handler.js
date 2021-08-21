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
		refMainDsk.setup = setup;
	}

	function initQinpelStp() {
		const mod = {
			isReady: false,
			neverReady: false,
			errorReady: null,
			executable: "qinpel-stp" + refMainDsk.constants.execExtension,
			rootURL: "http://www.pointel.com.br/qinpel",
			install: install,
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
			refMainDsk.putInfoMsg("QinpelStp downloading from: " + origin);
			refMainDsk.utils.downloadFile(origin, destiny)
				.then(_ => {
					refMainDsk.putInfoMsg("QinpelStp downloaded with success.");
					isReady = true;
				})
				.catch(err => {
					refMainDsk.putErrorMsg("QinpelStp download problem. " + err);
					neverReady = true;
					errorReady = err;
				});
		}

		function install(arguments) {
			return new Promise((resolve, reject) => {
				tryExecute();

				function tryExecute() {
					if (neverReady) {
						reject(errorReady);
					} else if (isReady) {
						execute();
					} else {
						waitAndTry();
					}
				}

				var tryTimes = 0;
				function waitAndTry() {
					tryTimes++;
					if (tryTimes > 3) {
						throw "It's not ready to install yet!";
					}
					setTimeout(tryExecute, 3000);
				}

				function execute() {
					exec(execName + " " + arguments, (error, stdout, stderr) => {
						if (error) {
							console.log(`error: ${error.toString()}`);
							return;
						}
						if (stderr) {
							console.log(`stderr: ${stderr}`);
							return;
						}
						console.log(`stdout: ${stdout}`);
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
		if (!refMainDsk.setup.host) {
			refMainDsk.putErrorMsg("Error: The server host must be in the setup file.");
			return;
		}
		refMainDsk.address =
			"http://" +
			refMainDsk.setup.host +
			(refMainDsk.setup.port ? ":" + refMainDsk.setup.port : "") +
			(refMainDsk.setup.path ? refMainDsk.setup.path : "/");
		refMainDsk.putInfoMsg("The server address is: " + refMainDsk.address);
		refMainDsk.putLoadMsg("Checking if the server is online...");
		axios.get(refMainDsk.address)
			.then((res) => {
				refMainDsk.putInfoMsg("Response: " + res.toString());
				if (res.startsWith("QinpelSrv")) {
					refMainDsk.putInfoMsg("The server is running alright!");
					refMainDsk.subLoad("/run");
				} else {
					refMainDsk.putErrorMsg("Error: Another server is running on this address.");
				}
			})
			.catch((err) => {
				refMainDsk.putErrorMsg(err.toString());
			});
	}
}


module.exports = { init };
