document.addEventListener("DOMContentLoaded", () => {
    const dispatcherInput = document.getElementById("dispatcher");
    chrome.runtime.sendMessage({
        event: "getoblisettings"
    }, (res) => {
        const resIterable = Object.entries(res);

        // 0: name, 1: value
        for (const setting of resIterable) {
            const settingElement = document.getElementById(setting[0]);
            settingElement.value = setting[1];
        }
    });

    document.getElementById("savesettings").addEventListener("click", function() {
        const settingsToFetch = ["dispatcher", "apis"];
        let options = {};

        for (const setting of settingsToFetch) {
            const settingValue = document.getElementById(setting).value;
            options[setting] = settingValue;
        }

        chrome.runtime.sendMessage({
            event: "saveoblisettings", 
            data: options
        }, reload);            
    });

    document.getElementById("importsettings").addEventListener("change", (e) => {
        const input = e.target;

        const reader = new FileReader();        
        reader.onload = () => {
            chrome.runtime.sendMessage({
                event: "saveoblisettings",
                data: JSON.parse(reader.result)
            }, reload);
        };
        reader.readAsText(input.files[0]);
    });

    document.getElementById("exportsettings").addEventListener("click", function() {
        chrome.runtime.sendMessage({
            event: "getoblisettings"
        }, (settings) => {
            const stringSettings = JSON.stringify(settings);
            const blob = new Blob([stringSettings], {type: "application/x-obliconf"});
            chrome.downloads.download({
                url: URL.createObjectURL(blob),
                filename: "settings.obliconf"
            });
        });
    });
});
