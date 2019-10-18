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
                "event": "naServerEvent",
                "data": {
                    "method": "core",
                    "name": "uploadFile",
                    "data": {
                        "path": path,
                        "obli-id": obliId
                    }
                }
            }, next);
        }
    };

    // alternative Action API
    let NaturalAction = null;
    chrome.runtime.sendMessage("checkna", (naEnabled) => {
        if (naEnabled)
            NaturalAction = {
                __randomInRange: function(min, max) {
                    return Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);
                },

                __sendMessage: function(method, data, cb, includeTimeout=true) {
                    const payload = {
                        "event": "naServerEvent",
                        "data": {
                            "method": "na",
                            "name": method
                        }
                    };
                    if (data)
                        payload["data"]["data"] = data;

                    if (cb) 
                        chrome.runtime.sendMessage(payload, () => {
                            const pauseTime = includeTimeout ? (Math.floor(Math.random() * 1500) + 1) : 0;
                            setTimeout(cb, pauseTime);
                        }); 
                    else 
                        chrome.runtime.sendMessage(payload);
                },

                __domToScreenPos: function(el) {
                    const jEl = $(el);

                    const offset     = jEl.offset();

                    //const scrollX = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft;
                    //const scrollY = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;

                    const compStyle = window.getComputedStyle(el, null);
                    const gapX = parseFloat(compStyle.getPropertyValue("padding-left")) + parseFloat(compStyle.getPropertyValue("margin-left"));
                    const gapY = parseFloat(compStyle.getPropertyValue("padding-right")) + parseFloat(compStyle.getPropertyValue("margin-right"));

                    // y-coord: we assume the browser chrome is entirely the toolbar at the top. in other words this probably will break if you have the downloads window up
                    return JSON.stringify({
                        x: parseInt((offset.left + window.screenX) + this.__randomInRange(gapX, gapX+jEl.width())),
                        y: parseInt(((offset.top + window.screenY) + (window.outerHeight - window.innerHeight)) + this.__randomInRange(gapY, gapY+jEl.height()))
                    });
                },

                click: function(el, next) {
                    this.__sendMessage("moveMouse", this.__domToScreenPos(el), () => {
                        this.__sendMessage("pressMouse", null, next);
                    }, false);
                },

                setTextValue: function(el, val, next) {
                    this.click(el, () => {
                        this.__sendMessage("type", val, next);
                    });
                },

                setCheckValue: function(el, val, next) {
                    if (el.checked != val)
                        return this.click(el, next);
                    return next();
                },

                clear: function(el, next) {
                    this.click(el, () => {
                        this.__sendMessage("clear", null, next);
                    });
                },

                uploadFile: Action.uploadFile
            };
    });

    function baseprint(name, type, tolog) {
        chrome.runtime.sendMessage({
            "event": "testconsole",
            "data": {
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
                isTesting: false
            };

            const DataStore = {
                // saveKey(string key, obj val, function next())
                saveKey: function(key, val, next) {
                    if (next == null) next = function(){};

                    let options = {};
                    options[key] = val;

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
                    const payload = {
                        "event": "msgsend",
                        "data": {
                            "module": TPI.myName,
                            "name": method,
                            "data": data
                        }
                    };
                    if (cb)
                        return chrome.runtime.sendMessage(payload, cb);
                    else
                        return chrome.runtime.sendMessage(payload);
                },

                // listen(string method, function cb)
                listen: function(method, cb) {
                    chrome.runtime.sendMessage({
                        "event": "msglisten",
                        "data": {
                            "method": method,
                            "cb": cb
                        }
                    });
                }
            };

            const code = injections[i][1];
            chrome.runtime.sendMessage({
                event: "ismanagedwindow"
            }, (isTesting) => {
                TPI.isTesting = isTesting;
                if (isTesting) {
                    sandbox.console = {
                        log: (tolog) => baseprint(TPI.myName, 0, tolog),
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
                    "event": "getopts",
                    "script": TPI.myName 
                }, (prefs) => {
                    const url = window.location.href;
                    const re  = new RegExp(prefs["domains"], "g");

                    if (prefs["enabled"] && url.match(re)) {
                        eval('with (sandbox) {' + code + '};');
                        if (TPI.isTesting)
                            sandbox.console.info("<strong> --- INFO: Loaded script '" + TPI.myName + "' at " + new Date().toLocaleTimeString() + " --- </strong>");
                    }
                });
            });
        }
        return true;
    });
});
