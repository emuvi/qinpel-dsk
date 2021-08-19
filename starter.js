const http = require("http");
const fs = require("fs");
const { exception } = require("console");

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
    refMainDsk.putInfoMsg("Starting QinpelStp...");
    refMainDsk.putInfoMsg("Checking if installer exists...");
    executable = "qinpel-stp" + getExecutableExtension();
    if (fs.existsSync("./" + executable)) {
      refMainDsk.putInfoMsg("QinpelStp exists, you're good to go!");
    } else {
      refMainDsk.putInfoMsg("QinpelStp doesn't exists, must be downloaded.");
      downloadQinpelStp();
    }
  }

  function downloadQinpelStp() {

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
    httpGet(refMainDsk.address)
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

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve(body));
      })
      .on("Error", reject);
  });
}

function download(origin, destiny, callBack) {
  const file = fs.createWriteStream(destiny);
  const request = http.get(origin, (response) => {
    if (response.statusCode !== 200) {
      return callBack("Response status was " + response.statusCode);
    }
    response.pipe(file);
  });
  file.on("finish", () => file.close(callBack));
  request.on("Error", (err) => {
    fs.unlink(destiny);
    return callBack(err.message);
  });
  file.on("Error", (err) => {
    fs.unlink(destiny);
    return callBack(err.message);
  });
}

function getOs() {
  if (process.platform.startsWith("win")) {
    return "win";
  } else if (process.platform.startsWith("lin")) {
    return "lin";
  } else if (process.platform.startsWith("dar")) {
    return "mac";
  } else {
    throw "Operation system not supported.";
  }
}

function getArch() {
  if (process.arch.contains("64")) {
    return "64";
  } else if (process.arch.contains("32")) {
    return "32";
  } else {
    throw "System architecture not supported.";
  }
}

function getExecutableExtension() {
  if (process.platform.startsWith("win")) {
    return ".exe";
  } else {
    return "";
  }
}

module.exports = { init };
