let debug;
const tabChecker = chrome.runtime.connect({name: 'tabChecker'});

getFromStorage('ntv_debug', 'local').then(res => debug = res.ntv_debug || false);

const init = (startSocket = true) => {
    if (startSocket) {
        connector.setupSocket();
    } else {
        setTimeout(() => init(startSocket), 250);
    }
};

const resource = (filename) => {
    if (typeof filename !== "string" || filename.trim() === "") {
        console.error("Invalid filename:", filename);
        return null;
    }
    
    let script = document.createElement("script");
    script.src = chrome.runtime.getURL(filename);
    script.type = "text/javascript";

    return script;
}


const message = (obj) => {
    if (obj && obj.source === window && obj.data  && obj.data.method) {
        tabChecker.postMessage(obj.data)
    }
}

r(() => {
    const element = document.body || document.head || document.documentElement;
    const manifest = chrome.runtime.getManifest();

    for (let resourceObj of manifest.web_accessible_resources) {
        for (let filename of resourceObj.resources) {
            console.log('Filename:', filename);  // Log the filename
            if (typeof filename !== 'string') {
                console.error('Invalid filename:', filename);
                continue;  // Skip to next iteration
            }
    
            let script = resource(filename);
            if (script && !element.querySelector("script[src*='" + filename + "']")) {
                element.appendChild(script);
            }
        }
    }
    
    

    window.addEventListener("message", message);
    tabChecker.postMessage({ping: "pong"});


    
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.token) connector.wsSend(msg);
        if (msg.user_info) connector.wsSend(msg.user_info);
        if (msg.start) init();
        if (msg.alert) connector.parseAlert(msg);
    });
});
