document.addEventListener("DOMContentLoaded", function() {
    function __setNative(element, attribute, value) {
        const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, attribute) || {};
        const prototype = Object.getPrototypeOf(element);
        const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, attribute) || {};

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value)
        } else if (valueSetter) {
            valueSetter.call(element, value)
        } else {
            throw new Error("The given element does not have a value setter")
        }

        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
    }


    const Action = {
        // click(DOMElement el)
        click: function(el, next) {
            el.click();
            next();
        },

        // setTextValue(DOMElement el, string val)
        setTextValue: function(el, val, next) {
            __setNative(el, "value", val); 
            next();
        },

        // setCheckValue(DOMElement el, bool val)
        setCheckValue: function(el, val, next) {
            __setNative(el, "checked", val);
            next();
        },

        // clear(DOMElement el)
        clear: function(el, next) {
            this.setTextValue(el, "");
            next();
        },

        uploadFile: function(el, path, next) {
            const obliId = "o" + Date.now();
            el.setAttribute("obli-id", obliId);

            chrome.runtime.sendMessage({
                event: "localServerEvent",
                data: {
                    method: "core",
                    name: "uploadFile",
                    data: {
                        path: path,
                        "obli-id": obliId
                    }
                }
            }, next);
        }
    };

    function baseprint(name, type, tolog) {
        chrome.runtime.sendMessage({
            event: "testconsole",
            data: {
                script: name,
                messageType: type,
                message: tolog
            }
        });
    }

    //------------ Get & process injections -------------------------
    chrome.runtime.sendMessage({event: "getscripts"}, (scripts) => {
        // perform script injections
        let injections = Object.entries(scripts);

        for (var i = 0; i < injections.length; i++) {
            let sandbox = {};
            const TPI = {
                myName: injections[i][0].slice(0),
                myProject: null,
                isTesting: false
            };
            chrome.runtime.sendMessage({
                event: "getscriptproject",
                data: TPI.myName
            }, (projName) => {
                TPI.myProject = projName;
            });

            let eventListeners = {};
            chrome.runtime.onMessage.addListener((req, sender, response) => {
                switch (req.event) {
                    case "msggot": {
                        if (req.data["me"] == (TPI.myProject || TPI.myName))
                            eventListeners[req.data["event"]](req.data["data"]);
                        break;
                    }
                }
            });


            const DataStore = {
                // saveKey(string key, obj val, function next())
                saveKey: function(key, val, next) {
                    let options = {};
                    options[key] = val;

                    this.saveKeys(options, next);
                },

                saveKeys: function(options, next) {
                    if (next == null) next = function(){};

                    chrome.runtime.sendMessage({
                        event: "saveDSKey",
                        data: {
                            parent: TPI.myName,
                            data: options
                        }
                    }, next);
                },

                getKeys: function(keys, next) {
                    let keyMap = {};

                    if (typeof keys === "string")
                        return this.getKey(keys, (res) => {
                            let opts = {};
                            opts[keys] = res;

                            next(opts);
                        });

                    for (let i = keys.length-1; i >= 0; i--) {
                        const keyName = keys[i];

                        this.getKey(keyName, (res) => {
                            keyMap[keyName] = res;
                            if (i == 0)
                                next(keyMap);
                        });
                    }
                },

                // getKeys(string key, function(results))
                getKey: function(key, next) {
                    chrome.runtime.sendMessage({
                        event: "getDSKey",
                        data: {
                            parent: TPI.myName,
                            data: key
                        }
                    }, next);
                }
            };

            // same API as DataStore
            const SharedDataStore = {
                __doGetSet: function(key) {
                    Messenger.listen("get_" + key, (data, cb) => {
                        DataStore.getKeys(key, (r) => {
                            cb(r);
                        });
                    });
                    Messenger.listen("set_" + key, (data) => {
                        DataStore.saveKey(key, data["value"]);
                    });
                },

                saveKey: function(key, val, next) {
                    this.__doGetSet(key);
                    DataStore.saveKey(key, val, next);
                },

                saveKeys: function(options, next) {
                    for (key of Object.keys(options)) {
                        this.__doGetSet(key);
                    }
                    DataStore.saveKeys(options, next);
                },
                getKey: DataStore.getKey
            };

            const Messenger = {
                // send(string method, object data, (optional)function callback)
                send: function(method, data, cb) {
                    return chrome.runtime.sendMessage({
                        event: "msgsend",
                        data: {
                            module: (TPI.myProject || TPI.myName),
                            name: method,
                            data: data
                        }
                    }, cb);
                },

                // listen(string method, function cb)
                listen: function(method, cb) {
                    eventListeners[method] = cb;
                    //chrome.runtime.sendMessage({
                        //event: "msglisten",
                        //data: {
                            //method: method,
                            //me: TPI.myName
                        //}
                    //}, (serializedSocket) => {
                        //const deserializedSocket = JSON.parse(serializedSocket);
                        //console.dir(deserializedSocket);
                    //});
                }
            };

            const code = injections[i][1];
            chrome.runtime.sendMessage({
                event: "getoblisettings"
            }, (settings) => {
                eval("sandbox = {" + settings.apis + "}");

                chrome.runtime.sendMessage({
                    event: "ismanagedwindow"
                }, (isTesting) => {
                    TPI.isTesting = isTesting;
                    if (isTesting) {
                        sandbox.console = {
                            log: (tolog) => baseprint(TPI.myName, 0, tolog),
                            dir: (tolog) => baseprint(TPI.myName, 0, JSON.stringify(tolog)),
                            info: (tolog) => baseprint(TPI.myName, 1, tolog),
                            error: (tolog) => baseprint(TPI.myName, 2, tolog),
                            warn: (tolog) => baseprint(TPI.myName, 3, tolog)
                        };

                        window.addEventListener("error", e => {
                            if (e.type == "error")
                                sandbox.console.error(`ERROR: '${TPI.myName}'@${e.lineno}:${e.colno}: ${e.message}`);
                            else if (e.type == "warning")
                                sandbox.console.warn(`WARNING: '${TPI.myName}'@${e.lineno}:${e.colno}: ${e.message}`);
                        });        
                    }

                    chrome.runtime.sendMessage({
                        event: "getopts",
                        data: TPI.myName 
                    }, (prefs) => {
                        const url = window.location.href;
                        const re  = new RegExp(prefs["domains"], "g");

                        if (prefs["enabled"] && url.match(re)) {
                            if (TPI.isTesting)
                                sandbox.console.info("<strong> --- INFO: Loading script '" + TPI.myName + "' at " + new Date().toLocaleTimeString() + " --- </strong>");
                            eval("with (sandbox) {" + code + "};");
                        }
                    });
                });
            });

            
        }
        return true;
    });
});
