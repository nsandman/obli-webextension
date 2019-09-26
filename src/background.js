chrome.storage.local.get("dispatcher", (item) => {
    let dispatchSocket = io(item["dispatcher"]);

    chrome.runtime.onMessage.addListener((req, sender, response) => {
        switch (req.event) {
            case "saveproperties":
            case "savescript":
                chrome.storage.local.set(req.options);
                break;

            case "getscripts":
                // get all local storage with null
                chrome.storage.local.get(null, (items) => {
                    let scripts = {};
                    const aItems = Array.from(Object.entries(items));
                    
                    for (item of aItems) {
                        if (item[0].substring(0, 8) == "_script_") 
                            scripts[item[0].substring(8)] = items[item[0]];
                    }
                    response(scripts);
                });
                return true;

            case "getscript":
                chrome.storage.local.get("_script_" + req.script, (item) => {
                    response(item);
                });
                return true;

            case "rmscript":
                chrome.storage.local.get(null, (items) => {
                    let objectIterable = Object.entries(items)[req.script];
                    chrome.storage.local.remove("_script_" + objectIterable[0], () => {
                        response("ok");
                    });
                });
                return true;

            case "getproperty":
                chrome.storage.local.get(req.data, (item) => {
                    response(item[req.data]);
                });
                return true;

            case "msgsend":
                dispatchSocket.emit("event", request.data, (res) => {
                    response(res);
                });
                return true;

            case "msglisten":
                dispatchSocket.on(request.data.event, request.data.cb);
                break;
            
            default:
                response("ERR: Unknown request");
                break;
        }
    });
});

