(function() {
    var editor;

    document.addEventListener("DOMContentLoaded", init); 

    function init() {
        createEditor();
        events();

        let span = document.getElementsByClassName("close")[0];

        let modal = document.getElementById("myModal");
        let scriptname = document.getElementById("scriptname");

        if ("r" in getUrlVars()) {
            chrome.runtime.sendMessage({
                "event": "getscripts"
            }, (res) => {
                let currObj = Object.entries(res)[parseInt(getUrlVars()["r"])];

                const keyOrder = "`1234567890qwertyuiop[]asdfghjkl;zxcvbnm,.";
                const testPages = document.getElementById("pages");
                chrome.runtime.sendMessage({
                    "event": "getopts",
                    "script": currObj[0]
                }, (options) => {
                    tests = options["testpages"].split("|");
                    tests.unshift("about:blank");

                    for (let i = 0; i < tests.length; i++) {
                        let row = testPages.insertRow(i);

                        let cell0 = row.insertCell(0);
                        let cell1 = row.insertCell(1);

                        document.addEventListener("keydown", (e) => {
                            if (modal.style.display != "none") {
                                if (e.key == keyOrder[i])
                                    chrome.runtime.sendMessage({
                                        "event": "testpage",
                                        "data": {
                                            "script": parseInt(getUrlVars()["r"]),
                                            "url": tests[i],
                                            "x": window.outerWidth,
                                            "width": window.screen.width - window.outerWidth
                                        }
                                    }, () => {
                                        modal.style.display = "none";
                                    });
                                else if (e.key == "Escape")
                                    span.click();
                            }
                        });

                        cell0.innerHTML = "<strong>" + keyOrder[i] + "</strong>";
                        cell1.innerHTML = tests[i];
                    }
                });

                document.title = "obli - " + currObj[0];
                scriptname.value = currObj[0];
                editor.setValue(currObj[1]);

                document.getElementById("run").addEventListener("click", function() {
                    modal.style.display = "block";
                    span.addEventListener("click", () => { 
                        modal.style.display = "none";
                    });
                });
            });
        }

        document.getElementById("button").addEventListener("click", function() {
            let script = editor.getValue();
            let sname  = scriptname.value;

            let options = {};
            options["_script_" + sname] = script;
            chrome.runtime.sendMessage({
                "event": "savescript",
                "options": options
            }, (res) => {
                console.log("Script saved");
            });
        });

    }

    // https://html-online.com/articles/get-url-parameters-javascript/
    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }

    function createEditor() {
        if (!editor) {
            editor = ace.edit("editor");
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/javascript");
            editor.setKeyboardHandler("ace/keyboard/vim");
        }
    }

    function events() {
        document.getElementById("run").onclick = runCode;
    }

    function runCode() {
        var sanitizedValue = editor.getValue().replace(/\n/g, '').replace(/'/g, '\"');
        var code = "var script = document.createElement('script');script.textContent = '" + sanitizedValue + "';document.body.appendChild(script);";
        chrome.tabs.executeScript({
            code: code
        });
    }
})();

