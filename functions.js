"use strict";

const r = (f) => /in/.test(document.readyState) ? f() : setTimeout(r(f), 9);

//function //sendLogToServer(message) {
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
    //sendLogToServer(`Getting "${key}" from "${type}" storage.`);
    return new Promise(cb => chrome.storage[type].get(key, res => cb(res)));
};

function getObjectStack(value, ...keys) {
    //sendLogToServer("Getting object stack for keys: " + keys.join(", "));
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
    //sendLogToServer("Removing object stack for keys: " + keys.join(", "));
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
    //sendLogToServer("Logging raw JSON: " + str);
    return str;  // Always return the raw JSON string
}

function serialize(obj, prefix) {
    //sendLogToServer("Serializing object with prefix: " + prefix);
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
    //sendLogToServer("Setting object stack with args: " + args.join(", "));
    let value = args.length ? args.pop() : null;
    while (args.length) {
        let tmp = {};
        tmp[args.pop()] = value;
        value = tmp;
    }

    return value;
}
