var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-single-use-socket",

  ["nrtv-socket-server", "querystring", "nrtv-server"],
  function(socketServer, querystring, nrtvServer) {

    var sockets = {}

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

    SingleUseSocket.getReady =
      function() {
        if (!alreadyListening) {
          socketServer.adoptConnections(handleConnection)
          alreadyListening = true
        }
      }

    var alreadyListening = false

    function handleConnection(connection, next) {

      var params = querystring.parse(connection.url.split("?")[1])

      if (id = params.__nrtvSingleUseSocketIdentifier) {

        var socket = sockets[id]

        if (socket) {
          socket.onReady()
          connection.on("data", socket.handler)
          connection.on("close",
            function() {
              delete sockets[id]
            }
          )
          return
        }
      }

      next()
    }

    SingleUseSocket.prototype.url =
      function() {
        return "ws://localhost:"+nrtvServer.getPort()+"/echo/websocket?__nrtvSingleUseSocketIdentifier="+this.identifer
      }
    
    return SingleUseSocket
  }
)