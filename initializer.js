const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");

function init(refMainDsk) {
    initSetup();
    initQinpelStp();
    initQinpelSrv();
    initQinpelApp();

    function existsInner(mod) {
        return fs.existsSync(mod.executable);
    }

    function downloadInner(mod) {
        let origin = refMainDsk.constants.repoAddress;
        origin += "/cmd/" + refMainDsk.constants.os;
        origin += "/" + refMainDsk.constants.arch;
        origin += "/" + mod.name;
        origin += "/" + mod.name;
        origin += refMainDsk.constants.execExtension;
        let destiny = mod.executable;
        return refMainDsk.utils.downloadFile(origin, destiny);
    }

    function getExecutableInner(modName) {
        return refMainDsk.utils.pathJoin(".", modName + refMainDsk.constants.execExtension);
    }

    function initSetup() {
        refMainDsk.putInfoMsg("QinpelDsk starting setup...");
        const setup = require("./setup.json");
        setup.isLocalHost = isLocalHost;
        refMainDsk.setup = setup;

        function isLocalHost() {
            return setup.clientHost == "localhost" || setup.clientHost == "127.0.0.1";
        }
    }

    function initQinpelStp() {
        const modName = "qinpel-stp";
        const modRef = {
            isReady: false,
            neverReady: false,
            errorReady: null,
            name: modName,
            executable: getExecutableInner(modName),
            call: call,
        };
        refMainDsk.mods.qinpelStp = modRef;
        refMainDsk.putInfoMsg("QinpelStp starting...");
        refMainDsk.putInfoMsg("QinpelStp checking if exists...");
        if (existsInner(modRef)) {
            refMainDsk.putInfoMsg("QinpelStp exists, you're good to go!");
            modRef.isReady = true;
        } else {
            refMainDsk.putInfoMsg("QinpelStp doesn't exists, must be downloaded.");
            refMainDsk.putLoadMsg("QinpelStp downloading executable...");
            downloadInner(modRef)
                .then((_) => {
                    refMainDsk.putLoadEndInfoMsg("QinpelStp downloaded executable.");
                    modRef.isReady = true;
                })
                .catch((err) => {
                    refMainDsk.putLoadEndErrorMsg("QinpelStp problem on downloading executable. - " + err);
                    modRef.neverReady = true;
                    modRef.errorReady = err;
                });
        }

        function call(withArgs) {
            refMainDsk.putInfoMsg("QinpelStp calling with args: '" + withArgs + "'");

            return new Promise((resolve, reject) => {
                tryExecute();

                function tryExecute() {
                    if (modRef.neverReady) {
                        reject(modRef.errorReady);
                    } else if (modRef.isReady) {
                        execute();
                    } else {
                        waitAndTry();
                    }
                }

                var triedTimes = 0;
                function waitAndTry() {
                    triedTimes++;
                    if (triedTimes > 3) {
                        reject("It's not ready to install anything!");
                    }
                    setTimeout(tryExecute, triedTimes * 3000);
                }

                function execute() {
                    refMainDsk.putInfoMsg("QinpelStp executing with args: '" + withArgs + "'");
                    exec(modRef.executable + " " + withArgs, (error, stdout, stderr) => {
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
        const modName = "qinpel-srv";
        const modRef = {
            isReady: false,
            neverReady: false,
            errorReady: null,
            name: modName,
            executable: getExecutableInner(modName),
            address: "",
        };
        refMainDsk.mods.qinpelSrv = modRef;
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
        modRef.address =
            "http://" +
            refMainDsk.setup.clientHost +
            (refMainDsk.setup.clientPort ? ":" + refMainDsk.setup.clientPort : "") +
            (refMainDsk.setup.clientPath ? refMainDsk.setup.clientPath : "/");
        refMainDsk.constants.serverAddress = modRef.address;
        refMainDsk.putInfoMsg("QinpelSrv address is: " + modRef.address);
        var triedToStart = false;
        check();

        function check() {
            if (modRef.neverReady) {
                return;
            }
            refMainDsk.putLoadMsg("QinpelSrv checking if is online...");
            axios
                .get(modRef.address + "ping")
                .then((res) => {
                    res = res.data.toString();
                    refMainDsk.putLoadEndInfoMsg("QinpelSrv checking response...");
                    if (res.startsWith("QinpelSrv")) {
                        refMainDsk.putInfoMsg("QinpelSrv is running alright!");
                        modRef.isReady = true;
                    } else {
                        let error = "QinpelSrv problem on response. - Error: Another server is running on same address.";
                        refMainDsk.putErrorMsg(error);
                        modRef.neverReady = true;
                        modRef.errorReady = error;
                    }
                })
                .catch((err) => {
                    refMainDsk.putLoadEndErrorMsg("QinpelSrv problem on connecting. - " + err);
                    if (refMainDsk.setup.isLocalHost() && !triedToStart) {
                        refMainDsk.putInfoMsg("QinpelSrv trying to start...");
                        start();
                    } else {
                        modRef.neverReady = true;
                        modRef.errorReady = err;
                    }
                });
        }


        function start() {
            triedToStart = true;
            if (!existsInner(modRef)) {
                download();
            } else {
                call();
            }
        }

        function download() {
            refMainDsk.putLoadMsg("QinpelSrv downloading executable...");
            downloadInner(modRef)
                .then((_) => {
                    refMainDsk.putLoadEndInfoMsg("QinpelSrv downloaded executable.");
                    call();
                })
                .catch((err) => {
                    refMainDsk.putLoadEndErrorMsg("QinpelSrv problem on downloading executable. - " + err);
                    modRef.neverReady = true;
                    modRef.errorReady = err;
                });
        }

        function call() {
            refMainDsk.putInfoMsg("QinpelSrv calling executable...");
            exec(modRef.executable, (err) => {
                if (err) {
                    refMainDsk.putErrorMsg("QinpelSrv problem on running executable. - " + err);
                    modRef.neverReady = true;
                    modRef.errorReady = err;
                }
            });
            setTimeout(check, 3000);
        }
    }

    function initQinpelApp() {
        const modName = "qinpel-app";
        const modRef = {
            isReady: false,
            neverReady: false,
            errorReady: null,
            name: modName,
        };
        refMainDsk.mods.qinpelApp = modRef;
        refMainDsk.putInfoMsg("QinpelApp starting...");
        refMainDsk.putInfoMsg("QinpelApp checking necessity...");
        if (!refMainDsk.setup.isLocalHost()) {
            refMainDsk.putInfoMsg("QinpelApp is not expected.");
            modRef.isReady = true;
        } else if (fs.existsSync("run/app/qinpel-app")) {
            refMainDsk.putInfoMsg("QinpelApp is ready to go.");
            modRef.isReady = true;
        } else {
            refMainDsk.putLoadInfoMsg("QinpelApp calling installer...");
            refMainDsk.mods.qinpelStp.call("--install app/qinpel-app")
                .then(_ => {
                    refMainDsk.putLoadEndInfoMsg("QinpelApp installed successfully.");
                    modRef.isReady = true;
                })
                .catch(err => {
                    refMainDsk.putLoadEndErrorMsg("QinpelApp problem on installing. - " + err);
                    modRef.neverReady = true;
                    modRef.errorReady = err;
                });
        }
    }
}

const initializer = { init };

module.exports = initializer;
