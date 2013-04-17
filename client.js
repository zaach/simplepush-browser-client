;!function(exports, undefined) {

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
}

var uuid = {
  v4: function() {
    var seed = [s4(), s4(), s4(), s4()];
    Uuid.initialize(seed);
    return Uuid.create();
  }
};

// A rough, minimal browser client
//
// Original native client:
// http://mxr.mozilla.org/mozilla-central/source/dom/push/src/PushService.js

function SimplePushClient (options) {
  this._wsHost = options.pushServer || 'ws://localhost:8180/';
  this.uaid = options.uaid || uuid.v4();
  this._pushEmitter = new EventEmitter2();
}

SimplePushClient.prototype = {

// Starts the websocket connection and begins the handshake with the
// SimplePush server
  init: function(cb) {
    var self = this;

    this._reqs = {};
    this._channels = {};

    var client = new WebSocket(this._wsHost, ["push-notification"]);
    this._connection = client;

    client.onclose = function() {
      console.log('push-notification Connection Closed');
    };

    client.onopen = function() {
      console.log('WebSocket client connected');

      client.onmessage = self._handleMessage.bind(self);

      // Begin the handshake
      self._hello(cb);
    };
  },

  _handleMessage: function (message) {
    var reply;

    console.log("Received: ", message.data);
    try {
      reply = JSON.parse(message.data);
    } catch (e) {
      console.error('Error parsing response: ', e);
      return;
    }

    var handler = '_handle' + reply.messageType[0].toUpperCase() + reply.messageType.slice(1);

    console.log('handle', handler);
    if (this[handler]) this[handler](reply);
  },

  _send: function(action, data) {
    data.messageType = action;
    this._connection.send(JSON.stringify(data));
  },

  _ack: function(channelID, version) {
    this._send('ack', { updates: [{ channelID: channelID, version: version }] });
  },

  _hello: function(cb) {
    console.log('Initiating handshake');
    var data = { messageType: 'hello', uaid: this.uaid || "" };

    data.channelIDs = []; // todo: retrieve previous cids

    this._reqs['hello' + this.uaid] = cb;
    this._connection.send(JSON.stringify(data));
  },

  _handleHello: function(reply) {
    if (!reply.uaid) {
      console.error('no uaid supplied in reply:', reply);
      return;
    } else if (reply.uaid !== this.uaid) {
      // todo: reregister everything
      this.uaid = reply.uaid;
    }
    this.ready = true;
    this._reqs['hello' + this.uaid]();
  },

  register: function(cb) {
    var channelID = uuid.v4();
    this._reqs['reg' + channelID] = cb;
    this._send('register', { channelID: channelID });
  },

  _handleRegister: function(reply) {
    try {
      if (reply.status === 200) {
        var ev = this._channels[reply.channelID] = new EventEmitter2();
        this._reqs['reg' + reply.channelID](null, reply, ev);
      } else {
        this._reqs['reg' + reply.channelID](reply.status);
      }
    } catch (e) {
      console.error('Error registering: ', e);
    }

    delete this._reqs['reg' + reply.channelID];
  },

  unregister: function(channelID, cb) {
    delete this._reqs['reg' + channelID];
    this._reqs['unreg' + channelID] = cb;
    this._send('unregister', { channelID: channelID });
  },

  _handleUnregister: function(reply) {
    try {
      if (reply.status === 200) {
        this._reqs['unreg' + reply.channelID](null, reply);
      } else {
        this._reqs['unreg' + reply.channelID](reply.status);
      }
    } catch (e) {
      console.error('Error unregistering: ', e);
    }

    delete this._reqs['reg' + reply.channelID];
    delete this._channels[reply.channelID];
  },

  _handleNotification: function(reply) {
    this._pushEmitter.emit('push', reply);
    this._send('ack', { updates: reply.updates });
  }
};

exports.SimplePushClient = SimplePushClient;

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);
