let naEnabled = false;
let managedWindow = -1;
let managedTabs   = [];

function getAllOfPrefix(prefix, callback, defaultValue=null) {
    // get all local storage with null
    chrome.storage.local.get(null, (items) => {
        let scripts = {};
        const aItems = Array.from(Object.entries(items));

        for (item of aItems) {
            if (item[0].substring(0, 8) == prefix) 
                scripts[item[0].substring(8)] = items[item[0]];
        }
        callback(scripts);
    });
    return true;
}

function saveRaw(options, prefix="", callback=function(x){}) {
    let optionsCopy = options;

    if (prefix && optionsCopy) {
        let optionKeys = Object.keys(optionsCopy);
        for (key of optionKeys)
            optionsCopy.renameProperty(key, prefix + key);
    }

    chrome.storage.local.set(optionsCopy, callback);
    return true;
}

function getRaw(name, callback=function(x){}, prefix="", defaultValue=null) {
    const fullName = prefix + name; 

    chrome.storage.local.get(fullName, (item) => {
        if (!(fullName in item) && defaultValue) {
            let opts = {};
            opts[fullName] = defaultValue;

            chrome.storage.local.set(opts, () => {
                callback(defaultValue);
            });
        } else {
            callback(item[fullName]);
        }
    });
    return true;
}

function removeRaw(name, prefix="", callback=function(x){}) {
    chrome.storage.local.remove(prefix + name, callback);
    return true;
}

