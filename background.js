importScripts('ExtPay.js')
var extpay = new ExtPay('ninjaviewbeta');
extpay.startBackground();

let ws;

//added
let access_token, runningTabId;
const titlePrefix = 'TradingView To NinjaTrader\n';
//const tradingView = new TradingView();
const tradingViewInstance = new TradingView();

const tunnelDispatcher = (alert) => runningTabId && chrome.tabs.sendMessage(runningTabId, alert);

tradingViewInstance.setListenerDispatcher(tunnelDispatcher)

chrome.runtime.onInstalled.addListener(async () => {
    // Any setup or initialization code goes here.
});


function checkSubscription(email) {
    //sendlogToServer("Sending email to server for subscription check:", email);

    return new Promise((resolve, reject) => {
        console.log("Checking subscription for email:", email);

        // Logging the email and request data to the server
        //sendlogToServer(`Checking subscription for email: ${email}`);

        fetch('http://ec2-3-95-19-241.compute-1.amazonaws.com:3001/validate-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        })
        .then(response => {
            console.log("Received response from server:", response);
            return response.json();
        })
        .then(data => {
            console.log("Received data from server:", data);
            if (data.hasPaid) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
        .catch(error => {
            console.error('Error checking subscription:', error);
            //sendlogToServer(`Error checking subscription: ${error}`);
            reject(error);
        });
    });
}


  

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes["manualTrade"]) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (changes["manualTrade"].newValue) {
          chrome.scripting.executeScript({
    target: {tabId: tabs[0].id},
    files: ['content-script.js']
  });
  
        } else {
          chrome.tabs.sendMessage(tabs[0].id, { action: "removeContentScript" });
        }
      });
    }
  });


chrome.runtime.onConnect.addListener(port => {
    if ("tabChecker" === port.name) {
        port.onMessage.addListener(async (msg, sendingPort) => {
            if (msg.ping) initExtension(sendingPort.sender.tab.id);
            if (msg.socket) setSocketStatus(msg.socket);
            if (msg.method === "tradingview.user") {
                console.info(`Starting TradingView event stream socket for user ${msg.value.username || null}...`);
                tradingViewInstance.setTradingViewUser(msg.value);
                await tradingViewInstance.toggleTradingViewListeners();
            }
        });

        port.onDisconnect.addListener((sendingPort) => {
            if (sendingPort.sender.tab.id === runningTabId) {
                runningTabId = null;
                initExtension();
            }
        });
    }
});

const setSocketStatus = (status) => {
    const isOpen = 'open' === status;
    const colorMapping = {'open': '#F00', 'hidden': '#FF0'}
    const titleMapping = {
        'open': 'Please Connect To Tradingview!',
        'hidden': 'Alerts Log is hidden... Not possible to process the alerts!'
    }

    chrome.action.setBadgeBackgroundColor({color: colorMapping[status] ?? '#0F0'});
    chrome.action.setBadgeText({text: isOpen ? " " :"!"});
    chrome.action.setTitle({
        title: titlePrefix + (titleMapping[status] ?? 'Connected to TradingView!')
    });

    if (isOpen) {
        chrome.identity.getProfileUserInfo({accountStatus: "ANY"}, userInfo => {
            if (userInfo.email) {
                chrome.storage.sync.get('ntv_paypal_subscription', result => {
                    let data = {
                        user_info: {user_email: userInfo.email, paypal_subscription: result.ntv_paypal_subscription}
                    };
                    chrome.tabs.sendMessage(runningTabId, data);
                })
            }
        });
    }
};

const initExtension = (currentTabId) => {
    chrome.tabs.query({url: "https://*.tradingview.com/*"}, (tabs) => {
        if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError);

        if (!runningTabId || runningTabId === currentTabId) {
            const tab = tabs.filter((tab) => tab.active)[0] || tabs[0];

            if (tab) {
                runningTabId = tab.id;
                chrome.tabs.sendMessage(runningTabId, {start: true});
            } else {
                chrome.storage.sync.remove('trdvwUser');
                setSocketStatus('close');
            }
        }
    });
};

