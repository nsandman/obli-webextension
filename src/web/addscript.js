(function() {
    var editor;

    document.addEventListener("DOMContentLoaded", init); 

    function saveEditorContent() {
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
    }

    function init() {
        createEditor();

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
                            if (modal.style.display != "none" && modal.style.display) {
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
                                        span.click();
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

                let showTesting = () => {
                    modal.style.display = "block";
                    span.addEventListener("click", () => {
                        modal.style.display = "none";
                    });
                }
                document.getElementById("run").addEventListener("click", showTesting);
                chrome.commands.onCommand.addListener(function(command) {
                    if (command == "show_dialog")
                        showTesting();
                });
            });
        }

        document.getElementById("button").addEventListener("click", saveEditorContent); 
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
            ace.config.loadModule("ace/keyboard/vim", function(module) {
                const vim = module.CodeMirror.Vim;
                vim.defineEx("write", "w", function(cm, input) {
                    cm.ace.execCommand("saveFile");
                });
            });

            editor.commands.addCommand({
                name: "saveFile",
                bindKey: {
                    win: "Ctrl-S",
                    mac: "Command-S",
                    sender: "editor|cli"
                },
                exec: saveEditorContent
            });
        }
    }
})();

