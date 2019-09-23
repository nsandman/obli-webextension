document.addEventListener("DOMContentLoaded", function() {
    console.log("hi");
	//------------ Get & process injections -------------------------
    chrome.runtime.sendMessage({event: "getscripts"}, (scripts) => {
		// perform script injections
        let injections = Object.entries(scripts);

		for (var i = 0; i < injections.length; i++) {
			try {
				(function(){
                    // API goes here

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
