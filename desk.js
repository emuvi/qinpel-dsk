const divText = document.getElementById("QinpelDeskText");
const divFoot = document.getElementById("QinpelDeskFoot");
const imgFootLoad = document.getElementById("QinpelDeskFootImgLoad");
const imgFootInfo = document.getElementById("QinpelDeskFootImgInfo");
const imgFootError = document.getElementById("QinpelDeskFootImgError");
var countImgFootLoad = 0;

addMsg("QinpelDsk Logger");
hideFoot();

function hideFoot() {
	divFoot.style.display = "none";
	imgFootLoad.style.visibility = "hidden";
	imgFootInfo.style.visibility = "hidden";
	imgFootError.style.visibility = "hidden";
}

function showLoad() {
	divFoot.style.display = "";
	imgFootLoad.style.visibility = "";
	countImgFootLoad++;
}

function hideLoad() {
	countImgFootLoad--;
	if (countImgFootLoad < 0) {
		console.log("Error: QinpelDsk Desk image loading was hide more than showed.");
		countImgFootLoad = 0;
	}
	if (countImgFootLoad == 0) {
		imgFootLoad.style.visibility = "hidden";
	}
}

function showInfo() {
	divFoot.style.display = "";
	imgFootInfo.style.visibility = "";
}

function showError() {
	divFoot.style.display = "";
	imgFootError.style.visibility = "";
}

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

function putLoadEnd() {
	hideLoad();
}

function putInfoMsg(message) {
	addMsg(message);
	showInfo();
}

function putErrorMsg(message) {
	addMsg(message);
	showError();
}

