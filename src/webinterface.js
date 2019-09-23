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
                        click: function(el) {
                            el.click();
                        },

                        // setTextValue(DOMElement el, string val)
                        setTextValue: function(el, val) {
                           __setNative(el, "value", val); 
                        },

                        // setCheckValue(DOMElement el, bool val)
                        setCheckValue: function(el, val) {
                            __setNative(el, "checked", val);
                        },

                        // clear(DOMElement el)
                        clear: function(el) {
                            this.setTextValue(el, "");
                        }
                    };
                    const Messenger = {};
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

                        // getKey(string/string[] keys, function(results))
                        getKeys: function(keys, next) {
                            return chrome.storage.local.get(keys, next);
                        }
                    };

                    // TODO: Create getters and setters with Messenger
                    const SharedDataStore = {
                        saveKey: function(key, val, next) {
                            DataStore.saveKey(key, val, next);
                        },
                        saveKeys: function(options, next) {
                            DataStore.saveKeys(options, next);
                        },
                        getKeys: function(keys, next) {
                            DataStore.getKeys(keys, next);
                        }
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
