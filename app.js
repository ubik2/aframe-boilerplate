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

var io = require('socket.io')(4000)
var clients = new Map()
var nextClientId = 1
var chat = io
  .of('/chat')
  .on('connection', function (socket) {
    console.log('got connection')
    // notify the new client about all existing clients
    clients.forEach(function(value, key) {
      socket.emit('spawn', value)
    })
    socket.on('disconnect', function () {
      var clientDetail = clients.get(socket)
      clients.delete(socket)
      socket.broadcast.emit('despawn', clientDetail)
      console.log('user disconnected')
    }).on('message', function (data) {
      socket.broadcast.emit('message', {
        'data': data,
        'description': 'everyone else will get'
      })
      console.log(data)
    }).on('despawn', function (data) {
      var clientDetail = clients.get(socket)
      clients.delete(socket)
      socket.broadcast.emit('despawn', clientDetail)
    }).on('spawn', function (data) {
      // add our client
      data.id = 'player_' + nextClientId
      nextClientId = nextClientId + 1
      clients.set(socket, data)
      socket.broadcast.emit('spawn', data)
    }).on('position', function (data) {
      var clientDetail = clients.get(socket)
      clientDetail.position = data
      clients.set(socket, clientDetail)
      socket.broadcast.emit('position', {
        id: clientDetail.id,
        position: clientDetail.position
      })
    }).on('rotation', function (data) {
      var clientDetail = clients.get(socket)
      clientDetail.rotation = data
      clients.set(socket, clientDetail)
      socket.broadcast.emit('rotation', {
        id: clientDetail.id,
        rotation: clientDetail.rotation
      })
    })
})

console.log("Got here")