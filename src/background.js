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
            case "ismanagedwindow":
                chrome.windows.getCurrent((win) => {
                    response(managedWindows.includes(win.id));
                });
                return true;

            case "saveproject":
            case "saveproperties":
            case "savescript":
                chrome.storage.local.set(req.options);
                break;

            case "createproj_file":
                JSZip.loadAsync(req.data.zip)
                    .then((zip) => {
                        let projNames = [];
                        zip.forEach((relativePath, file) => {
                            const name = relativePath.replace(".obli.js", "");

                            if (!name.includes("/") && (relativePath.includes(".obli.js") && !relativePath.includes(".obli.json"))) {
                                projNames.push(name);

                                zip.file(name + ".obli.json").async("string").then((options) => {
                                    file.async("string").then((data) => {
                                        let opts = {};
                                        opts["_script_" + name] = data;
                                        opts["_meta___" + name] = JSON.parse(options);

                                        chrome.storage.local.set(opts);
                                    });
                                });
                            }
                        });

                        let fspOpts = {};
                        fspOpts["_proj___" + req.data.name] = projNames;

                        chrome.storage.local.set(fspOpts, () => response("ok"));
                    });
                return true;

            case "checkna":
                response(naEnabled);
                break;
            case "naServerEvent":
                naSocket.emit("event", req.data, response); 
                //if (naEnabled)
                    //naSocket.emit(data["name"], data["data"], (res) => {
                        //response(res);
                    //});
                return true;

            case "getscripts":
                // get all local storage with null
                chrome.storage.local.get(null, (items) => {
                    let scripts = {};
                    const aItems = Array.from(Object.entries(items));
                    console.dir(aItems);

                    for (item of aItems) {
                        if (item[0].substring(0, 8) == "_script_") 
                            scripts[item[0].substring(8)] = items[item[0]];
                    }
                    response(scripts);
                });
                return true;

            case "getprojects":
                chrome.storage.local.get(null, (items) => {
                    let scripts = {};
                    const aItems = Array.from(Object.entries(items));
                    
                    for (item of aItems) {
                        if (item[0].substring(0, 8) == "_proj___") 
                            scripts[item[0].substring(8)] = items[item[0]];
                    }
                    response(scripts);
                });
                return true;

            case "saveprojectoptions":
                let spOpts = {};
                spOpts["_proj___" + req.data.project] = req.data.scripts;

                chrome.storage.local.set(spOpts);
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
                            "testpages": "",
                            "project": ""
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
                        const prefix = objectIterable[i][0].substring(0, 8);
                        const rsName = objectIterable[req.script][0].substring(8);

                        if (
                            prefix == "_proj___" && 
                            objectIterable[i][1].includes(rsName)
                        ) {
                            objectIterable[i][1].splice(objectIterable[i][1].indexOf(rsName), 1);

                            let fixProjOpts = {};
                            fixProjOpts[objectIterable[i][0]] = objectIterable[i][1];

                            chrome.storage.local.set(fixProjOpts);
                        }

                        if (prefix != "_script_")
                            objectIterable.splice(i, 1);
                    }

                    chrome.storage.local.remove([
                        objectIterable[req.script][0], 
                        objectIterable[req.script][0].replace("_script_", "_meta___")
                    ], () => {
                        response("ok");
                    });
                });
                return true;

            case "rmproject":
                chrome.storage.local.remove("_proj___" + req.data, () => {
                    response("ok");
                });
                return true;

            case "dlproject":
                let cZip = new JSZip();
                chrome.storage.local.get("_proj___" + req.data, (scripts) => {
                    console.dir(scripts)
                    const ourScripts = scripts["_proj___" + req.data].map(x => "_script_" + x);
                    const ourPrefs   = ourScripts.map(x => x.replace("_script_", "_meta___"));

                    chrome.storage.local.get(ourScripts.concat(ourPrefs), (codes) => {
                        const codesIterable = Object.entries(codes);
                        for (code of codesIterable) {
                            const thisCode = (typeof code[1] === "string") ? code[1] : JSON.stringify(code[1]);
                            cZip.file(
                                code[0].substring(8) 
                                    + 
                                    ((code[0].substring(0, 8) == "_script_") ? ".obli.js" : ".obli.json"),
                                thisCode
                            );
                        }

                        cZip.generateAsync({type:"blob"})
                            .then(function(content) {
                                chrome.downloads.download({
                                    "url": URL.createObjectURL(content),
                                    "filename": req.data + ".obli"
                                });
                            });
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
            
            case "testconsole":
                break;

            default:
                response("ERR: Unknown request");
                break;
        }
    });
});

