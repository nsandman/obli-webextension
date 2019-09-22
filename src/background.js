chrome.runtime.onMessage.addListener((req, sender, response) => {
    switch (req.event) {
        case "savescript":
            chrome.storage.local.set(req.options, () => {
                console.log("Script saved");
            });
            break;

        case "getscripts":
            // get all local storage with null
            chrome.storage.local.get(null, (items) => {
                response(items);
            });
            return true;

        case "getscript":
            chrome.storage.local.get(req.script, (item) => {
                response(item);
            });
            return true;

        case "rmscript":
            chrome.storage.local.get(null, (items) => {
                let objectIterable = Object.entries(items)[req.script];
                chrome.storage.local.remove(objectIterable[0], () => {
                    response("ok");
                });
            });
            return true;

        default:
            response("ERR: Unknown request");
            break;
    }
});

