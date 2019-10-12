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
        document.getElementById("save").addEventListener("click", () => {
            console.log("hello there")
            opts = {
                "domains": document.getElementById("domains").value,
                "testpages": document.getElementById("testpages").value,
                "enabled": document.getElementById("enabled").checked,
                "project": document.getElementById("project").value
            };

            chrome.runtime.sendMessage({
                "event": "setopts",
                "script": currObj[0],
                "data": opts
            });
        });

        chrome.runtime.sendMessage({
            "event": "getopts",
            "script": currObj[0]
        }, (options) => {
            const iterableOptions = Object.entries(options);
            for (opt of iterableOptions) {
                console.log(opt[0])
                let optDisplay = document.getElementById(opt[0]);

                optDisplay.value = opt[1];
                optDisplay.checked = opt[1];
            }
        });
    });
});
