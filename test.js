var test = require("nrtv-test")(require)

test.using(
  "stops working after the connection is closed",
  ["./", "nrtv-server", "ws", "get-socket", "sinon", "nrtv-browse", "nrtv-browser-bridge"],
  function(expect, done, SingleUseSocket, Server, WebSocket, getSocket, sinon, browse, bridge) {

    var server = new Server()

    var fallback = sinon.spy()

    getSocket.handleConnections(
      server,
      function(connection, next) {
        fallback()
      }
    )

    var ws
    var isConnected

    var socket = new SingleUseSocket(
      server,
      function() {
        isConnected = true
      }
    )

    socket.listen(function(message) {
      expect(isConnected).to.be.true
      done.ish("connected")

      expect(message).to.equal("burfday chex")
      done.ish("sent message")

      expect(fallback).not.to.have.been.called

      done.ish("didn't call fallback")
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
      testInterface()
    }

    server.start(1187)

    ws = new WebSocket(socket.url())

    ws.on("open", function() {
      ws.send("burfday chex")
    })

  }
)


function testInterface() {

  test.using(
    "listen on server",
    ["./", "nrtv-server", "ws"],
    function(expect, done, SingleUseSocket, Server, WebSocket) {
      var server = new Server()
      var socket = new SingleUseSocket(server)
      server.start(8765)

      socket.listen(function(message) {
        expect(message).to.equal("barb")
        server.stop()
        done()
      })

      var ws = new WebSocket(
        socket.url()
      )
         
      ws.on("open", function() {
        ws.send("barb")
      })

    }
  )

  test.using(
    "send from server",
    ["./", "nrtv-server", "ws"],
    function(expect, done, SingleUseSocket, Server, WebSocket) {

      var server = new Server()
      var socket = new SingleUseSocket(server)
      server.start(4491)

      var ws = new WebSocket(
        socket.url()
      )

      ws.on("message",
        function(message) {
          expect(message).to.equal("justice")
          done()
          server.stop()
        }
      )

      socket.send("justice")
    }
  )

  test.using(
    "send from browser",
    ["./", "nrtv-browse", "browser-bridge", "nrtv-server"],
    function(expect, done, SingleUseSocket, browse, BrowserBridge, Server) {

      var server = new Server()
      var socket = new SingleUseSocket(server)
      var finishUp
      var heardBack = false

      socket.listen(function(message) {
        expect(message).to.equal("jones")
        if (finishUp) { finishUp() }
        else { heardBack = true }
      })

      var bridge = new BrowserBridge()

      var jones = socket.defineSendOn(bridge).withArgs("jones")

      bridge.asap(jones)

      server.addRoute("get", "/", bridge.sendPage())

      server.start(9913)

      browse("http://localhost:9913",
        function(browser) {
          finishUp = function() {
            browser.done()
            server.stop()
            done()
          }
          if (heardBack) { finishUp() }
        }
      )

    }
  )

  test.using(  
    "listen in browser",
    ["./", "nrtv-browse", "browser-bridge", "nrtv-server", "make-request"],
    function(expect, done, SingleUseSocket, browse, BrowserBridge, Server, makeRequest) {

      var server = new Server()
      var socket = new SingleUseSocket(server)
      var finishUp
      var bridge = new BrowserBridge()

      var listen = bridge.defineFunction(
        [
          socket.defineListenOn(bridge),
          makeRequest.defineOn(bridge)
        ],
        function(listen, makeRequest) {
          listen(function(message) {
            makeRequest("/finish", {
              method: "post",
              data: {message: message}
            })
          })

          makeRequest("/ready", {method: "post"})
        }
      )
      
      bridge.asap(listen)

      server.addRoute("post", "/finish",
        function(request, response) {
          response.json({})
          expect(request.body.message).to.equal("yum")
          finishUp()
        }
      )

      server.addRoute("post", "/ready",
        function(request, response) {
          response.json({})
          socket.send("yum")
        }
      )

      server.addRoute("get", "/", bridge.sendPage())

      server.start(9155)

      browse("http://localhost:9155",
        function(browser) {
          finishUp = function() {
            browser.done()
            server.stop()
            done()
          }
        }
      )
    }
  )

}
