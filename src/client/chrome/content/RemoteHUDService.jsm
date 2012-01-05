/* -*- Mode: js2; js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */

const EXPORTED_SYMBOLS = ["RemoteHUDService"];

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function LogFactory(prefix) {
  function log(msg) {
    var msg = prefix + " " + msg + "\n";
      dump(msg);
    }
    return log;
}
let log = LogFactory("*** RemoteHUDService:");


let instance = null;
XPCOMUtils.defineLazyGetter(this, "RemoteHUDService", function () {
  let window = Services.wm.getMostRecentWindow("navigator:browser");
  return instance = new RemoteHUDServiceImpl(window);
});

function RemoteHUDServiceImpl(window) {
  this._window = window;;
  window.messageManager.addMessageListener("console", this);
  window.addEventListener("unload", this.disconnect.bind(this));
};

const STATE_CONNECTING = 0;
const STATE_OPEN = 1;
const STATE_CLOSED = 2;

RemoteHUDServiceImpl.prototype = {
  STATE_CONNECTING: STATE_CONNECTING,
  STATE_OPEN: STATE_OPEN,
  STATE_CLOSED: STATE_CLOSED,

  state: STATE_CLOSED,

  _socket: null,
  connect: function rhs_connect(server) {
    if (this.state == this.STATE_OPEN)
      return;
    this.state = this.STATE_CONNECTING;
    this._server = server;

    log("looking for a server to connect to...");
    let window = this._window;
    let socket = this._socket = window.WebSocket(server);

    socket.onopen = this.onopen.bind(this);
    socket.onclose = this.onclose.bind(this);
    socket.onerror = this.onerror.bind(this);
    socket.onmessage = this.onmessage.bind(this);
  },

  ondisconnect: null,
  disconnect: function rhs_disconnect() {
    if (this.state == this.STATE_CLOSED)
      return;
    this.state = this.STATE_CLOSED;

    this._socket = null;

    if (this.ondisconnect)
      this.ondisconnect();
  },

  onconnect: null,
  onopen: function rhs_onOpen() {
    log("websocket opened");
    this.state = this.STATE_OPEN;

    if (this.onconnect)
      this.onconnect();
  },

  onclose: function rhs_onClose() {
    if (this.state != this.STATE_OPEN)
      return;

    log("websocket closed");
    this.state = this.STATE_CONNECTING;
  },

  onerror: function rhs_onError(evt) {
    log("websocket error");

    this.state = this.STATE_CONNECTING;

    const kReconnectTimeout = 2000;
    this._window.setTimeout(function(self) {
      self.connect(self._server);
    }, kReconnectTimeout, this);
  },

  onmessage: function rhs_sendMessage(msg) {
    if (this.state != this.STATE_OPEN)
      return;

    log("websocket message: " + msg.data);
    let messageManager = this._window.messageManager;
    messageManager.sendAsyncMessage("console", JSON.parse(msg.data));
  },

  receiveMessage: function rhs_receiveMessage(msg) {
    if (this.state != this.STATE_OPEN)
      return;

    log("websocket send message: " + msg.json.level);
    this._socket.send(JSON.stringify(msg.json));
  }
};