const getAccessToken = (requestStart) => {
    chrome.identity.getAuthToken({interactive: true}, token => {
        if (chrome.runtime.lastError) {
            console.warn('Failed to fetch google chrome auth token: ', chrome.runtime.lastError);
            return;
        }

        access_token = token;
        if (runningTabId) chrome.tabs.sendMessage(runningTabId, {app_id: chrome.runtime.id, token: token});

        if (undefined !== requestStart) {
            requestStart();
        }
    });
};

const xhrWithAuth = (method, url, callback) => {
    let retry = true;

    getToken();

    function getToken() {
        getAccessToken(requestStart);
    }

    function requestStart() {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.onload = requestComplete;
        xhr.send();
    }

    function requestComplete() {
        if (401 == this.status && retry) {
            retry = false;
            chrome.identity.removeCachedAuthToken({token: access_token}, getToken);
        } else {
            callback(null, this.status, this.response);
        }
    }
};

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

//ViewStream();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setPnL') {
    if (tradingViewTabId) {
      chrome.tabs.sendMessage(tradingViewTabId, { action: 'updatePnL', pnl: request.pnl });
    }
  } else if (request.action === 'registerTradingView') {
    tradingViewTabId = sender.tab.id;
  }
});

function TradingView() {
    let state = {
        dispatcher: null,
        permissions: {
            origins: [
                "https://*.tradingview.com/*"
            ]
        },
        sockets: {},
    }

function createAccount(o) {
    ////sendlogToServer("Creating account with options: " + JSON.stringify(o));

    o = o || {};
    const channel = o.channel || null;
    const enabled = channel !== null;
    const id = o.id || 0;
    const username = o.username || "Guest";
    const userpic = o.userpic || null;

    if (username !== "Guest" && id !== 0 && channel !== null) {
        ////sendlogToServer("Account creation successful: username = " + username + ", id = " + id);
        
        // Update badge and title for successful account creation
        chrome.action.setBadgeBackgroundColor({color: '#0F0'}); // Green
        chrome.action.setBadgeText({text: "✓"});
        chrome.action.setTitle({title: "Account creation successful"});
    } else {
        ////sendlogToServer("Account creation failed.");
        
        // Update badge and title for failed account creation
        chrome.action.setBadgeBackgroundColor({color: '#F00'}); // Red
        chrome.action.setBadgeText({text: "X"});
        chrome.action.setTitle({title: "Account creation failed"});
    }

    return {
        channel,
        enabled,
        id,
        username,
        userpic
    };
}


////sendlogToServer("Script loaded");


function handleCustomAlert(parsedData, channel) {        // Retrieve the autoTrade status from storage.
    chrome.storage.sync.get(["autoTrade"], function(items) {
    
        // Check if autoTrade is enabled.
        if (!items.autoTrade) {
            console.log('AutoTrade is not enabled.');
            return; // Exit the function early if autoTrade is not enabled
        }
    ////sendlogToServer("Entered handleCustomAlert");
    try {
        ////sendlogToServer('handleCustomAlert called');

        // Parse the content field from parsedData.text
        const innerContent = JSON.parse(parsedData.text.content);

        // Log the parsed inner content
        ////sendlogToServer('Parsed innerContent: ' + JSON.stringify(innerContent));

        // Block messages with the alert_running condition
        if (innerContent.m === "alert_running") {
            ////sendlogToServer("Blocked: Message meets blocking criteria");
            return; // Exit the function early
        }

        // If the message is of the type "alert/fired", process further
        if (innerContent.p && innerContent.p.desc && innerContent.p.snd_file === "alert/fired") {
            // Parse the desc field from innerContent.p
            const payload = JSON.parse(innerContent.p.desc.replace(/\\\\/g, '\\'));
            
            // Extract payload details
            //const { alert, account, ticker, qty } = payload;
            const {
                alert,
                account,
                ticker,
                qty,
                action,
                order_type,
                limit_price,
                stop_price,
                tif,
                oco_id,
                order_id,
                strategy,
                strategy_id
            } = payload;
            
            // Create a simplified payload
            //const simplified = { alert, account, ticker, qty };
            const simplified = {
                alert: alert || 'alert',
                account: account || 'account',
                ticker: ticker || 'ticker',
                qty: qty || 1,
                action: action || 'action',
                order_type: order_type || 'order_type',
                limit_price: limit_price || 0,
                stop_price: stop_price || 0,
                tif: tif || 'tif',
                oco_id: oco_id || 'oco_id',
                order_id: order_id || 'order_id',
                strategy: strategy || 'strategy',
                strategy_id: strategy_id || 'strategy_id'
            };
            // Log the simplified payload
            ////sendlogToServer('Sending simplified payload: ' + JSON.stringify(simplified));
            
            // Perform the POST request
            fetch('http://localhost:5001/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(simplified),
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    ////sendlogToServer(`Server response error: ${response.status}`);
                    throw new Error(`Server response: ${response.status}`);
                }
            })
            .then(data => {
                ////sendlogToServer('Success: ' + JSON.stringify(data));
            })
            .catch((error) => {
                ////sendlogToServer('Fetch Error: ' + error.toString());
            });
        } else {
            ////sendlogToServer('Conditions not met');
            ////sendlogToServer('Debug: snd_file = ' + innerContent.p.snd_file);
        }
    } catch (e) {
        ////sendlogToServer("Could not parse inner content or filter message: " + e.toString());
    }
}
    )

}


