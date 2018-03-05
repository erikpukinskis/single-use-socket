var runTest = require("run-test")(require)

runTest(
  "stops working after the connection is closed",
  ["./", "web-site", "ws", "get-socket", "sinon"],
  function(expect, done, SingleUseSocket, WebSite, WebSocket, getSocket, sinon) {

    var site = new WebSite()

    var fallback = sinon.spy()

    getSocket.handleConnections(
      site,
      function(connection, next) {
        fallback()
      }
    )

    var ws
    var isConnected

    var socket = new SingleUseSocket(
      site,
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
      site.stop()
      testInterface()
    }

    site.start(1187)

    ws = new WebSocket(socket.url())

    ws.on("open", function() {
      ws.send("burfday chex")
    })

  }
)

function testInterface() {

  runTest(
    "listen on server",
    ["./", "web-site", "ws"],
    function(expect, done, SingleUseSocket, WebSite, WebSocket) {
      var site = new WebSite()
      var socket = new SingleUseSocket(site)
      site.start(8765)

      socket.listen(function(message) {
        expect(message).to.equal("barb")
        site.stop()
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

  runTest(
    "send from server",
    ["./", "web-site", "ws"],
    function(expect, done, SingleUseSocket, WebSite, WebSocket) {

      var site = new WebSite()
      var socket = new SingleUseSocket(site)
      site.start(4491)

      var ws = new WebSocket(
        socket.url()
      )

      ws.on("message",
        function(message) {
          expect(message).to.equal("justice")
          done()
          site.stop()
        }
      )

      socket.send("justice")
    }
  )

  runTest(
    "send from browser",
    ["./", "browser-task", "browser-bridge", "web-site"],
    function(expect, done, SingleUseSocket, browserTask, BrowserBridge, WebSite) {

      var site = new WebSite()
      var socket = new SingleUseSocket(site)
      var heardBack = false

      socket.listen(function(message) {
        expect(message).to.equal("jones")
        heardBack = true
        finishUp()
      })

      var bridge = new BrowserBridge()

      var jones = socket.defineSendOn(bridge).withArgs("jones")

      bridge.asap(jones)

      site.addRoute("get", "/", bridge.requestHandler())

      site.start(9913)

      var browser = browserTask("http://localhost:9913", finishUp)

      function finishUp() {
        if (!heardBack) {
          return console.log("didn't get message from browser yet")}

        if (!browser.ready) {
          return console.log("didn't get browser reference back yet")}

        browser.done()
        site.stop()
        done()}

    }
  )

  runTest(  
    "listen in browser",
    ["./", "browser-task", "browser-bridge", "web-site", "make-request"],
    function(expect, done, SingleUseSocket, browserTask, BrowserBridge, WebSite, makeRequest) {

      var site = new WebSite()
      var socket = new SingleUseSocket(site)
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

      var finished = false

      site.addRoute("post", "/finish",
        function(request, response) {
          response.json({})
          expect(request.body.message).to.equal("yum")
          finished = true
          finishUp()
        }
      )

      site.addRoute("post", "/ready",
        function(request, response) {
          response.json({})
          socket.send("yum")
        }
      )

      site.addRoute("get", "/", bridge.requestHandler())

      site.start(9155)

      var browser = browserTask("http://localhost:9155", finishUp)

      var ready = false

      function finishUp() {
        if (!finished || !browser.ready) { return }

        browser.done()
        site.stop()
        done()
      }
    }
  )

}
