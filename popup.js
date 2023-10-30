
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckbox('manualTrade');
    loadSettings();
    attachButtonListeners();
    attachInputListeners();
    checkPaymentStatus();
    //setupToggles();

    const autoTradeCheckbox = document.getElementById('autoTrade2');
    autoTradeCheckbox.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the checkbox from being checked
        alert("Please use the webhook instead. This feature was disabled because of user named 'dieded' from Reddit'. ");
    });
});


function checkPaymentStatus() {
    const autoTradeLabel = document.getElementById('autoTradeLabel'); 

    extpay.getUser().then(user => {
        if (user && user.paid) {
            autoTradeLabel.textContent = "Thanks for the payment!";
            chrome.storage.local.set({ userPaid: true }); // Set user paid status to true
        } else {
            autoTradeLabel.textContent = "Please consider paying for the extension.";
            

            chrome.storage.local.set({ userPaid: false }); // Set user paid status to false
        }
    });
}

document.getElementById('manualTrade').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "activateContentScript" });
    });
});
//function //sendlogtoserver(message) {
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


function setupToggles() {
    let webhookCheckbox = document.getElementById('webhook');
    //let autoTradeCheckbox = document.getElementById('autoTrade');

    // Load saved states from storage when the popup is opened
    chrome.storage.local.get(['webhookEnabled'], function(data) {

    //chrome.storage.local.get(['webhookEnabled', 'autoTradeEnabled'], function(data) {
        webhookCheckbox.checked = data.webhookEnabled || false;
        //autoTradeCheckbox.checked = data.autoTradeEnabled || false;
    });

    const changeHandler = function (checkbox, otherCheckbox, storageKey, otherStorageKey) {
        chrome.storage.local.get(['userPaid', 'userEmail', 'invalidEmail'], async function (result) {
            const userPaid = result.userPaid || false;
            let userEmail = result.userEmail || null;
            const invalidEmail = result.invalidEmail || false;
    
            //sendlogtoserver(`User status - Paid: ${userPaid}, Email: ${userEmail || "not set"}, Invalid Email: ${invalidEmail}`);
    
            if (!userPaid) {
                if (!userEmail || invalidEmail) {
                    userEmail = prompt("Please enter your email to verify your subscription:");
                    if (userEmail && userEmail.trim()) {
                        userEmail = userEmail.trim();
    
                        // Simple email validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(userEmail)) {
                            alert("Please enter a valid email address.");
                            chrome.storage.local.set({ invalidEmail: true });
                            checkbox.checked = false;
                            return;
                        }
    
                        // Check the subscription status
                        try {
                            const isSubscribed = await checkSubscription(userEmail);
                            if (!isSubscribed) {
                                alert("Subscription check failed. Please ensure you have a valid subscription.");
                                chrome.tabs.create({ url: 'https://buy.stripe.com/7sI039dCGeHE3Bu7st' });
                                checkbox.checked = false;
                                return;
                            } else {
                                // Save the validated, trimmed, and verified email locally
                                chrome.storage.local.set({ userEmail: userEmail, invalidEmail: false, userPaid: true });
                            }
                        } catch (error) {
                            console.error('Error checking subscription:', error);
                            alert("There was an error checking your subscription. Please try again later.");
                            checkbox.checked = false;
                            return;
                        }
                    } else {
                        alert("You must enter a valid email to use this feature.");
                        checkbox.checked = false;
                        return;
                    }
                }
            } else {
                // If the user is already paid, we still want to check if their subscription is valid
                try {
                    const isSubscribed = await checkSubscription(userEmail);
                    if (!isSubscribed) {
                        alert("Your subscription has expired or is invalid. Please ensure you have a valid subscription.");
                        chrome.tabs.create({ url: 'https://buy.stripe.com/7sI039dCGeHE3Bu7st' });
                        checkbox.checked = false;
                        chrome.storage.local.set({ userPaid: false });
                        return;
                    }
                } catch (error) {
                    console.error('Error checking subscription:', error);
                    alert("There was an error checking your subscription. Please try again later.");
                    checkbox.checked = false;
                    return;
                }
            }
    
            // Handle toggles
            if (checkbox.checked) {
                otherCheckbox.checked = false;
                let storageData = {};
                storageData[storageKey] = true;
                storageData[otherStorageKey] = false;
                chrome.storage.local.set(storageData);
            } else {
                let storageData = {};
                storageData[storageKey] = false;
                chrome.storage.local.set(storageData);
            }
        });
    };
    

      
    
    
    

    //webhookCheckbox.addEventListener('change', function() {
        //changeHandler(webhookCheckbox, autoTradeCheckbox, 'webhookEnabled');//, 'autoTradeEnabled');
    //});

    //autoTradeCheckbox.addEventListener('change', function() {
        //changeHandler(autoTradeCheckbox, webhookCheckbox, 'autoTradeEnabled', 'webhookEnabled');
    //});
}

