
let debug = false;
function log(str) {
  if (!debug)
    return;

  dump('Console Gaia: ' + str + '\n');
};

try {
  // XXX All this pref code is a dumb hack. We should use a cool XPCOM
  let GAIA_PREF_NAME = 'gaia.debug.webSocket';
  Components.utils.import("resource://gre/modules/Services.jsm");
  if (!Services.prefs.getBoolPref(GAIA_PREF_NAME, false)) {
    Services.prefs.setBoolPref(GAIA_PREF_NAME, true);
    window.addEventListener('unload', function() {
      Services.prefs.setBoolPref(GAIA_PREF_NAME, false);
    });

    let contentScript = 'chrome://gaia-client/content/content.js';
    messageManager.loadFrameScript(contentScript, true);

    remoteWebConsole('ws://localhost:6789');
  }
} catch(e) {
  dump(e + '\n');
}


function remoteWebConsole(server) {
  let socket = null;

  function consoleProxy(msg) {
    socket.send(JSON.stringify(msg.json));
  };

  const kWebSocketConnectTimeout = 2000;
  window.setInterval(function () {
    if (socket && socket.readyState <= socket.OPEN)
      return;
    socket = new WebSocket(server);

    log('looking for a server to connect to...');
    socket.onopen = function ws_open() {
      messageManager.addMessageListener('console', consoleProxy);

      log('websocket opened');
    };

    socket.onclose = function ws_close() {
      messageManager.removeMessageListener('console', consoleProxy);
      log('websocket closed');
    };

    socket.onerror = function ws_error(evt) {
      messageManager.removeMessageListener('console', consoleProxy);
      log('websocket error');
    };

    socket.onmessage = function ws_message(msg) {
      log('websocket message: ' + msg.data);
      messageManager.sendAsyncMessage('console', JSON.parse(msg.data));
    };
  }, kWebSocketConnectTimeout);
}

