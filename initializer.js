const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");

function init(refMainDsk) {
	initSetup();
	initQinpelStp();
	initQinpelSrv();

	function initSetup() {
		refMainDsk.putInfoMsg("QinpelDsk starting setup...");
		const setup = require("./setup.json");
		setup.isLocalHost = isLocalHost;
		refMainDsk.setup = setup;

		function isLocalHost() {
			return setup.clientHost == "localhost" || setup.clientHost == "127.0.0.1";
		}
	}

	function existsInner(mod) {
		let executable = mod.name + refMainDsk.constants.execExtension;
		return fs.existsSync("./" + executable);
	}

	function downloadInner(mod) {
		let executable = mod.name + refMainDsk.constants.execExtension;
		let origin = refMainDsk.constants.repoAddress;
		origin += "/cmds/" + refMainDsk.constants.os;
		origin += "/" + refMainDsk.constants.arch;
		origin += "/" + mod.name;
		origin += "/" + executable;
		let destiny = executable;
		return refMainDsk.utils.downloadFile(origin, destiny);
	}

	function initQinpelStp() {
		const mod = {
			isReady: false,
			neverReady: false,
			errorReady: null,
			name: "qinpel-stp",
			call: call,
		};
		refMainDsk.mods.push(mod);
		refMainDsk.putInfoMsg("QinpelStp starting...");
		refMainDsk.putInfoMsg("QinpelStp checking if exists...");
		if (existsInner(mod)) {
			refMainDsk.putInfoMsg("QinpelStp exists, you're good to go!");
			mod.isReady = true;
		} else {
			refMainDsk.putInfoMsg("QinpelStp doesn't exists, must be downloaded.");
			refMainDsk.putLoadMsg("QinpelStp downloading executable.");
			downloadInner(mod)
				.then((_) => {
					refMainDsk.putLoadEndInfoMsg("QinpelStp downloaded executable.");
					mod.isReady = true;
				})
				.catch((err) => {
					refMainDsk.putLoadEndErrorMsg(
						"QinpelStp problem on downloading executable. - " + err
					);
					mod.neverReady = true;
					mod.errorReady = err;
				});
		}

		function call(withArgs) {
			const executable = mod.name + refMainDsk.constants.execExtension;
			refMainDsk.putInfoMsg("QinpelStp calling with args: '" + withArgs + "'");

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
					refMainDsk.putInfoMsg("QinpelStp executing with args: '" + withArgs + "'");
					exec(executable + " " + withArgs, (error, stdout, stderr) => {
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
			name: "qinpel-srv",
			address: "",
		};
		refMainDsk.mods.push(mod);
		refMainDsk.putInfoMsg("QinpelSrv starting...");
		refMainDsk.putInfoMsg("QinpelSrv checking address...");
		if (!refMainDsk.setup.clientHost) {
			let error =
				"QinpelSrv problem on address. - Error: Client host must be in the setup file.";
			refMainDsk.putErrorMsg(error);
			neverReady = true;
			errorReady = error;
			return;
		}
		mod.address =
			"http://" +
			refMainDsk.setup.clientHost +
			(refMainDsk.setup.clientPort ? ":" + refMainDsk.setup.clientPort : "") +
			(refMainDsk.setup.clientPath ? refMainDsk.setup.clientPath : "/");
		refMainDsk.constants.serverAddress = mod.address;
		refMainDsk.putInfoMsg("QinpelSrv address is: " + mod.address);
		check();

		function check() {
			refMainDsk.putLoadMsg("QinpelSrv checking if is online...");
			axios
				.get(mod.address)
				.then((res) => {
					res = res.data.toString();
					refMainDsk.putLoadEndInfoMsg("QinpelSrv checking response...");
					if (res.startsWith("QinpelSrv")) {
						refMainDsk.putInfoMsg("QinpelSrv is running alright!");
						mod.isReady = true;
					} else {
						let error =
							"QinpelSrv problem on response. - Error: Another server is running on same address.";
						refMainDsk.putErrorMsg(error);
						mod.neverReady = true;
						mod.errorReady = error;
					}
				})
				.catch((err) => {
					if (refMainDsk.setup.isLocalHost()) {
						refMainDsk.putLoadEndInfoMsg("QinpelSrv is not started yet.");
						start();
					} else {
						refMainDsk.putLoadEndErrorMsg("QinpelSrv problem on connecting. - " + err);
						mod.neverReady = true;
						mod.errorReady = err;
					}
				});
		}

		function start() {
			if (!existsInner(mod)) {
				download();
			} else {
				call();
			}
		}

		function download() {
			refMainDsk.putLoadMsg("QinpelSrv downloading executable.");
			downloadInner(mod)
				.then((_) => {
					refMainDsk.putLoadEndInfoMsg("QinpelSrv downloaded executable.");
					call();
				})
				.catch((err) => {
					refMainDsk.putLoadEndErrorMsg(
						"QinpelSrv problem on downloading executable. - " + err
					);
					mod.neverReady = true;
					mod.errorReady = err;
				});
		}

		function call() {
			const executable = mod.name + refMainDsk.constants.execExtension;
			refMainDsk.putInfoMsg("QinpelStp calling executable.");
			exec(executable, (error) => {
				if (error) {
					refMainDsk.putLoadEndErrorMsg(
						"QinpelStp problem on running executable. - " + err
					);
					mod.neverReady = true;
					mod.errorReady = err;
				}
			});
			setTimeout(check, 3000);
		}
	}
}

module.exports = { init };
