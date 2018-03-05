WebSockets are generally agnostic to whatever client might connect. All of the connections and all of the messages just go into one or two central listeners.

**single-use-socket** is an extension to [get-socket](https://github.com/erikpukinskis/get-socket) that create a reference to a session-specific virtual socket:

```javascript
var SingleUseSocket = require("single-use-socket")
var BrowserBridge = require("browser-bridge")
var WebSite = require("web-site")

var site = new WebSite()

site.addRoute("get", "/", function(request, response) {
  
  var socket = new SingleUseSocket(
    site,
    function() {
      // do something when the socket is connected from the browser
      socket.send("this message will be sent from the server to the browser on connection!")
    }
  )

  var bridge = new BrowserBridge().forResponse(response)

  var helloFromBrowser = socket.defineSendOn(bridge).withArgs("this message will be sent from the browser to the server on page load")

  bridge.asap(helloFromBrowser);

  var listenInBrowser = bridge.defineListenOn(bridge)

  bridge.asap(
    [listenInBrowser],
    function(listen) {
      listen(function(message) {
        // this is where the message from the server will be received in the browser
      })
    }
  )

  bridge.send()

  socket.listen(function(message) {
    // this is where the message from the browser will be received on the server
  }

  socket.onClose(function() {
    // maybe delete the socket here
  })
})
```