let socket;
let lastHeartbeat = Date.now();




//let socket;
//let lastHeartbeat = Date.now();
//let currentChannel;

//function createSocket(channel) {
    //currentChannel = channel;

    //if (socket) {
        //console.log("Closing existing socket before creating a new one.");
        //socket.close();
    //}

    //const Url = 'http://ec2-3-95-19-241.compute-1.amazonaws.com:3000/promise?url=' + encodeURIComponent(`https://pushstream.tradingview.com/message-pipe-es/public/private_${channel}?_=${Date.now()}`);
    //socket = new EventSource(Url);

    //socket.onmessage = (e) => {
        //if (e.data.trim() === ": -1" || e.data.includes('": -1"')) {
            //console.log("Received heartbeat.");
           // lastHeartbeat = Date.now(); // Update the lastHeartbeat whenever we receive the heartbeat
            //return;
        //}

        //console.log("Received data:", e.data);
        
        //try {
            //const rawData = rawJSON(e.data);            
            //let parsedData;
            
            //try {
                //parsedData = JSON.parse(rawData);
            //} catch (e) {
                //console.error("Could not parse rawData:", e);
                //return;
            //}

            //if (typeof parsedData.text.content === 'object') {
                //console.log("Logging raw JSON:", JSON.stringify(parsedData.text.content));
            //} else {
                //console.log("Logging raw JSON:", parsedData.text.content);
            //}

            //handleCustomAlert(parsedData, channel); // Call the function here

        //} catch (error) {
            //console.error("Error occurred processing data:", error);
        //}

    //};

    //socket.onerror = (error) => {
        //console.error("Error occurred with the socket:", error);
        //// Not reconnecting immediately. Waiting for heartbeat logic to take over.
    //};

    //socket.onclose = () => {
        //console.log("Socket connection closed. Will check for reconnection based on heartbeat health...");
        //// Not reconnecting immediately. Waiting for heartbeat logic to take over.
    //};
//}

