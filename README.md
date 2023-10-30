# Extension


```
const ViewStream = () => {
    const fixTVOrigin = details => {
        if (!details || !details.initiator || !details.initiator.includes(chrome.runtime.id)) {
            return {}
        }

        const requestHeaders = details.requestHeaders.filter(details => details.name !== "Origin")
        requestHeaders.push({name: "Origin", value: "https://tradingview.com"})
        return {requestHeaders: requestHeaders}
    }
    let tryFallback = false
    try {
        chrome.webRequest.onBeforeSendHeaders.addListener(fixTVOrigin, {urls: ["https://*.tradingview.com/*"]}, ["blocking", "requestHeaders", "extraHeaders"])
    } catch(e) {
        console.error(e)
        tryFallback = true
    }
    if (tryFallback) try {
        chrome.webRequest.onBeforeSendHeaders.addListener(fixTVOrigin, {urls: ["https://*.tradingview.com/*"]}, ["blocking", "requestHeaders"])
    } catch(e) {
        console.error(e)
        log.warn("Unable to activate required workaround for TV event stream – please make sure your Chrome version is up to date and you have granted PV the necessary permissions!")
    }
}

ViewStream();
```
```
// 'ViewSteam' Was the old method to capture tradingview alerts through pushstream on tradingview used by both Autoview and other extensions. This was discontinued with Googles update to manifest v3.
//  The reason it still works for Autoview and the other guys is they are grandfathered in. Now the only way to capture pushstream alerts is by utilizing a proxy as listed below under the 'createSocket' funciton. This feature has been disabled.
//  Due to sometimes being slow because of traval time to the proxy. Now the extension's sole purpose is for manual-trading. The proxy we setup on AWS is secure and serverless meaning NO DATA is captured or stored. But that has been disabled.
//  You are more then welcome to experiment with it and use the proxy we setup for experimintation
```
The newer method that was recently disabled 

```
function createSocket(channel) {
    currentChannel = channel;

    if (socket) {
        console.log("Closing existing socket before creating a new one.");
        socket.close();
    }

    const Url = 'http:ec2-3-95-19-241.compute-1.amazonaws.com:3000/promise?url=' + encodeURIComponent(`https:pushstream.tradingview.com/message-pipe-es/public/private_${channel}?_=${Date.now()}`);
    socket = new EventSource(Url);

    socket.onmessage = (e) => {
        if (e.data.trim() === ": -1" || e.data.includes('": -1"')) {
            console.log("Received heartbeat.");
            lastHeartbeat = Date.now();  Update the lastHeartbeat whenever we receive the heartbeat
            return;
        }

        console.log("Received data:", e.data);
        
        try {
            const rawData = rawJSON(e.data);            
            let parsedData;
            
            try {
                parsedData = JSON.parse(rawData);
            } catch (e) {
                console.error("Could not parse rawData:", e);
                return;
            }

            if (typeof parsedData.text.content === 'object') {
                console.log("Logging raw JSON:", JSON.stringify(parsedData.text.content));
            } else {
                console.log("Logging raw JSON:", parsedData.text.content);
            }

            handleCustomAlert(parsedData, channel);  Call the function here

        } catch (error) {
            console.error("Error occurred processing data:", error);
        }

    };

    socket.onerror = (error) => {
        console.error("Error occurred with the socket:", error);
         Not reconnecting immediately. Waiting for heartbeat logic to take over.
    };

    socket.onclose = () => {
        console.log("Socket connection closed. Will check for reconnection based on heartbeat health...");
         Not reconnecting immediately. Waiting for heartbeat logic to take over.
    };
}

 Periodic check for heartbeat
const HEARTBEAT_THRESHOLD = 65000;  30 seconds
setInterval(() => {
    if (Date.now() - lastHeartbeat > HEARTBEAT_THRESHOLD) {
        console.warn("No heartbeat received for over", HEARTBEAT_THRESHOLD/1000, "seconds. Attempting to reconnect...");
        createSocket(currentChannel);
    }
}, HEARTBEAT_THRESHOLD);
```
