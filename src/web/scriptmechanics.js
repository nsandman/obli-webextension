document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("button").addEventListener("click", function() {
        console.log("test");

        let script = document.getElementById("scripttext").value;
        let sname  = document.getElementById("scriptname").value;

        console.log("name: " + sname);

        let options = {};
        options["_script_" + sname] = script;
        chrome.runtime.sendMessage({
            "event": "savescript",
            "options": options
        }, (res) => {
            console.log("Script saved");
        });
    });
});