// Periodic check for heartbeat
//const HEARTBEAT_THRESHOLD = 65000; // 30 seconds
//setInterval(() => {
//    if (Date.now() - lastHeartbeat > HEARTBEAT_THRESHOLD) {
//        console.warn("No heartbeat received for over", HEARTBEAT_THRESHOLD/1000, "seconds. Attempting to reconnect...");
//        createSocket(currentChannel);
//    }
//}, HEARTBEAT_THRESHOLD);






// Send a pong to the Flask server every 5 seconds
//setInterval(function() {
//    fetch("http://localhost:5001/pong", {
//        method: "POST",
//        body: JSON.stringify({message: "pong"}),
 //       headers: {
 //           "Content-Type": "application/json"
//        }
//    });
//}, 5000);







    return Object.assign(
        {},
        StorageInternal("sync"),
        {
            getTradingViewAccounts: function () {
                const storage = this.getStorageValue("TRADINGVIEW") || {}
                return Object.values(storage)
            },
            removeTradingViewAccount: function (id) {
                this.removeStorageValue("TRADINGVIEW", id)
            },
            setListenerDispatcher: function (dispatcher) {
                state.dispatcher = dispatcher
            },
            setTradingViewUser: function (user) {
                const updated = createAccount(user)
                const current = this.getStorageValue("TRADINGVIEW", updated.id) || {}
                const account = {
                    channel: updated.channel || current.channel,
                    enabled: true,
                    id: current.hasOwnProperty("id") ? current.id : updated.id,
                    username: updated.username || current.username,
                    userpic: updated.userpic || current.userpic,
                }
                if (account.id > 0) {
                    this.setStorageValue("TRADINGVIEW", account.id, account)
                    chrome.storage.sync.set({'trdvwUser': account})
                }

                const legacyChannel = this.getStorageValue("TRADINGVIEW", -1, "channel")
                if (legacyChannel === account.channel) {
                    this.removeTradingViewAccount(-1)
                }
            },
            toggleTradingViewListeners: async function () {
                const accounts = this.getTradingViewAccounts()
                for (const { id, channel, enabled, } of accounts) {
                    const socket = state.sockets.hasOwnProperty(id) ? state.sockets[id] : null
                    if (channel && enabled && !socket) {
                        //state.sockets[id] = createSocket(channel)

                        console.log("Logging")
                    }
                    if ((!channel || !enabled) && socket) {
                        delete state.sockets[id]
                        socket.setConfig("reconnect", false)
                        socket.close()
                    }
                }
            },
        },
    )
}
//let runningTabId; // Make sure this is properly initialized

//let runningTabId; // Make sure this is properly initialized




  

//manifest v2 method
let headersModified = false;

//chrome.webRequest.onBeforeSendHeaders.addListener(
    //(details) => {
      //const isInitiatedByExtension = details.initiator && details.initiator.includes(chrome.runtime.id);
      //if (isInitiatedByExtension) {
        //// Cancel the initial request
        //return { cancel: true };
      //}
    //},
    //{ urls: ['https://*.tradingview.com/*'] },
    //['requestHeaders', 'extraHeaders']
  //);
  
  //chrome.webRequest.onErrorOccurred.addListener(
    //(details) => {
     // const isInitiatedByExtension = details.initiator && details.initiator.includes(chrome.runtime.id);
      //if (isInitiatedByExtension) {
       // // Modify the headers and resend the request
       // const modifiedHeaders = details.requestHeaders.filter(header => header.name !== "Origin");
       // modifiedHeaders.push({ name: "Origin", value: "https://tradingview.com" });
  
       // const xhr = new XMLHttpRequest();
       // xhr.open(details.method, details.url, true);
        //modifiedHeaders.forEach(header => {
        //  xhr.setRequestHeader(header.name, header.value);
        //});
        //xhr.send();
      //}
    //},
    //{ urls: ['https://*.tradingview.com/*'] }
  //);

const STORAGE = {
    local: {},
    sync: {},
}

