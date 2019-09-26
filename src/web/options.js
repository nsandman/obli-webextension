document.addEventListener("DOMContentLoaded", function() {
    const dispatcherInput = document.getElementById("dispatcher");
    chrome.runtime.sendMessage({"event": "getproperty", "data": "dispatcher"}, (res) => {
        if (res)
            dispatcherInput.value = res;
    });

    chrome.runtime.sendMessage({"event": "getscripts"}, (scripts) => {
        let objectIterable = Object.entries(scripts);

        let table = document.getElementById("scripttable");
        for (let i = 0; i < objectIterable.length; i++) {
            let row = table.insertRow(i+1);

            let cell1 = row.insertCell(0);
            let cell2 = row.insertCell(1);

            const iText = i.toString();

            cell1.innerHTML = "<a class='gm' href='#' data-num='" + iText + "'>" + objectIterable[i][0] + "</a>";
            cell2.innerHTML = "<a class='rm' href='#' data-num='" + iText + "'>X</a>";
        }

        document.getElementById("savesettings").addEventListener("click", function() {
            const dispatcherUrl = dispatcherInput.value;
            const settings = {
                "dispatcher": dispatcherUrl
            };
            chrome.runtime.sendMessage({"event": "saveproperties", "options": settings}, () => {
                window.location.reload();
            });            
        });

        const els = document.getElementsByClassName("gm");
        Array.prototype.forEach.call(els, function(el) {
            el.addEventListener("click", () => {
                popup(el.getAttribute("data-num"));
            });
        });

        const els2 = document.getElementsByClassName("rm");
        Array.prototype.forEach.call(els2, function(el) {
            const whichScript = parseInt(el.getAttribute("data-num"));
            el.addEventListener("click", () => {
                chrome.runtime.sendMessage({
                    "event": "rmscript",
                    "script": whichScript 
                }, () => {
                    //table.deleteRow(whichScript+1);
                    document.location.reload();
                });                
            });
        });
    });
});

function popup(number) {
    window.open("viewcode.html?r="+number.toString(), "_blank", "toolbar=no,scrollbars=yes,resizable=yes,width=400,height=400");
}
