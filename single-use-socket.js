var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-single-use-socket",

  ["nrtv-socket-server", "nrtv-socket", "querystring", "nrtv-server", "nrtv-browser-bridge"],
  function(SocketServer, socket, querystring, nrtvServer, bridge) {

    function SingleUseSocket() {

      this.identifer = Math.random().toString(36).split(".")[1]

      this.readyCallbacks = []

      for(var i=0; i<arguments.length; i++) {
        var arg = arguments[i]

        if (typeof arg == "function") {
          this.readyCallbacks.push(arg)
        } else if (arg.app) {
          this.server = arg
        }
      }

      if (!this.server) {
        this.server = nrtvServer
      }

      listenFor(this, this.server)
    }

    function listenFor(socket, server) {
      var socketServer = SocketServer.onServer(server)

      var sockets = socketServer.__nrtvSingleUseSockets

      if (!sockets) {
        sockets = socketServer.__nrtvSingleUseSockets = {}

        socketServer.use(
          handleConnection.bind(null, sockets)
        )
      }

      sockets[socket.identifer] = socket
    }


    function handleConnection(sockets, connection, next) {

      var params = querystring.parse(connection.url.split("?")[1])

      var socket = this

      var id = params.__nrtvSingleUseSocketIdentifier

      if (id) {

        var socket = sockets[id]

        if (socket) {
          socket.connection = connection

          socket.readyCallbacks.forEach(function(x) { x() })

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

    SingleUseSocket.prototype.listen =
      function(handler) {
        var socket = this
        this.handler =
          function(message) {
            console.log("RECV", message, "← socket☼"+socket.identifer)
            handler(message)
          }
      }

    SingleUseSocket.prototype.send =
      function(message) {
        if (!this.connection) {
          this.readyCallbacks.push(this.send.bind(this, message))
        } else {
          console.log("SEND", "→", "socket☼"+this.identifer, message)
          this.connection.write(message)
        }
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
                  console.log("RECV", "←", "socket☼"+id, event.data)
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
                console.log("SEND", "→ socket☼"+id, message)

                socket.send(message)
              },
              "?__nrtvSingleUseSocketIdentifier="+id
            )
          }

        )

        return binding.withArgs(this.identifer)  
      }

    SingleUseSocket.prototype.onClose =
      function(callback) {
        this.onClose = callback
      }

    SingleUseSocket.prototype.url =
      function() {
        return "ws://localhost:"+this.server.getPort()+"/echo/websocket?__nrtvSingleUseSocketIdentifier="+this.identifer
      }
    
    return SingleUseSocket
  }
)