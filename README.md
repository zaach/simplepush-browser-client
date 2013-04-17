simplepush-browser-client
=========================

rough thing for testing. nothing to see here. A native browser client is in the works. (TODO: bug number)

To use the client, first run the example found in the [server repository](https://github.com/zaach/node-simplepush).
Then you should be able to open the example page here and connect.


Client API
====

### var client = new SimplePUshClient(options)

Options may include:

* `pushServer`: the WebSocket URL of the SimplePush server the client should connect to
* `uaid`: a unique UserAgent ID. Defaults to a random uuid (version 4).

### client.init(cb)
Arguments:

* `cb`: fired once the client connects and completes the handshake

### client.register(cb)
Arguments:

* `cb`: callback called with three arguments:
  * An error if any, or null
  * A response object with `channelID` and `pushEndpoint` keys
  * A channel object that can receive push notifications. Attach a `push` event handler to the channel object to receive the notifications. E.g.


```
client.register(function(err, reply, channel) {
  console.log('Channel ID', reply.channelID);
  console.log('Endpoint: ', reply.pushEndpoint);

  channel.on('push', function(err, update) {
    console.log('Reveived update:', update.version);
  });
});
```


### client.unregister(channelID, cb)
Arguments:

* `channelID`: The channel to unregister
* `cb`: callback when unregistration completes