document.addEventListener('DOMContentLoaded', setupToggles);



//function setupAutoTradeToggle() {
    //const autoTradeToggle = document.getElementById('autoTrade');
    
    //autoTradeToggle.addEventListener('change', function() {
        //extpay.getUser().then(user => {
            //if (!user || !user.paid) {
                //this.checked = false;  
                //extpay.openPaymentPage();
            //} else {
                //let obj = {};
                //obj['autoTrade'] = this.checked;
                //chrome.storage.sync.set(obj);  // Save the state of the autoTrade toggle
            //}
        //});
    //});
//}


function initializeCheckbox(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
        chrome.storage.sync.get([checkboxId], function(result) {
            checkbox.checked = !!result[checkboxId];
        });

        checkbox.addEventListener('change', function() {
            let obj = {};
            obj[checkboxId] = this.checked;
            chrome.storage.sync.set(obj);
        });
    }
}


function toggleScriptInjection(isOn) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const action = isOn ? "injectScript" : "resetScript";
    chrome.tabs.sendMessage(tabs[0].id, { action: action }, function(response) {
      console.log(`Response from content-script for action: ${action}`, response);
    });
  });
}
//

//
const toggleSwitch = document.getElementById("manualTrade");
toggleSwitch.addEventListener("change", function() {
  toggleScriptInjection(toggleSwitch.checked);
});

// Initialize checkbox based on stored state
chrome.storage.sync.get(['manualTradeState'], function(result) {
  if(result.hasOwnProperty('manualTradeState')) {
      toggleSwitch.checked = result.manualTradeState;
  }
});

// Save checkbox state
toggleSwitch.addEventListener('change', function() {
  chrome.storage.sync.set({'manualTradeState': this.checked});
saveSettings();
});




// Load saved settings from storage
function loadSettings() {
    chrome.storage.sync.get(["account", "ticker", "quantity", "keepConnection", "autoTrade"], function(items) {
        if (items.account) {
            document.getElementById("accountInput").value = items.account;
        }
        if (items.ticker) {
            document.getElementById("tickerInput").value = items.ticker;
        }
        if (items.quantity) {
            document.getElementById("qtyInput").value = items.quantity;
        }
        if (items.keepConnection !== undefined) {
            document.getElementById("keepConnection").checked = items.keepConnection;
        }
        if (items.autoTrade !== undefined) {
            document.getElementById("autoTrade").checked = items.autoTrade;
        }
    });
}


// Attach event listeners to buttons
function attachButtonListeners() {
    const actionMessageMap = {
        "marketLong": "Market Long",
        "marketShort": "Market Short",
        "marketClose": "Close All"
    };

    Object.keys(actionMessageMap).forEach(action => {
        const button = document.getElementById(action);
        if (button) {
            button.addEventListener("click", () => {
                sendMessageToHTTPServer(actionMessageMap[action]);
            });
        }
    });
}


