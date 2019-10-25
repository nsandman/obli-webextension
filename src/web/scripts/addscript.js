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
        ace.require("ace/ext/language_tools");
        editor = ace.edit("editor");
        editor.setTheme("ace/theme/monokai");

        editor.getSession().setMode("ace/mode/javascript");
        editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true
        });

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

function clearHash() {
    if (window.location.hash)
        window.location.hash = "";
}
function hideTesting(modal) {
    modal.style.display = "none";
    editor.focus();
    clearHash();
}
function showTesting(modal, closeButton) {
    modal.style.display = "block";
    window.location.hash = "#" + modal.id;
    closeButton.addEventListener("click", () => hideTesting(modal));
}

function launchTest(test, modal) {
    chrome.runtime.sendMessage({
        event: "testpage",
        data: {
            url: test,
            left: window.outerWidth,
            width: window.screen.width - window.outerWidth
        }
    }, () => hideTesting(modal));
}

function addTestSiteShortcuts(name) {
    const modal       = document.getElementById("testmodal");
    const closeButton = document.getElementById("closemodal");

    // Order of shortcut keys to open a test page
    const keyOrder = "`1234567890qwertyuiop[]asdfghjkl;zxcvbnm,.".split("");
    chrome.runtime.sendMessage({
        event: "getopts",
        data: name 
    }, (options) => {
        let tests = options["testpages"].split("|");
        tests.unshift("about:blank");

        const testPages = document.getElementById("pages");
        for (let i = 0; i < tests.length; i++) {
            const row = testPages.insertRow(i);

            row.style.cursor = "pointer";
            row.addEventListener("click", (e) => launchTest(tests[i], modal));

            const cell0 = row.insertCell(0);
            const cell1 = row.insertCell(1);
            const cell2 = row.insertCell(2);

            cell1.style.maxWidth  = "1px";
            cell2.style.textAlign = "right";

            cell0.innerHTML = "<strong>" + keyOrder[i] + "</strong>";
            cell1.innerHTML = tests[i];
            cell2.innerHTML = "<i class='fas fa-arrow-right'></i>";
        }

        document.addEventListener("keydown", (e) => {
            if (modal.style.display != "none" && modal.style.display) {
                if (e.key == "Escape")
                    hideTesting(modal);
                else if (keyOrder.includes(e.key)) {
                    const siteNumber = keyOrder.indexOf(e.key);
                    if (siteNumber < tests.length)
                        launchTest(tests[siteNumber], modal);
                }
            }
        });
    });

    document.getElementById("run").addEventListener("click", () => showTesting(modal, closeButton));
    chrome.commands.onCommand.addListener((command) => {
        if (command == "show_dialog")
            showTesting(modal, closeButton);
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

            logPre.innerHTML = ` ${scriptStyle.emoji} ${escapeHtml(req.data.message)}`;

            testConsole.appendChild(logPre);
            testConsole.scrollTop = testConsole.scrollHeight;   // scroll to bottom
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    createEditor();

    // clear hash so modal can be "focused" later
    clearHash();

    if ("name" in getUrlVars()) {
        const name = getUrlVars()["name"];

        populateEditor(name);
        populateScriptNames(name);
        addTestSiteShortcuts(name);
        addLoggingListener(name);
    }
});
