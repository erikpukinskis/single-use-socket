var test = require("nrtv-test")(require)
var library = test.library


test.using(
  "defines listen and send functions in the browser",
  ["./single-use-socket", "nrtv-browse", "nrtv-browser-bridge", library.reset("nrtv-server")],
  function(expect, done, SingleUseSocket, browse, bridge, server) {

    var socket = new SingleUseSocket(
      function() {
        socket.send("hi!")
      }
    )

    var getFresh = socket.defineSendInBrowser().withArgs("but mooooom")

    var win = bridge.defineFunction(
      [getFresh],
      function gerrymander(getFresh, message) {
        if (message != "hi!") {
          throw new Error("message should be \"hi!\", y'all")
        }
        document.querySelector("body").innerHTML = "all your representative are belong to us"
        getFresh()
      }
    )

    var listen = socket.defineListenInBrowser().withArgs(win)

    socket.listen(function(message) {

      expect(message).to.equal("but mooooom")

      browser.assert.text("body", "all your representative are belong to us")

      done()
      server.stop()
    })

    bridge.asap(listen)

    server.get("/", bridge.sendPage())

    server.start(9913)

    var browser = browse("http://localhost:9913")
  }
)


setTimeout(function() {
test.using(
  "receives a message and then stops working (as we would hope)",
  ["./single-use-socket", library.reset("nrtv-server"), "ws", "nrtv-socket-server", "sinon", "nrtv-browse", "nrtv-browser-bridge"],
  function(expect, done, SingleUseSocket, server, WebSocket, socketServer, sinon, browse, bridge) {

    var fallback = sinon.spy()

    socketServer.adoptConnections(
      function(connection, next) {
        fallback()
      }
    )

    var ws
    var isConnected

    var socket = new SingleUseSocket(
      function() {
        isConnected =true
      }
    )

    socket.listen(function(message) {
      expect(isConnected).to.be.true

      expect(message).to.equal("burfday chex")

      expect(fallback).not.to.have.been.called

      done.ish("got a message")
      ws.close()
    })

    socket.onClose(function() {
      var other = new WebSocket(socket.url())

      other.on("open", function() {
        other.send("brambo", expectFallback)
      })
    })

    function expectFallback() {
      expect(fallback).to.have.been.called
      done()
      server.stop()
    }

    server.start(1187)

    ws = new WebSocket(socket.url())

    ws.on("open", function() {
      ws.send("burfday chex")
    })

  }
)
},100) // Yuck. There are issues if these tests run simultaneously. They should be fixed.
