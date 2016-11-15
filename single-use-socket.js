var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-single-use-socket",

  ["get-socket", "querystring", "nrtv-server"],
  function(getSocket, querystring, nrtvServer) {

    function SingleUseSocket() {
      this.identifier = Math.random().toString(36).split(".")[1]

      this.readyCallbacks = []

      for(var i=0; i<arguments.length; i++) {
        var arg = arguments[i]

        if (typeof arg == "undefined") {
          throw new Error("You passed "+arg+" as the "+i+"th argument to the SingleUseSocket constructor. Were you expecting that to be a callback or a server?")
        } else if (typeof arg == "function") {
          this.readyCallbacks.push(arg)
        } else if (arg.app) {
          this.server = arg
        }
      }

      if (!this.server) {
        this.server = nrtvServer
      }

      var sockets = SingleUseSocket.installOn(this.server)

      sockets[this.identifier] = this
    }

    SingleUseSocket.installOn =
      function(server) {
        var sockets = server.__nrtvSingleUseSockets

        if (sockets) {
          return sockets
        }

        if (!sockets && server.isStarted()) {
          throw new Error("If you want to use sockets, we need to know that ahead of time. Try doing SingleUseSocket.installOn(server) before you start your server.")
        }

        if (!sockets) {
          sockets = server.__nrtvSingleUseSockets = {}

          getSocket.handleConnections(
            server,
            handleConnection.bind(null, sockets)
          )
        }

        return sockets
      }


    function handleConnection(singleUseSockets, socket, next) {

      var params = querystring.parse(socket.url.split("?")[1])

      var id = params.__nrtvSingleUseSocketIdentifier

      var sus = id && singleUseSockets[id]

      if (!sus) {
        next()
      } else {
        sus.socket = socket

        sus.readyCallbacks.forEach(callIt)

        function callIt(x) { x() }

        socket.onClose(function() {
          delete singleUseSockets[id]
          if (sus.onClose) {
            sus.onClose()
          }
        })

        socket.listen(function() {
          sus.handler.apply(null, arguments)
        })
      }
    }

    SingleUseSocket.prototype.listen =
      function(handler) {
        var sus = this
        this.handler =
          function(message) {
            console.log("RECV", message, "← socket☼"+sus.identifier)
            handler(message)
          }
      }

    SingleUseSocket.prototype.send =
      function(message) {
        if (!this.socket) {
          this.readyCallbacks.push(this.send.bind(this, message))
        } else {
          console.log("SEND", "→", "socket☼"+this.identifier, message)
          this.socket.send(message)
        }
      }

    SingleUseSocket.prototype.defineListenOn =
      function(bridge) {
        var binding = bridge.__singleUseSocketListenBinding

        if (!binding) {
          var binding = bridge.__singleUseSocketListenBinding
           = bridge.defineFunction(
            [getSocket.defineOn(bridge)], listen)
        }

        function listen(getSocket, id, callback) {

          if (typeof callback != "function") {
            throw new Error("If you want to listen to a socket, you need to provide a function that takes a message and does something with it.")
          }

          getSocket(
            function(socket) {
              socket.onmessage = function(event) {
                  console.log("RECV", "←", "socket☼"+id, event.data)
                  callback(event.data)
                }
            },
            "?__nrtvSingleUseSocketIdentifier="+id
          )

        }

        return binding.withArgs(this.identifier)  
      }

    SingleUseSocket.prototype.defineSendOn =
      function(bridge) {
        var binding = bridge.__singleUseSocketSendBinding

        if (!binding) {
          var binding = bridge.__singleUseSocketSendBinding
           = bridge.defineFunction(
            [getSocket.defineOn(bridge)], send)
        }

        function send(getSocket, id, message) {
          getSocket(
            function(socket) {
              console.log("SEND", "→ socket☼"+id, message)

              socket.send(message)
            },
            "?__nrtvSingleUseSocketIdentifier="+id
          )
        }

        return binding.withArgs(this.identifier)  
      }

    SingleUseSocket.prototype.onClose =
      function(callback) {
        this.onClose = callback
      }

    SingleUseSocket.prototype.url =
      function() {
        return "ws://localhost:"+this.server.getPort()+"/echo/websocket?__nrtvSingleUseSocketIdentifier="+this.identifier
      }
    
    return SingleUseSocket
  }
)