chrome.storage.local.get("dispatcher", (dispatcher) => {
    let dispatchSocket = io(dispatcher["dispatcher"]);

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
    dispatchSocket.on("event", (data) => {
        managedTabs.forEach((tabId) => {
            chrome.tabs.sendMessage(tabId, {
                event: "msggot",
                data: data 
            });
        });
    });

    chrome.windows.onRemoved.addListener((win) => {
        if (managedWindow == win)
            managedWindow = -1;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.windowId == managedWindow) {
            if (!managedTabs.includes(tabId))
                managedTabs.push(tabId);

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
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        managedTabs.remove(tabId);
    });

    chrome.runtime.onMessage.addListener((req, sender, response) => {
        const data = req.data;
        switch (req.event) {
            case "ismanagedwindow":
                chrome.windows.getCurrent((win) => {
                    response(managedWindow == win.id);
                });
                return true;

            /*
            {
                event: "save_raw",
                data: {
                    prefix: str,
                    options: obj
                }
            }
             */
            case "save_raw": return saveRaw(data["options"], prefix=data["prefix"], callback=response);

            /*
            {
                event: "createproj_file",
                data: {
                    name: str,
                    zip: Blob
                }
            }
             */
            case "createproj_file": {
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
                                        opts[Prefixes.script + name] = data;
                                        opts[Prefixes.options + name] = JSON.parse(options);

                                        chrome.storage.local.set(opts);
                                    });
                                });
                            }
                        });

                        let fspOpts = {};
                        fspOpts[Prefixes.project + req.data.name] = projNames;

                        chrome.storage.local.set(fspOpts, () => response("ok"));
                    });
                return true;
            }

            case "checkna": response(naEnabled); break;
            case "naServerEvent": {
                naSocket.emit("event", req.data, response); 
                return true;
            }

            // GET ALL events: get all scripts that start with a certain prefix
            case "getscripts":  return getAllOfPrefix(Prefixes.script,  response);
            case "getprojects": return getAllOfPrefix(Prefixes.project, response);

            case "getscriptproject": {
                return getAllOfPrefix(Prefixes.project, (projects) => {
                    let result = null;
                    const projectsIterable = Object.entries(projects);

                    for (project of projectsIterable) {
                        if (project[1].includes(data)) {
                            result = project[0];
                            break;
                        }
                    }
                    response(result);
                });
            }

            /*
            {
                event: "saveprojectoptions",
                data: {
                    project: str,
                    scripts: str[]
                }
            }
            */
            case "saveprojectoptions": {
                let opts = {};
                opts[data.project] = data.scripts;

                return saveRaw(opts, Prefixes.project, response);
            }

            /*
            {
                event: "setopts",
                data: {
                    project: script,
                    scripts: obj
                }
            }
            */
            case "setopts": {
                let opts = {};
                opts[data.script] = data.data;

                return saveRaw(opts, Prefixes.options, response);
            }

            /*
            {
                event: "saveDSKey",
                data: {
                    parent: str,        // script to edit DS key data for
                    data: obj
                }
            }
            */
            case "saveDSKey": {
                const returnDsKey = (currentOpts) => {
                    let opts = {};
                    opts[data.parent] = {...currentOpts, ...data.data};

                    saveRaw(opts, Prefixes.dataStore, response);
                }

                return getRaw(
                    data["parent"],
                    callback=returnDsKey,
                    prefix=Prefixes.dataStore
                );
            }

            /*
            {
                event: "getDSKey",
                data: {
                    parent: str,        // script to edit DS key data for
                    data:str
                }
            }
            */
            case "getDSKey": {
                const returnSelectedKey = (res) => {
                    response(res[data.data]);
                };

                return getRaw(
                    data["parent"],
                    callback=returnSelectedKey,
                    prefix=Prefixes.dataStore
                );
            }

            /* RAW GET events: data is a string */
            case "getopts":
                return getRaw(
                    data, 
                    response, 
                    prefix=Prefixes.options, 
                    defaultValue={
                        "enabled": true,
                        "domains": "",
                        "testpages": ""
                    });

            case "getscript": return getRaw(data, response, prefix=Prefixes.script);
            case "getproperty": return getRaw(data, response);
            /* end GET RAW events */

            /*
             {
                event: "testpage",
                data: {
                    url: Url,
                    left: int,      // left offset
                    width: int
                }
             }
             */
            case "testpage": {
                if (managedWindow == -1) {
                    chrome.windows.create({
                        ...data,
                        focused: true,
                        setSelfAsOpener: true
                    }, (win) => {
                        managedWindow = win.id;
                        for (tab of win.tabs)
                            chrome.tabs.update(tab.id, {});
                        response();
                    });
                }
                else {
                    chrome.tabs.create({
                        active: true,
                        windowId: managedWindow,
                        url: data["url"]
                    }, response);
                }
                return true;
            }

            case "rmscript": {
                return getAllOfPrefix(Prefixes.project, (projects) => {
                    let projectsUpdated = projects;

                    const projectsIterable = Object.entries(projects);

                    // [0]=name, [1]=scripts
                    for (project of projectsIterable) {
                        if (project[1].includes(data)) {
                            projects[project[0]] = project[1].remove(data);
                        } 
                        else {
                            delete projects[project[0]];
                        }
                    }

                    saveRaw(projects, prefix=Prefixes.project);
                    removeRaw(data, prefix=Prefixes.script);
                    removeRaw(data, prefix=Prefixes.options, callback=response);
                });
            }

            case "rmproject": return removeRaw(data, prefix=Prefixes.project, callback=response);
            case "dlproject": {
                const zipDl = (scripts) => {
                    const cZip = new JSZip();

                    const ourScripts = scripts.map(x => Prefixes.script + x);
                    const ourPrefs   = scripts.map(x => Prefixes.options + x);

                    chrome.storage.local.get(ourScripts.concat(ourPrefs), (codes) => {
                        const codesIterable = Object.entries(codes);
                        for (code of codesIterable) {
                            const thisCode = (typeof code[1] === "string") ? code[1] : JSON.stringify(code[1]);
                            cZip.file(
                                code[0].substring(8) 
                                    + 
                                    ((code[0].substring(0, 8) == Prefixes.script) ? ".obli.js" : ".obli.json"),
                                thisCode
                            );
                        }

                        cZip.generateAsync({type:"blob"})
                            .then(function(content) {
                                chrome.downloads.download({
                                    "url": URL.createObjectURL(content),
                                    "filename": data + ".obli"
                                });
                            });
                    });
                };

                return getRaw(data, zipDl, Prefixes.project);
            }

            case "msgsend": {
                dispatchSocket.emit("event", data, response);
                return true;
            }

            // ignore these so other scripts can have handlers
            case "msggot":
            case "testconsole":
                break;
            
            default: {
                response("ERR: Unknown request");
                break;
            }
        }
    });
});
