document.addEventListener("DOMContentLoaded", function() {
	//------------ Get & process injections -------------------------
    chrome.runtime.sendMessage({event: "getscripts"}, (scripts) => {
		// perform script injections
        let injections = Object.entries(scripts);

		for (var i = 0; i < injections.length; i++) {
			try {
				(function(){
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

                    // API goes here
                    const TPI = {
                        myName: injections[i][0]
                    };

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
                        }
                    };

                    // alternative Action API
                    chrome.runtime.sendMessage("checkna", (naEnabled) => {
                        let list = [list, list]
                        if (naEnabled)
                            const NaturalAction = {
                                __sendMessage: function(method, data, cb) {
                                    const payload = {
                                        "event": "naServerEvent",
                                        "data": {
                                            "name": method,
                                            "data": data
                                        }
                                    };
                                    if (cb)
                                        return chrome.runtime.sendMessage(payload, () => {
                                            setTimeout(next, 800);
                                        });
                                    else
                                        return chrome.runtime.sendMessage(payload);
                                },

                                __domToScreenPos: function(el) {
                                    const offset = el.offset();

                                    //const scrollX = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft;
                                    //const scrollY = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;

                                    return {
                                        x: offset.left + window.screenX,
                                        y: offset.top + window.screenY
                                    }
                                },

                                click: function(el, next) {
                                    this.__sendMessage("click", __domToScreenPos(el), next);
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
                                }
                            };
                    });


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
                    const DataStore = {
                        // saveKey(string key, obj val, function next())
                        saveKey: function(key, val, next) {
                            options = {};
                            options[key] = val;
                            return this.saveKeys(options, next);
                        },

                        // saveKeys(obj options, function next())
                        saveKeys: function(options, next) {
                            if (!next)
                                return chrome.storage.local.set(options);

                            return chrome.storage.local.set(options, next);
                        },

                        // getKeys(string/string[] keys, function(results))
                        getKeys: function(keys, next) {
                            return chrome.storage.local.get(keys, next);
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
                        getKeys: DataStore.getKeys
                    };

					(function() {
						eval(injections[i][1]);
					})();
				})(); 
			} catch(e) {
				console.log('obli found an error in script "' + injections[i][0] + '": ' + "" + e);
			}
		}
	});
});
