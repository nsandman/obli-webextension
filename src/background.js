let naEnabled = false;
let managedWindows = [];

chrome.storage.local.get("dispatcher", (item) => {
    const dispatchSocket = io(item["dispatcher"]);

    let naSocket;
    try {
        naSocket = io("http://localhost:5726");
        naEnabled = true;
    } catch (e) {
        naSocket = null;
    }

    dispatchSocket.on("open_url", (data) => {
        chrome.tabs.create(data);
    });

    chrome.windows.onRemoved.addListener((win) => {
        if (managedWindows.includes(win.id)) {
            const idIndex = managedWindows.indexOf(win.id);
            managedWindows.splice(idIndex, 1);
        }
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (managedWindows.includes(tab.windowId)) {
            chrome.browserAction.setIcon({
                path: "../images/bug.png",
                tabId: tabId
            }, () => {
                chrome.browserAction.setBadgeText({
                    text: "TEST",
                    tabId: tabId
                });
            });
        }
    });

    chrome.runtime.onMessage.addListener((req, sender, response) => {
        switch (req.event) {
            case "saveproperties":
            case "savescript":
                chrome.storage.local.set(req.options);
                break;

            case "checkna":
                response(naEnabled);
                break;
            case "naServerEvent":
                const data = req["data"];
                if (naEnabled)
                    naSocket.emit(data["name"], data["data"], (res) => {
                        response(res);
                    });
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

            case "getopts":
                const scriptName = "_meta___" + req.script;
                chrome.storage.local.get(scriptName, (item) => {
                    if (!(scriptName in item)) {
                        const defaults = {
                            "enabled": true,
                            "domains": "",
                            "testpages": ""
                        };        

                        let opts = {};
                        opts[scriptName] = defaults;

                        chrome.storage.local.set(opts, () => {
                            response(defaults);
                        });
                    } else {
                        response(item[scriptName]);
                    }
                });
                return true;

            case "testpage":
                const testData = req.data;
                chrome.windows.create({
                    "url": testData["url"],
                    "left": testData["x"],
                    "width": testData["width"],
                    "focused": true,
                    "setSelfAsOpener": true
                }, (win) => {
                    managedWindows.push(win.id);
                    for (tab of win.tabs)
                        chrome.tabs.update(tab.id, {});
                    response();
                }); 
                return true;

            case "setopts":
                let opts = {};
                opts["_meta___" + req.script] = req.data;
                chrome.storage.local.set(opts);
                break;

            case "rmscript":
                chrome.storage.local.get(null, (items) => {
                    let objectIterable = Object.entries(items);
                    for (let i = objectIterable.length; i--;) {
                        if (objectIterable[i][0].substring(0, 8) != "_script_") {
                            objectIterable.splice(i, 1);
                        }
                    }

                    console.dir(objectIterable)
                    chrome.storage.local.remove(objectIterable[req.script][0], () => {
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

