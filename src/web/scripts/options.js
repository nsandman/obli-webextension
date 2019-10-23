function popup(location, urlparam, value) {
    window.open(
        `${location}?${urlparam}=${value}`,
        "_blank",
        "toolbar=no,scrollbars=yes,resizable=yes,width=400,height=400"
    );
}

function populateClassActionButtons() {
    const populateClassName = (className, callback) => {
        const els = document.getElementsByClassName(className);
        Array.prototype.forEach.call(els, callback);
    }

    // script options
    populateClassName("gm", (el) => {
        el.addEventListener("click", () => {
            popup("script_options.html", "r", el.getAttribute("data-name"));
        });
    });

    // project options
    populateClassName("po", (el) => {
        el.addEventListener("click", () => {
            popup("projects.html", "proj", el.getAttribute("data-name"));
        });
    });

    // remove script
    populateClassName("rm", (el) => {
        const whichScript = el.getAttribute("data-name");
        el.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                event: "rmscript",
                data: whichScript 
            }, reload);                
        });
    });

    // remove project
    populateClassName("prm", (el) => {
        const whichScript = el.getAttribute("data-name");
        el.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                event: "rmproject",
                data: whichScript 
            }, reload);                
        }); 
    });

    // project download
    populateClassName("pd", (el) => {
        const whichScript = el.getAttribute("data-name");
        el.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                event: "dlproject",
                data: whichScript 
            });
        }); 
    });
}

function populateIdActionButtons() {
    document.getElementById("createnew").addEventListener("click", function() {
        const name = prompt("Please enter your new script name: ");
        if (name)
            window.open("addscript.html?name=" + name, "_blank");
    });

    document.getElementById("createproj").addEventListener("click", function() {
        const name = prompt("Please enter your new project name: ");
        
        if (name) {
            let opts = {};
            opts[name] = [];

            chrome.runtime.sendMessage({
                event: "save_raw",
                data: {
                    prefix: Prefixes.project,
                    options: opts
                }
            }, reload);
        }
    });
}

function populateProjects(projects, scripts) {
    let scriptsLeft = scripts;
    const wrapper = document.getElementById("project_wrapper");

    for (let i = 0; i < projects.length; i++) {
        const projectName = projects[i][0];

        wrapper.innerHTML += `
            Project Options: 
            <a class="pd" data-name="${projectName}" href="#" style="font-size: 14pt"><i class="fas fa-download"></i></a>&nbsp;::
            <a class="po" style="font-size: 14pt" data-name="${projectName}" href="#"><i class="fas fa-wrench"></i></a>&nbsp;::
            <a class="prm" data-name="${projectName}" style="font-size: 14pt" href='#'><i class='fas fa-minus-circle'></i></a>
            <div class="wrap-collabsible" style="margin-top: 2px;margin-bottom: 20px;">
              <input id="collapsible${i}" class="toggle" type="checkbox">
              <label for="collapsible${i}" class="lbl-toggle"><strong>Project: ${projectName}</strong></label>
              <div class="collapsible-content">
                <div class="content-inner" id="ciproj${i}"></div>
              </div>
            </div>`;

        let parent = document.getElementById("ciproj" + i);
        let table = parent.appendChild(document.createElement("table"));
        addProjects(table, projects[i][1], scriptsLeft);
    }
    return scriptsLeft;
}

function addProjects(table, projects, scriptsLeft, rowOffset=0) {
    for (let i = 0; i < projects.length; i++) {
        const name = projects[i];
        
        scriptsLeft.remove(name);
        const row   = table.insertRow(i + rowOffset);
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);

        cell1.innerHTML = name;
        cell2.innerHTML = `<center>
           <a href="addscript.html?name=${name}" target="_blank"><i class="fas fa-pencil-alt"></i></a> 
        &nbsp;
        <a href="#" class="gm" data-name='${name}'"><i class="fas fa-wrench"></i></a>
        &nbsp;
        <a class='rm' href='#' data-name='${name}'><i class='fas fa-minus-circle'></i></a>
        </center>`;
    }
}

function uploadFileCallback(e) {
    const input = e.target;

    if (input.files[0].name.endsWith(".obli")) {
        const reader = new FileReader();
        reader.onload = () => {
            chrome.runtime.sendMessage({
                event: "createproj_file",
                data: {
                    name: input.files[0].name.slice(0, -5),
                    zip: reader.result
                }
            }, reload);
        };
        reader.readAsBinaryString(input.files[0]);
    } 
    else if (input.files[0].name.endsWith(".js")) {
        const name = input.files[0].name
            .replace(".obli.js", "")
            .replace(".js", "");

        const reader = new FileReader();
        reader.onload = () => {
            let opts = {};
            opts[name] = reader.result;

            chrome.runtime.sendMessage({
                event: "saveproject",
                data: {
                    prefix: Prefixes.scripts,
                    options: opts
                }
            }, reload);
        };
        reader.readAsText(input.files[0]);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    chrome.runtime.sendMessage({"event": "getscripts"}, (scripts) => {
        chrome.runtime.sendMessage({"event": "getprojects"}, (projects) => {
            const allScripts  = Object.keys(scripts); 
            const allProjects = Object.entries(projects);

            const scriptsLeft = populateProjects(allProjects, allScripts);      // returns scripts not used by projects
            if (scriptsLeft.length) {
                const orphanTable = document.getElementById("scripttable");
                orphanTable.style.display = "table";

                addProjects(orphanTable, scriptsLeft, [], rowOffset=1);
            }
            
            populateClassActionButtons();
            populateIdActionButtons();

            // upload link callback
            const uploadLink = document.getElementById("uploadproj");
            uploadLink.addEventListener("change", uploadFileCallback);
        });
    }); 
});
