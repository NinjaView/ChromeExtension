"use strict";

function document_init() {
	if (window.hasOwnProperty("user")) {
		const user = window.user;
		relay({
			method: "tradingview.user",
			value: {
				id: user.id || 0,
				channel: user.private_channel || null,
				username: user.username || null,
				userpic: user.userpic || null
			},
		});
	}
}

function relay(msg) {
	window.postMessage(msg, location.origin);
}

const r = (f) => /in/.test(document.readyState) ? f() : setTimeout(r(f), 9);
r(() => {
	document_init()
});
