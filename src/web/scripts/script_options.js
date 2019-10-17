document.addEventListener("DOMContentLoaded", () => {
    const name = getUrlVars()["r"];

    document.getElementById("name").innerHTML = name;
    chrome.runtime.sendMessage({
        event: "getopts",
        data: name
    }, (options) => {
        console.dir(options);
        document.getElementById("save").addEventListener("click", () => {
            chrome.runtime.sendMessage({
                event: "setopts",
                data: {
                    script: name,
                    data: {
                        domains: document.getElementById("domains").value,
                        testpages: document.getElementById("testpages").value,
                        enabled: document.getElementById("enabled").checked
                    }
                }
            });
        });

        const iterableOptions = Object.entries(options);
        for (opt of iterableOptions) {
            console.log(opt[0])
            let optDisplay = document.getElementById(opt[0]);

            optDisplay.value = opt[1];
            optDisplay.checked = opt[1];
        }
    });
});