// Attach event listeners to input fields
function attachInputListeners() {
    const inputs = ["accountInput", "tickerInput", "qtyInput"];
    inputs.forEach(input => {
        const field = document.getElementById(input);
        if (field) {
            field.addEventListener("input", saveSettings);
        }
    });
}


// Save settings to storage
function saveSettings() {
    const account = document.getElementById("accountInput").value;
    const ticker = document.getElementById("tickerInput").value;
    const quantity = document.getElementById("qtyInput").value;

    chrome.storage.sync.set({
        "account": account, 
        "ticker": ticker,
        "quantity": quantity
    }, function() {
        console.log(`Account, Ticker, and Quantity saved. Account: ${account}, Ticker: ${ticker}, Quantity: ${quantity}`);
    });
}


// Send message to HTTP server
function sendMessageToHTTPServer(alertType) {
    const account = document.getElementById("accountInput").value;
    const ticker = document.getElementById("tickerInput").value;
    const qty = document.getElementById("qtyInput").value;  // Assuming you have an input field with id "qtyInput"
    console.log(`Sending message to HTTP server: Alert: ${alertType}, Account: ${account}, Ticker: ${ticker}, Qty: ${qty}`);

    const payload = {
        alert: alertType,
        account: account,
        ticker: ticker,
        qty: qty  // Add the qty value to your payload here
    };

    fetch('http://localhost:5001/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            console.log(`Server response error: ${response.status}`);
            throw new Error(`Server response: ${response.status}`);
        }
    })
    .then(data => {
        console.log('Success: ' + JSON.stringify(data));
    })
    .catch((error) => {
        console.log('Fetch Error: ' + error.toString());
    });
}



// ... (rest of your code)

function showWindow(isToggledOn) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const action = isToggledOn ? "showWindow" : "removeContentScript";
    chrome.tabs.sendMessage(tabs[0].id, { action: action }, function(response) {
      //sendlogtoserver(`Response from content-script for action: ${action}`, response);
    });
  });
}


const toggleDebug = e => chrome.storage.local.set({ntv_debug: e.target.checked});

const addDebugToggler = () => {
    const checkbox = document.getElementById('toggle_debug');

    getFromStorage('ntv_debug', 'local').then(result => checkbox.checked = result?.ntv_debug);
    checkbox.addEventListener('change', toggleDebug);
};

const markStatusSuccessful = (elementId) => {
    const statusCol = document.getElementById(`${elementId}-status`);

    statusCol.classList.remove('danger');
    statusCol.classList.add('success');
    statusCol.textContent = '✓';
}


  
const setChromeUser = (user) => {
    if (!user) return;
    markStatusSuccessful('chrome-account');
    document.getElementById('chrome-account-email').textContent = user.email;
}

const setTradingViewUser = (user) => {
    if (!user) return;

    markStatusSuccessful('tradingview-account')
    document.getElementById('trdvw_user_name').textContent = user.username;
}
function checkSubscription(email) {
    //sendlogtoserver("Sending email to server for subscription check:", email);
    return new Promise((resolve, reject) => {
        console.log("Checking subscription for email:", email);

        // Logging the email and request data to the server
        //sendlogtoserver(`Checking subscription for email: ${email}`);

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
            //sendlogtoserver(`Error checking subscription: ${error}`);
            reject(error);
        });
    });
}


  r(() => {
    chrome.identity.getProfileUserInfo({accountStatus: "ANY"}, async userInfo => {
      if (userInfo.email) {
        setChromeUser(userInfo)
        try {
          const isSubscribed = await checkSubscription(userInfo.email);
          chrome.storage.local.set({ userPaid: isSubscribed });
        } catch (error) {
          console.error('Error checking subscription:', error);
          chrome.storage.local.set({ userPaid: false });  // consider the user as not subscribed in case of an error
        }
        setChromeUser(userInfo);
      }
    });
  
    addDebugToggler();
    getFromStorage('trdvwUser').then(result => setTradingViewUser(result.trdvwUser));
  });
  


