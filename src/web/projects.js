document.addEventListener("DOMContentLoaded", () => {
    const currentScript = getUrlVars()["proj"];

    chrome.runtime.sendMessage({
        event: "getscripts"
    }, (scripts) => {
        const projects = document.getElementById("projects");

        const scriptsIterable = Object.entries(scripts);
        for (script of scriptsIterable) {
            const row   = projects.insertRow(0);
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);

            cell1.innerHTML = `<input id='${script[0]}' type='checkbox'></input>`;
            cell2.innerHTML = `<label for="${script[0]}" class="${script[0]}">${script[0]}</span>`;
        }

        chrome.runtime.sendMessage({
            event: "getprojects"
        }, (projects) => {
            const projectsIterable = Object.entries(projects);
            for (project of projectsIterable) {
                for (claimedScript of project[1]) {
                    const projBox = document.getElementById(claimedScript);

                    if (project[0] != currentScript) {
                        const textToGray   = document.getElementsByClassName(claimedScript)[0];
                        textToGray.style.color = "#cccccc";
                        projBox.disabled = true;
                    } else
                        projBox.checked = true;
                }
            }
        });
    });

    const saveButton = document.getElementById("save");
    saveButton.addEventListener("click", () => {
        let includeScripts = Array.from(document.querySelectorAll(":checked"));
        const saveList = includeScripts.map(x => x.id);

        chrome.runtime.sendMessage({
            event: "saveprojectoptions",
            data: {
                project: currentScript,
                scripts: saveList                
            }
        }, () => {
            window.location.reload();
        });
    });
});

// https://html-online.com/articles/get-url-parameters-javascript/
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
