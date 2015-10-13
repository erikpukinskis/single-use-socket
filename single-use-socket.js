var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-single-use-socket",

  ["nrtv-socket-server", "querystring", "nrtv-server"],
  function(socketServer, querystring, nrtvServer) {

    var alreadyListening = false
    var handlers = {}

    function SingleUseSocket(handler) {
      if (!alreadyListening) {
        socketServer.adoptConnections(handleConnection)
        alreadyListening = true
      }

      this.identifer = Math.random().toString(36).split(".")[1]

      handlers[this.identifer] = handler
    }

    function handleConnection(connection, next) {

      var params = querystring.parse(connection.url.split("?")[1])

      if (id = params.__nrtvSingleUseSocketIdentifier) {

        var handler = handlers[id]

        if (handler) {
          connection.on("data", handler)
          connection.on("close",
            function() {
              delete handlers[id]
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