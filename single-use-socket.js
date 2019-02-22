var library = require("module-library")(require)

module.exports = library.export(
  "single-use-socket",
  ["get-socket", "querystring", "web-site"],
  function(getSocket, querystring, webSite) {

    function SingleUseSocket(site, callback, etc) {
      this.id = Math.random().toString(36).split(".")[1]

      this.readyCallbacks = []

      if (site && !site.app) {
        throw new Error("First argument to SingleUseSocket constructor should be a web-site")
      } else {
        this.server = site
      }

      if (callback && typeof callback != "function") {
        throw new Error("Second (optional) argument to SingleUseSocket is a callback")
      } else if (callback) {
        this.readyCallbacks.push(callback)
      }

      if (!this.server) {
        this.server = webSite
      }

      var sockets = SingleUseSocket.installOn(this.server)

      sockets[this.id] = this
    }

    SingleUseSocket.installOn =
      function(server) {
        if (!server.isStarted) {
          throw new Error("not a server")
        }
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
            console.log("RECV", message, "← socket☼"+sus.id)
            handler(message)
          }
      }

    SingleUseSocket.prototype.send =
      function(message) {
        if (!this.socket) {
          this.readyCallbacks.push(this.send.bind(this, message))
        } else {
          console.log("SEND", "→", "socket☼"+this.id, message)
          this.socket.send(message)
        }
      }

    SingleUseSocket.prototype.defineListenOn =
      function(bridge) {
        var binding = bridge.__singleUseSocketListenBinding

        if (!binding) {
          var binding = bridge.__singleUseSocketListenBinding
           = bridge.defineFunction(
            [getSocket.defineOn(bridge)], listenToSingleUseSocket)
        }

        function listenToSingleUseSocket(getSocket, id, callback) {

          if (typeof callback != "function") {
            throw new Error("If you want to listen to a socket, you need to provide a function that takes a message and does something with it.")
          }

          getSocket(
            function(socket) {
              socket.listen(andLogIt)
            },
            "?__nrtvSingleUseSocketIdentifier="+id
          )

          function andLogIt(message) {
            console.log("RECV", "←", "socket☼"+id, message)
            callback(message)
          }

        }

        return binding.withArgs(this.id)  
      }

    SingleUseSocket.prototype.defineSendOn =
      function(bridge) {
        var binding = bridge.__singleUseSocketSendBinding

        if (!binding) {
          var binding = bridge.__singleUseSocketSendBinding
           = bridge.defineFunction(
            [getSocket.defineOn(bridge)], sendToSingleUseSocket)
        }

        function sendToSingleUseSocket(getSocket, id, message) {
          getSocket(
            function(socket) {
              console.log("SEND", "→ socket☼"+id, message)

              socket.send(message)
            },
            "?__nrtvSingleUseSocketIdentifier="+id
          )
        }

        return binding.withArgs(this.id)  
      }


    SingleUseSocket.prototype.defineCloseHandlerOn =
      function(bridge) {
        var binding = bridge.remember("single-use-socket/onClose")

        if (!binding) {
          var binding = bridge.defineFunction(
            [getSocket.defineOn(bridge)], onSingleUseSocketClose)
          bridge.see("single-use-socket/onClose", binding)
        }

        function onSingleUseSocketClose(getSocket, id, callback) {
          getSocket(
            function(socket) {

              socket.onClose(function() {
                console.log("CLOSED", " ☼ socket☼"+id, message)
                callback()
              })
            },
            "?__nrtvSingleUseSocketIdentifier="+id
          )
        }

        return binding.withArgs(this.id)  
      }



    SingleUseSocket.prototype.onClose =
      function(callback) {
        this.onClose = callback
      }

    SingleUseSocket.prototype.url =
      function() {
        return "ws://localhost:"+this.server.getPort()+"/echo/websocket?__nrtvSingleUseSocketIdentifier="+this.id
      }
    
    return SingleUseSocket
  }
)