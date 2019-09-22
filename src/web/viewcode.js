// https://html-online.com/articles/get-url-parameters-javascript/
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({
        "event": "getscripts"
    }, (res) => {
        let currObj = Object.entries(res)[parseInt(getUrlVars()["r"])];

        document.getElementById("name").innerHTML = currObj[0];
        document.getElementById("main").innerHTML = currObj[1];
    });
});
