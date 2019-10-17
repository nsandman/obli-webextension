document.addEventListener("DOMContentLoaded", function() {
    const dispatcherInput = document.getElementById("dispatcher");
    chrome.runtime.sendMessage({"event": "getproperty", "data": "dispatcher"}, (res) => {
        if (res)
            dispatcherInput.value = res;
    });

    function addProject(table, name, i) {
        const iText = scriptsIterable.indexOf(scriptsIterable.find((el) => {
            try {
                return el[0] == name;
            } catch(e) {
                i--;
                return false;
            }
        }));
        let row   = table.insertRow(i);
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);

        cell1.innerHTML = name;
        cell2.innerHTML = `<center>
           <a href="addscript.html?r=${iText}" target="_blank"><i class="fas fa-pencil-alt"></i></a> 
        &nbsp;
        <a href="#" class="gm" data-num='${iText}'"><i class="fas fa-wrench"></i></a>
        &nbsp;
        <a class='rm' href='#' data-num='${iText}'><i class='fas fa-minus-circle'></i></a>
        </center>`;

        scriptsIterable[iText] = null;
    }

    let scriptsIterable;
    chrome.runtime.sendMessage({"event": "getscripts"}, (scripts) => {
        scriptsIterable = Object.entries(scripts);
        console.dir(scriptsIterable);

        chrome.runtime.sendMessage({"event": "getprojects"}, (projects) => {
            let objectIterable = Object.entries(projects);

            console.dir(objectIterable);
            const wrapper = document.getElementById("project_wrapper"); 
            for (let j = 0; j < objectIterable.length; j++) {
                const name = objectIterable[j][0];
                wrapper.innerHTML += `
                    Project Options: 
                    <a class="pd" data-name="${name}" href="#" style="font-size: 14pt"><i class="fas fa-download"></i></a>&nbsp;::
                    <a class="po" style="font-size: 14pt" data-name="${name}" href="#"><i class="fas fa-wrench"></i></a>&nbsp;::
                    <a class="prm" data-name="${name}" style="font-size: 14pt" href='#'><i class='fas fa-minus-circle'></i></a>
                    <div class="wrap-collabsible" style="margin-top: 2px;margin-bottom: 20px;">
                      <input id="collapsible${j}" class="toggle" type="checkbox">
                      <label for="collapsible${j}" class="lbl-toggle"><strong>Project: ${name}</strong></label>
                      <div class="collapsible-content">
                        <div class="content-inner" id="ciproj${j}"></div>
                      </div>
                    </div>`;

                let parent = document.getElementById("ciproj" + j);
                let table = parent.appendChild(document.createElement("table"));
                for (let i = 0; i < objectIterable[j][1].length; i++) {
                    const scriptName = objectIterable[j][1][i];
                    addProject(table, scriptName, i);
                }
            }

            const orphanTable = document.getElementById("scripttable");
            for (let k = 0; k < scriptsIterable.length; k++) {
                if (scriptsIterable[k]) {
                    orphanTable.style.display = "table";
                    addProject(orphanTable, scriptsIterable[k][0], k+1);
                }
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

            document.getElementById("createnew").addEventListener("click", function() {
                const name = prompt("Please enter your new script name: ");
                if (name)
                    window.open("addscript.html?name=" + name, "_blank");
            });
            document.getElementById("createproj").addEventListener("click", function() {
                const name = prompt("Please enter your new project name: ");
                opts = {};
                opts["_proj___" + name] = [];

                if (name)
                    chrome.runtime.sendMessage({
                        event: "saveproject",
                        options: opts
                    }, () => {
                        window.location.reload();
                    });
            });

            const els = document.getElementsByClassName("gm");
            Array.prototype.forEach.call(els, function(el) {
                el.addEventListener("click", () => {
                    popup(el.getAttribute("data-num"));
                });
            });

            const projs = document.getElementsByClassName("po");
            Array.prototype.forEach.call(projs, (el) => {
                el.addEventListener("click", () => {
                    oppop(el.getAttribute("data-name"));
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
                        document.location.reload();
                    });                
                });
            });

            const els3 = document.getElementsByClassName("prm");
            Array.prototype.forEach.call(els3, function(el) {
                const whichScript = el.getAttribute("data-name");
                el.addEventListener("click", () => {
                    chrome.runtime.sendMessage({
                        "event": "rmproject",
                        "data": whichScript 
                    }, () => {
                        document.location.reload();
                    });                
                });        
            });

            const els4 = document.getElementsByClassName("pd");
            Array.prototype.forEach.call(els4, function(el) {
                const whichScript = el.getAttribute("data-name");
                el.addEventListener("click", () => {
                    chrome.runtime.sendMessage({
                        "event": "dlproject",
                        "data": whichScript 
                    });
                });        
            });
        });
    }); 
});

function popup(number) {
    window.open(
        "script_options.html?r="+number.toString(),
        "_blank",
        "toolbar=no,scrollbars=yes,resizable=yes,width=400,height=400"
    );
}

function oppop(name) {
    window.open(
        "projects.html?proj=" + name,
        "_blank",
        "toolbar=no,scrollbars=yes,resizable=yes,width=400,height=400"
    );
}
