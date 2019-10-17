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

    function initPageWithScriptName(name, script=null) {
        let span = document.getElementsByClassName("close")[0];
        let modal = document.getElementById("myModal");

        const keyOrder = "`1234567890qwertyuiop[]asdfghjkl;zxcvbnm,.";
        const testPages = document.getElementById("pages");
        chrome.runtime.sendMessage({
            "event": "getopts",
            "script": name 
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

        document.title = "obli - " + name;
        scriptname.value = name;
        document.getElementById("namehere").innerHTML = name;

        if (script) {
            editor.insert(script);
            editor.gotoLine(0);
        }

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
        chrome.runtime.onMessage.addListener((req, sender, response) => {
            switch (req.event) {
                case "testconsole":
                    if (req.data.script == name) {
                        let htmlData = "";
                        
                        // TODO make this not disgusting
                        htmlData = "<pre style='margin:0;color: "; 
                        switch (req.data.messageType) {
                            case 1:         // status
                                htmlData += "#4684ED'> &#x2139;&#xFE0F ";
                                break;
                            case 2:         // error
                                htmlData += "#D54133'> &#x1F6D1; ";
                                break;
                            case 3:         // warning
                                htmlData += "#D59B0A'> &#x26A0;&#xFE0F; ";
                                break;
                            default:
                                htmlData += "inherit'> &#x270F;&#xFE0F ";
                                break;
                        }
                        htmlData += req.data.message;

                        if (req.data.messageType) {
                            htmlData += "</pre>";
                        }
                        testConsole.innerHTML += htmlData;
                        testConsole.scrollTop = testConsole.scrollHeight;   // scroll to bottom
                    }
                    break;
            }        
        });
    }

    let testConsole;
    function init() {
        createEditor();

        testConsole = document.getElementById("conscroll");
        let scriptname = document.getElementById("scriptname");

        if ("r" in getUrlVars()) {
            const name = getUrlVars()["r"];

            chrome.runtime.sendMessage({
                "event": "getscripts"
            }, (res) => {
                let currObj = Object.entries(res)[parseInt(getUrlVars()["r"])];
                initPageWithScriptName.apply(this, currObj);
            });
        }
        else if ("name" in getUrlVars()) {
            initPageWithScriptName(getUrlVars()["name"]);
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
                vim.defineEx("move", "m", function(cm, input) {
                    const toLine = parseInt(input.args[0]);
                    const currLine = editor.getCursorPosition().row;
                    editor.moveText(
                        {row: currLine, column: 0},
                        {row: toLine, column: 0}
                    );
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

