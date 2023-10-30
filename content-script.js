

if (!window.hasOwnProperty('livePriceInterval')) {
    window.livePriceInterval = null;
}
if (!window.hasOwnProperty('pnlInterval')) {
    window.pnlInterval = null;
}


if (!window.myContentScriptVarsDeclared) {
    let livePriceInterval;
    let pnlInterval;
    window.myContentScriptVarsDeclared = true;
}

function resetContentScript() {
  if (window.livePriceInterval) {
    clearInterval(window.livePriceInterval);
    window.livePriceInterval = null; // Resetting the interval
  }
  if (window.pnlInterval) {
    clearInterval(window.pnlInterval);
    window.pnlInterval = null; // Resetting the interval
  }

  const container = document.getElementById('myCustomWindow');
  if (container) {
    container.remove();
  }

  window.myContentScriptInjected = false;
}

let isActivated = false;
let livePriceInterval;
let pnlInterval;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'activateContentScript') {
        isActivated = !isActivated;
        if (isActivated) {
            mainFunction();
        } else {
            // Stop intervals and reset functionalities
            clearInterval(livePriceInterval);
            clearInterval(pnlInterval);
            resetContentScript();
        }
    }
});

function mainFunction() {
    if (!window.myContentScriptInjected) {function injectCustomWindow() {
    // Create the container
    const container = document.createElement('div');
    container.id = 'myCustomWindow';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.border = '2px solid black';
    container.style.padding = '10px';
    container.style.zIndex = '9999'; // make sure it's on top

    // Create a display wrapper for live price and PnL
    const displayWrapper = document.createElement('div');
    displayWrapper.style.display = 'flex';
    displayWrapper.style.justifyContent = 'flex-start'; // Align items to the start
    container.appendChild(displayWrapper);

    // Create a live price display
    const livePriceDisplay = document.createElement('div');
    livePriceDisplay.id = 'livePrice';
    livePriceDisplay.innerHTML = 'Live Price: N/A';
    livePriceDisplay.style.display = 'inline-block';
    livePriceDisplay.style.marginRight = '20px';  // Add right margin
    displayWrapper.appendChild(livePriceDisplay);

    // Create a PnL display
    const pnlDisplay = document.createElement('div');
    pnlDisplay.id = 'pnlDisplay';
    pnlDisplay.innerHTML = 'PnL: N/A';
    pnlDisplay.style.display = 'inline-block';
    displayWrapper.appendChild(pnlDisplay);

// Create a quantity input field
const qtyInput = document.createElement('input');
qtyInput.id = 'qtyInput';
qtyInput.type = 'number';
qtyInput.placeholder = 'Quantity';
container.appendChild(qtyInput);

// Create account input field
const accountInput = document.createElement('input');
accountInput.id = 'accountInput';
accountInput.type = 'text';
accountInput.placeholder = 'Account';
container.appendChild(accountInput);

// Create ticker input field
const tickerInput = document.createElement('input');
tickerInput.id = 'tickerInput';
tickerInput.type = 'text';
tickerInput.placeholder = 'Ticker';
container.appendChild(tickerInput);

// Load the settings from storage and populate the input fields
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
});


    const buttonActionMap = {
        'BUY': 'marketLong',
        'SELL': 'marketShort',
        'CLOSE BUY': 'marketClose', 
        'CLOSE SELL': 'marketClose'
    };

    const actionMessageMap = {
        'marketLong': 'Market Long',
        'marketShort': 'Market Short',
        'marketClose': 'Close All'
    };

// Create buttons
// Create buttons
const buttonTypes = ['BUY', 'SELL', 'CLOSE BUY', 'CLOSE SELL'];

for (const type of buttonTypes) {
  const button = document.createElement('button');
  button.innerHTML = type;
  button.onclick = function() {
    console.log(`Button ${type} clicked with quantity: ${qtyInput.value}`);
    
    // Call sendMessageToHTTPServer based on button type
    if (type === 'BUY') {
      sendMessageToHTTPServer("Market Long");
      simulateTradingViewBuyClick();
    } else if (type === 'SELL') {
      sendMessageToHTTPServer("Market Short");
      simulateTradingViewSellClick();
    } else if (type === 'CLOSE BUY' || type === 'CLOSE SELL') {
      sendMessageToHTTPServer("Market All");
      simulateTradingViewClosePositionClick();
    }

    // Add your other trading logic here
  };

  container.appendChild(button);
}



function simulateTradingViewClosePositionClick() {
  const tradingViewClosePositionButton = document.querySelector('[data-tooltip="Close the position"]');
  if (tradingViewClosePositionButton) {
    tradingViewClosePositionButton.click();
  } else {
    console.log('Could not find the TradingView Close Position button');
  }
}

  // Variables to hold drag state and position
  let isDragging = false;
  let offsetX, offsetY;

  // Mouse down event to start dragging
  const startDrag = (e) => {
    isDragging = true;
    container.style.position = 'absolute'; // Switch to absolute positioning
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left - window.scrollX;
    offsetY = e.clientY - rect.top - window.scrollY;
  };


  // Mouse up event to stop dragging
  const stopDrag = () => {
    isDragging = false;
  };

  // Mouse move event to handle dragging
  const performDrag = (e) => {
    if (isDragging) {
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    }
  };

  // Attach event listeners
  container.addEventListener('mousedown', startDrag);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('mousemove', performDrag);

  // Insert the container into the body
  document.body.appendChild(container);

  // Now that the container is in the DOM, sync the quantity
  //syncQuantity();
}

