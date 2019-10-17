let editor;

function saveEditorContent() {
    let script = editor.getValue();
    let sname  = scriptname.value;

    let options = {};
    options[sname] = script;

    chrome.runtime.sendMessage({
        event: "save_raw",
        data: {
            prefix: Prefixes.script,
            options: options
        }
    }, (res) => {
        console.log("Script saved");
    });
}


function createEditor() {
    if (!editor) {
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/javascript");
        editor.setKeyboardHandler("ace/keyboard/vim");
        ace.config.loadModule("ace/keyboard/vim", function(module) {
            const vim = module.CodeMirror.Vim;

            // :w calls save command
            vim.defineEx("write", "w", function(cm, input) {
                cm.ace.execCommand("saveFile");
            });

            // currently broken because ace moveText is not working
            vim.defineEx("move", "m", function(cm, input) {
                const toLine = parseInt(input.args[0]);
                const currLine = editor.getCursorPosition().row;
                editor.moveText(
                    {row: currLine, column: 0},
                    {row: toLine, column: 0}
                );
            });
        });

        // save commands
        document.getElementById("button").addEventListener("click", saveEditorContent); 
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

function populateEditor(name) {
    chrome.runtime.sendMessage({
        event: "getscript",
        data: name
    }, (script) => {
        if (script) {
            editor.insert(script);
            editor.gotoLine(0);
            editor.focus();
        }
    });
}

function populateScriptNames(name) {
    document.title = "obli - " + name;
    document.getElementById("scriptname").value = name;
    document.getElementById("namehere").innerHTML = name;
    document.getElementById("obliversion").innerHTML += chrome.runtime.getManifest().version;
}

function addTestSiteShortcuts(name) {
    const span = document.getElementsByClassName("close")[0];
    const modal = document.getElementById("myModal");

    const keyOrder = "`1234567890qwertyuiop[]asdfghjkl;zxcvbnm,.";
    chrome.runtime.sendMessage({
        event: "getopts",
        data: name 
    }, (options) => {
        tests = options["testpages"].split("|");
        tests.unshift("about:blank");

        const testPages = document.getElementById("pages");
        for (let i = 0; i < tests.length; i++) {
            const row = testPages.insertRow(i);

            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);

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
                        }, () => span.click());
                    else if (e.key == "Escape")
                        span.click();
                }
            });

            cell0.innerHTML = "<strong>" + keyOrder[i] + "</strong>";
            cell1.innerHTML = tests[i];
        }
    });

    const showTesting = () => {
        modal.style.display = "block";
        span.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    document.getElementById("run").addEventListener("click", showTesting);
    chrome.commands.onCommand.addListener((command) => {
        if (command == "show_dialog")
            showTesting();
    });
}

function setHtmlStyleFromMsgType(msgType) {
    let style = {
        color: "inherit",
        emoji: "&#x270F;&#xFE0F" 
    };

    switch (msgType) {
        case 1:         // status
            style.color = "#4684ED"; 
            style.emoji = "&#x2139;&#xFE0F"; 
            break;
        case 2:         // error
            style.color = "#D54133"; 
            style.emoji = "&#x1F6D1;"; 
            break;
        case 3:         // warning
            style.color = "#D59B0A"; 
            style.emoji = "&#x26A0;&#xFE0F;"; 
            break;
    }
    return style;
}

function addLoggingListener(name) {
    const testConsole = document.getElementById("conscroll");
    chrome.runtime.onMessage.addListener((req, sender, response) => {
        if (req.event == "testconsole" && req.data.script == name) {
            const scriptStyle = setHtmlStyleFromMsgType(req.data.messageType);

            const logPre = document.createElement("pre");
            logPre.style.margin = 0;
            logPre.style.color  = scriptStyle.color;

            logPre.innerHTML = ` ${scriptStyle.emoji} ${req.data.message}`;

            testConsole.appendChild(logPre);
            testConsole.scrollTop = testConsole.scrollHeight;   // scroll to bottom
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    createEditor();

    if ("name" in getUrlVars()) {
        const name = getUrlVars()["name"];

        populateEditor(name);
        populateScriptNames(name);
        addTestSiteShortcuts(name);
        addLoggingListener(name);
    }
});
