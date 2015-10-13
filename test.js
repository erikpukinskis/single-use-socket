var test = require("nrtv-test")(require)

test.using(
  "receives a message and then stops working (as we would hope)",
  ["./single-use-socket", "nrtv-server", "ws", "nrtv-socket-server", "sinon"],
  function(expect, done, SingleUseSocket, server, WebSocket, socketServer, sinon) {

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

      ws.close()
    })

    server.start(1187)

    ws = new WebSocket(socket.url())

    ws.on("open", function() {
      ws.send("burfday chex", hopeWeUsedTheSUS)
    })

    function hopeWeUsedTheSUS() {

      expect(fallback).not.to.have.been.called

      ws.close()

      setTimeout(function() {
        var other = new WebSocket(socket.url())

        other.on("open", function() {
          other.send("brambo", expectFallbackNow)
        })
      })
    }

    function expectFallbackNow() {
      expect(fallback).to.have.been.called
      done()
      server.stop()
    }

  }
)