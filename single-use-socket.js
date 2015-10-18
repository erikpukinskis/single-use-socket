var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-single-use-socket",

  ["nrtv-socket-server", "nrtv-socket", "querystring", "nrtv-server", "nrtv-browser-bridge"],
  function(socketServer, socket, querystring, nrtvServer, bridge) {

    var sockets = {}
    var adopted = false

    function SingleUseSocket(onReady) {
      SingleUseSocket.getReady()

      this.identifer = Math.random().toString(36).split(".")[1]

      this.onReady = onReady

      sockets[this.identifer] = this
    }

    SingleUseSocket.prototype.listen =
      function(handler) {
        this.handler = handler
      }

    SingleUseSocket.prototype.send =
      function(message) {
        this.connection.write(message)
      }

    SingleUseSocket.prototype.defineListenInBrowser =
      function() {
        var binding = bridge.defineFunction(
          [socket.defineGetInBrowser()],

          function listen(getSocket, id, callback) {

            if (typeof callback != "function") {
              throw new Error("If you want to listen to a socket, you need to provide a function that takes a message and does something with it.")
            }

            getSocket(
              listen,
              "?__nrtvSingleUseSocketIdentifier="+id
            )

            function listen(socket) {
              socket.onmessage = function(event) {
                  callback(event.data)
                }
            }
          }

        )

        return binding.withArgs(this.identifer)  
      }

    SingleUseSocket.prototype.defineSendInBrowser =
      function() {
        var binding = bridge.defineFunction(
          [socket.defineGetInBrowser()],

          function send(getSocket, id, message) {
            getSocket(
              function(socket) {
                socket.send(message)
              },
              "?__nrtvSingleUseSocketIdentifier="+id
            )
          }

        )

        return binding.withArgs(this.identifer)  
      }

    SingleUseSocket.getReady =
      function() {
        if (adopted) { return }
        socketServer.adoptConnections(handleConnection)      
        adopted = true
      }

    function handleConnection(connection, next) {

      var params = querystring.parse(connection.url.split("?")[1])

      var socket = this

      if (id = params.__nrtvSingleUseSocketIdentifier) {

        var socket = sockets[id]

        if (socket) {
          socket.connection = connection

          if (socket.onReady) {
            socket.onReady()
          }

          connection.on("data", function() {
              socket.handler.apply(null, arguments)
            }
          )

          connection.on("close",
            function() {
              delete sockets[id]
              if (socket.onClose) {
                socket.onClose()
              }
            }
          )

          return
        }
      }

      next()
    }

    SingleUseSocket.prototype.onClose =
      function(callback) {
        this.onClose = callback
      }

    SingleUseSocket.prototype.url =
      function() {
        return "ws://localhost:"+nrtvServer.getPort()+"/echo/websocket?__nrtvSingleUseSocketIdentifier="+this.identifer
      }
    
    return SingleUseSocket
  }
)