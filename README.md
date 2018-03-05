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
      socket.send("hello!")
    }
  )

  var bridge = new BrowserBridge().forResponse(response)

  var helloFromBrowser = socket.defineSendOn(bridge).withArgs("jones")

  bridge.asap(helloFromBrowser);

  var listenInBrowser = bridge.defineListenOn(bridge)

  bridge.asap(
    [listenInBrowser],
    function(listen) {
      listen(function(fromServer) {
        if (!fromServer.match(/!/)) {
          throw new Error("needs more enthusiasm")
        }
      })
    }
  )

  bridge.send()

  socket.listen(function(message) {
    // handle a message from the browser
  }

  socket.onClose(function() {
    // maybe delete the socket from memory
  })
})
```

