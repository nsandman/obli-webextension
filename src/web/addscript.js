(function() {
    var editor;

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        createEditor();
        events();

        let scriptname = document.getElementById("scriptname");

        if ("r" in getUrlVars()) {
            chrome.runtime.sendMessage({
                "event": "getscripts"
            }, (res) => {
                let currObj = Object.entries(res)[parseInt(getUrlVars()["r"])];

                document.title = "obli - " + currObj[0];
                scriptname.value = currObj[0];
                editor.setValue(currObj[1]);
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

