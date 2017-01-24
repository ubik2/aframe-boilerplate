var budo = require('budo')
var babelify = require('babelify')

budo('index.js', {
    live: true,             // setup live reload
    port: 3000,             // use this port
    browserify: {
        transform: babelify   // ES6
    }
}).on('connect', function (ev) {
    console.log('Server running on %s', ev.uri)
    console.log('LiveReload running on port %s', ev.livePort)
}).on('update', function (buffer) {
    console.log('bundle - %d bytes', buffer.length)
})

// Declare our network messages and client state
interface Vector3 {
   x: number;
   y: number;
   z: number;
}

interface PositionMessage {
    id: string;
    position: Vector3;
}

interface RotationMessage {
    id: string;
    rotation: Vector3;
}

interface SpawnMessage {
    position: Vector3;
    rotation: Vector3;
}

interface DespawnMessage {
}

interface ClientState {
    id: string;
    position: Vector3;
    rotation: Vector3;
}

var socketio = require('socket.io')
var io = socketio(4000)
var clients: Map<SocketIO.Socket, ClientState> = new Map<SocketIO.Socket, ClientState>()
var nextClientId: number = 1
var chat: SocketIO.Server = io
  .of('/chat')
  .on('connection', function (socket: SocketIO.Socket) {
    console.log('got connection')
    // notify the new client about all existing clients
    clients.forEach(function(value, key) {
      socket.emit('spawn', value)
    })
    socket.on('disconnect', function () {
      var clientState: ClientState = clients.get(socket)
      clients.delete(socket)
      socket.broadcast.emit('despawn', clientState)
      console.log('user disconnected')
    }).on('message', function (data) {
      socket.broadcast.emit('message', {
        'data': data,
        'description': 'everyone else will get'
      })
      console.log(data)
    }).on('despawn', function (data: DespawnMessage) {
      var clientDetail = clients.get(socket)
      clients.delete(socket)
      socket.broadcast.emit('despawn', clientDetail)
    }).on('spawn', function (data: SpawnMessage) {
      // add our client
      var clientState: ClientState = {
        id: 'player_' + nextClientId,
        position: data.position,
        rotation: data.rotation
      }
      nextClientId = nextClientId + 1
      clients.set(socket, clientState)
      socket.broadcast.emit('spawn', clientState)
    }).on('position', function (data: Vector3) {
      var clientState: ClientState = clients.get(socket)
      clientState.position = data
      var message: PositionMessage = {
        id: clientState.id,
        position: clientState.position
      }
      socket.broadcast.emit('position', message)
    }).on('rotation', function (data: Vector3) {
      var clientState: ClientState = clients.get(socket)
      clientState.rotation = data
      var message: RotationMessage = {
        id: clientState.id,
        rotation: clientState.rotation
      }
      socket.broadcast.emit('rotation', message)
    })
})

console.log("Got here")