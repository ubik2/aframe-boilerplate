var budo = require('budo');
var babelify = require('babelify');
budo('index.js', {
    live: true,
    port: 3000,
    browserify: {
        transform: babelify // ES6
    }
}).on('connect', function (ev) {
    console.log('Server running on %s', ev.uri);
    console.log('LiveReload running on port %s', ev.livePort);
}).on('update', function (buffer) {
    console.log('bundle - %d bytes', buffer.length);
});
var socketio = require('socket.io');
var io = socketio(4000);
var clients = new Map();
var nextClientId = 1;
var chat = io
    .of('/chat')
    .on('connection', function (socket) {
    console.log('got connection');
    // notify the new client about all existing clients
    clients.forEach(function (value, key) {
        socket.emit('spawn', value);
    });
    socket.on('disconnect', function () {
        var clientState = clients.get(socket);
        clients["delete"](socket);
        socket.broadcast.emit('despawn', clientState);
        console.log('user disconnected');
    }).on('message', function (data) {
        socket.broadcast.emit('message', {
            'data': data,
            'description': 'everyone else will get'
        });
        console.log(data);
    }).on('despawn', function (data) {
        var clientDetail = clients.get(socket);
        clients["delete"](socket);
        socket.broadcast.emit('despawn', clientDetail);
    }).on('spawn', function (data) {
        // add our client
        var clientState = {
            id: 'player_' + nextClientId,
            position: data.position,
            rotation: data.rotation
        };
        nextClientId = nextClientId + 1;
        clients.set(socket, clientState);
        socket.broadcast.emit('spawn', clientState);
    }).on('position', function (data) {
        var clientState = clients.get(socket);
        clientState.position = data;
        var message = {
            id: clientState.id,
            position: clientState.position
        };
        socket.broadcast.emit('position', message);
    }).on('rotation', function (data) {
        var clientState = clients.get(socket);
        clientState.rotation = data;
        var message = {
            id: clientState.id,
            rotation: clientState.rotation
        };
        socket.broadcast.emit('rotation', message);
    });
});
console.log("Got here");
