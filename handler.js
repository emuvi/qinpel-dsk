const fs = require("fs");
const axios = require('axios');

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
		var isReady = false;
		const qinpelStp = {
			install
		}
		refMainDsk.mods.qinpelStp = qinpelStp;
		refMainDsk.putInfoMsg("QinpelStp starting...");
		refMainDsk.putInfoMsg("Checking if installer exists...");
		executable = "qinpel-stp" + refMainDsk.constants.execExtension;
		if (fs.existsSync("./" + executable)) {
			refMainDsk.putInfoMsg("QinpelStp exists, you're good to go!");
			isReady = true;
		} else {
			refMainDsk.putInfoMsg("QinpelStp doesn't exists, must be downloaded.");
			download();
		}

		function download() {

		}

		function install(argument) {
			return new Promise((resolve, reject) => {
				
			});
		}

	}

	function initQinpelSrv() {
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
