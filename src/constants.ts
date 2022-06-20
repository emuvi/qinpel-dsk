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
  if (process.arch.indexOf("64") != -1) {
    return "64";
  } else if (process.arch.indexOf("32") != -1) {
    return "32";
  } else {
    throw "System architecture not supported.";
  }
}

function getExecExtension() {
  if (process.platform.startsWith("win")) {
    return ".exe";
  } else {
    return "";
  }
}

const debug = !!process.argv.find((el) => el == "-d" || el == "--debug");
const os = getOs();
const arch = getArch();
const pathSeparator = os == "win" ? "\\" : "/";
const execExtension = getExecExtension();
const fileAddress = "file:///" + __dirname.replace(/\\/g, "/") + "/";
const deskAddress = fileAddress + "desk.html";

const constants = {
  debug,
  os,
  arch,
  pathSeparator,
  execExtension,
  fileAddress,
  deskAddress,
};

export default constants;