// Function to simulate a click on the TradingView Buy button
function simulateTradingViewBuyClick() {
  const tradingViewBuyButton = document.querySelector('.buyButton-hw_3o_pb');
  if (tradingViewBuyButton) {
    tradingViewBuyButton.click();
  } else {
    console.log('Could not find the TradingView Buy button');
  }
}

// Function to simulate a click on the TradingView Sell button
function simulateTradingViewSellClick() {
  const tradingViewSellButton = document.querySelector('.sellButton-hw_3o_pb');
  if (tradingViewSellButton) {
    tradingViewSellButton.click();
  } else {
    console.log('Could not find the TradingView Sell button');
  }
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


// Function to update live price
function updateLivePrice() {
  try {
    const livePriceElement = document.getElementById('livePrice');
    if (livePriceElement && document.querySelector("title")) {
      const livePrice = document.querySelector("title").text.split(" ")[1];
      livePriceElement.innerHTML = `Live Price: ${livePrice}`;
    }
  } catch (e) {
    console.error("An error occurred:", e);
  }
}

// Function to update PnL
function updatePnL() {
  const pnlElement = document.getElementById('pnlDisplay');
  const pnlValueElement = document.querySelector('.balance-column:nth-child(3) > div');
  
  if (pnlElement && pnlValueElement) {
    const pnl = pnlValueElement.textContent.trim();
    pnlElement.innerHTML = `PnL: ${pnl}`;

    // Check if the number is enclosed in parentheses
    if (pnl.startsWith("(") && pnl.endsWith(")")) {
      pnlElement.style.color = 'red';
    } else {
      const pnlNumeric = parseFloat(pnl.replace(/[^0-9.-]+/g, ''));

      // Check if pnlNumeric is a number
      if (isNaN(pnlNumeric)) {
        console.error("Failed to parse PnL value:", pnl);
        return;
      }

      if (pnlNumeric > 0) {
        pnlElement.style.color = 'green';
      } else {
        pnlElement.style.color = 'black';
      }
    }
  }
}





// Check which website we're on and execute accordingly
const currentURL = window.location.href;

if (currentURL.includes('tradingview.com')) {
  // Register this tab as the TradingView tab
  chrome.runtime.sendMessage({ action: 'registerTradingView' });

  // Inject the custom window and update periodically
  injectCustomWindow();
  setInterval(() => {
    updateLivePrice();
    updatePnL();
  }, 1000);  // updates every second



} else if (currentURL.includes('tradovate.com')) { // Replace 'tradovate.com' with the actual domain
  // Function to grab PnL from Tradovate and send to background
  function grabAndSendPnL() {
    const balanceColumns = document.querySelectorAll('.balance-column');

    for (const column of balanceColumns) {
      const textElement = column.querySelector('.text-muted');
      if (textElement && textElement.textContent.includes('Open P/L')) {
        const pnlElement = column.querySelector('.currency-wrap');
        if (pnlElement) {
          const pnl = pnlElement.textContent.trim().split(' ')[0];
          chrome.runtime.sendMessage({ action: 'setPnL', pnl });
          break;
        }
      }
    }
  }

  setInterval(grabAndSendPnL, 1000);
}

// Message listener for all sites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updatePnL') {
    const pnlElement = document.getElementById('pnlDisplay');
    if (pnlElement) {
      // Set the PnL text
      pnlElement.innerHTML = `PnL: ${request.pnl}`;
      
      // Change the color based on the PnL value
      const pnlValue = parseFloat(request.pnl);
      if (pnlValue > 0) {
        pnlElement.style.color = 'lime';
      } else if (pnlValue < 0) {
        pnlElement.style.color = 'red';
      } else {
        pnlElement.style.color = 'grey';  // Default color for zero
      }
    }
  } else if (request.action === "removeContentScript") {
    resetContentScript();
  } else if (request.action === "injectScript") {
    if (!window.myContentScriptInjected) {
      injectCustomWindow();
      livePriceInterval = setInterval(updateLivePrice, 1000);
      pnlInterval = setInterval(updatePnL, 1000);
      window.myContentScriptInjected = true;
    }
  } else if (request.action === "resetScript") {
    resetContentScript();
  }
});
    }
}