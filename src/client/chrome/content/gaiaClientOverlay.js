
(function() {
  Cu.import('chrome://gaia-client/content/RemoteHUDService.jsm');

  if (RemoteHUDService.state == RemoteHUDService.STATE_CLOSED) {
    let script = 'chrome://gaia-client/content/content.js';
    messageManager.loadFrameScript(script, true);

    RemoteHUDService.connect('ws://localhost:6789');
    RemoteHUDService.ondisconnect = function() {
      messageManager.removeDelayedFrameScript(script);
    };
  }
})();

