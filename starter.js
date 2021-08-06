const http = require("http");
const fs = require("fs");

function init(refMainDsk) {
  initSetup();
  initServer();

  function initSetup() {
    refMainDsk.putLoadMsg("Starting setup...");
    const setup = require("./setup.json");
    refMainDsk.setup = setup;
  }

  function initServer() {
    refMainDsk.putLoadMsg("Starting server...");
    refMainDsk.putLoadMsg("Checking server address...");
    if (!refMainDsk.setup.host) {
      refMainDsk.putErroMsg("Error: The server host must be in the setup file.");
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
          refMainDsk.putErroMsg("Error: Another server is running on this address.");  
        }
      })
      .catch((err) => {
        refMainDsk.putErroMsg(err.toString());
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
      .on("error", reject);
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
  request.on("error", (err) => {
    fs.unlink(destiny);
    return callBack(err.message);
  });
  file.on("error", (err) => {
    fs.unlink(destiny);
    return callBack(err.message);
  });
}

module.exports = { init };
