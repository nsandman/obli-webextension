// 8 char prefixes to differentiate
// uses in LocalStorage
const Prefixes = {
    script:    "_script_",
    options:   "_meta___",
    project:   "_proj___",
    dataStore: "_dstore_",
    obli:      "_obli___"
};

// https://stackoverflow.com/a/6234804
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

// this breaks Ace editor for some reason
try {
    if (ace) {}
} catch (e) {
    Object.prototype.renameProperty = function (oldName, newName) {
         // Do nothing if the names are the same
         if (oldName === newName) {
             return this;
         }
        // Check for the old property name to avoid a ReferenceError in strict mode.
        if (this.hasOwnProperty(oldName)) {
            this[newName] = this[oldName];
            delete this[oldName];
        }
        return this;
    };
}

function reload() {
    (window.location || document.location).reload();
}

// https://html-online.com/articles/get-url-parameters-javascript/
function getUrlVars() {
    let url = window.location.href;
    if (url.substr(-1) == "#")
        url = url.slice(0, -1); 

    var vars = {};
    var parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
