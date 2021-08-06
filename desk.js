const divFoot = document.getElementById("QinpelDeskFoot");
const imgFoot = document.getElementById("QinpelDeskFootImg");

hideFoot();

function hideFoot() {
  divFoot.style.display = "none";
}

function showLoad() {
  divFoot.style.display = "";
  imgFoot.src = "./desk-load.gif";
}

function showInfo() {
  divFoot.style.display = "";
  imgFoot.src = "./desk-info.png";
}

function showErro() {
  divFoot.style.display = "";
  imgFoot.src = "./desk-erro.png";
}

const divText = document.getElementById("QinpelDeskText");
addMsg("QinpelDsk Logger");

function getStringWithAtLeastSizeOf(prefix, value, size) {
  var result = value + "";
  while (result.length < size) {
    result = prefix + result;
  }
  return result;
}

function getMsgTime() {
  const time = new Date();
  return (
    getStringWithAtLeastSizeOf("0", time.getHours(), 2) +
    ":" +
    getStringWithAtLeastSizeOf("0", time.getMinutes(), 2) +
    ":" +
    getStringWithAtLeastSizeOf("0", time.getSeconds(), 2) +
    "." +
    getStringWithAtLeastSizeOf("0", time.getMilliseconds(), 3)
  );
}

function addMsg(message) {
  const divTime = document.createElement("div");
  divTime.className = "QinpelDeskTextMessageTime";
  divTime.innerText = getMsgTime();
  const divStatus = document.createElement("div");
  divStatus.className = "QinpelDeskTextMessageStatus";
  divStatus.innerText = message;
  const divMessage = document.createElement("div");
  divMessage.className = "QinpelDeskTextMessage";
  divMessage.append(divTime);
  divMessage.append(divStatus);
  divText.append(divMessage)
  divText.scrollTo(0, divText.scrollHeight);
}

function putLoadMsg(message) {
  addMsg(message);
  showLoad();
}

function putInfoMsg(message) {
  addMsg(message);
  showInfo();
}

function putErroMsg(message) {
  addMsg(message);
  showErro();
}