function StorageInternal(storageArea) {
    storageArea = storageArea || "sync"

    function assignDeep(target, ...args) {
        const isObject = (o) => typeof o === "function" || Object.prototype.toString.call(o) === "[object Object]"
        const isPrimitive = (o) => typeof o === "object" ? o === null : typeof o !== "function"
        const isValidKey = (key) => key !== "__proto__" && key !== "constructor" && key !== "prototype"

        if (isPrimitive(target)) {
            target = args.shift()
        }
        if (!target) {
            target = {}
        }
        for (let i = 0; i < args.length; i++) {
            const value = args[i]
            if (isObject(value)) {
                const keys = Object.keys(value)
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j]
                    if (isValidKey(key)) {
                        if (isObject(target[key]) && isObject(value[key])) {
                            target[key] = assignDeep(target[key], value[key])
                        } else {
                            target[key] = value[key]
                        }
                    }
                }
            }
        }

        return target
    }

    return {
        clearStorage: function () {
            STORAGE[storageArea] = {
                updated: Date.now(),
            }
        },
        getStorageValue: function (...keys) {
            // Load existing
            const storage = STORAGE[storageArea] || {}
            storage.updated = storage.updated || Date.now()
            // Find desired leaf
            return getObjectStack(storage, ...keys)
        },
        removeStorageValue: function (...keys) {
            // Load existing
            let storage = this.getStorageValue()
            // Remove desired leaf
            removeObjectStack(storage, ...keys)
            storage.updated = Date.now()
        },
        setStorageValue: function (...keysEndWithValue) {
            // Load existing
            let storage = this.getStorageValue()
            // Merge new value
            const append = setObjectStack(...keysEndWithValue)
            storage = assignDeep({}, storage, append)
            storage.updated = Date.now()
            // Store new data
            STORAGE[storageArea] = storage
        },
    }
}
const r = (f) => /in/.test(document.readyState) ? f() : setTimeout(r(f), 9);

//function //sendlogToServer(message) {
    //fetch('http://127.0.0.1:5000/log', {
        //method: 'POST',
        //headers: {
            //'Content-Type': 'application/json',
        //},
        //body: JSON.stringify({ message: message }),
    //}).catch(error => {
        //console.error("Failed to send log to server:", error);
    //});
//}

const getFromStorage = (key, type = 'sync') => {
    ////sendlogToServer(`Getting "${key}" from "${type}" storage.`);
    return new Promise(cb => chrome.storage[type].get(key, res => cb(res)));
};

function getObjectStack(value, ...keys) {
    ////sendlogToServer("Getting object stack for keys: " + keys.join(", "));
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (value === null || !value.hasOwnProperty(key)) {
            return null;
        }

        value = value[key];
    }

    return value;
}

function removeObjectStack(value, ...keys) {
    ////sendlogToServer("Removing object stack for keys: " + keys.join(", "));
    const key = keys.shift() || null;

    if (!key || !value.hasOwnProperty(key)) {
        return false;
    }

    if (keys.length === 0) {
        delete value[key];
        return true;
    }

    return removeObjectStack(value[key], ...keys); // recursive
}

function rawJSON(str) {
    ////sendlogToServer("Logging raw JSON: " + str);
    return str;  // Always return the raw JSON string
}

function serialize(obj, prefix) {
    ////sendlogToServer("Serializing object with prefix: " + prefix);
    let ret = [];

    for (let p in obj) {
        if (obj.hasOwnProperty(p)) {
            let k = (prefix) ? prefix + "[" + p + "]" : p;
            let v = obj[p];

            ret.push(typeof v === "object"
                ? serialize(v, k)
                : encodeURIComponent(k) + "=" + encodeURIComponent(v)
            );
        }
    }

    return ret.join("&");
}

function setObjectStack(...args) {
    ////sendlogToServer("Setting object stack with args: " + args.join(", "));
    let value = args.length ? args.pop() : null;
    while (args.length) {
        let tmp = {};
        tmp[args.pop()] = value;
        value = tmp;
    }

    return value;
}

