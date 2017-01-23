"use strict";

if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

AFRAME.registerSystem('network', {
  schema: {
    url: {
      type: 'string',
      default: null
    },
    port: {
      type: 'int',
      default: 4000
    },
    path: {
      type: 'string',
      default: '/chat'
    }
  },
    onNetworkConnect: function () {
      var networkManager = this
      // unfortunately, our position and rotation attributes aren't set when we call this
      this.socket.emit('spawn', { 'color': "#4CC3D9" })
      this.socket.on('message', function (data) {
        console.log(data)
      }).on('spawn', function (data) {
        var entityEl = document.createElement('a-box')
        entityEl.setAttribute('network', {
          master: false,
          serverId: data['id'],
        })
        console.log("Spawning remote object: ", data['id'])
        entityEl.setAttribute('position', data['position'])
        entityEl.setAttribute('rotation', data['rotation'])
        //entityEl.setAttribute('color', data['color'])
        var scene = document.querySelector('a-scene');
        scene.appendChild(entityEl)
        networkManager.registerMe(entityEl)
      }).on('position', function (data) {
        var entityEl = networkManager.entities[data['id']]
        entityEl.setAttribute('position', data['position'])
      }).on('despawn', function (data) {
        console.log("Despawning remote object: ", data['id'])
        var entityEl = networkManager.entities[data['id']]
        entityEl.parentNode.removeChild(entityEl)
        networkManager.unregisterMe(entityEl)
      })
    },
  init: function () {
    this.entities = new Map()
    if (this.data.url == undefined || this.data.url == "") {
      this.data.url = location.protocol + '//' + location.hostname + ':' + this.data.port + this.data.path
    }
    var socket = io.connect(this.data.url)
    socket.on('connect', this.onNetworkConnect.bind(this))
    this.socket = socket
  },
  registerMe: function (el) {
    this.entities[el.getAttribute('network').serverId] = el
  },
  unregisterMe: function (el) {
    this.entities.delete(el.getAttribute('network').serverId)
  },
  socket: null,
  entities: new Map()
})

AFRAME.registerComponent('network', {
  schema: {
    master: { type: 'boolean' },
    serverId: { type: 'string' },
  },
  onComponentChanged: function (evt) {
    var parentNode = this.el.parentNode
    // unfortunately, we call init on the children before the parent, and also call componentchanged before
    // the parent's networkmanager has been initialized.
    if (this.system == undefined || this.system.socket == undefined) {
        return
    }
    var socket = this.system.socket
    if (evt.detail.name === 'position') {
      var oldData = this.lastPosition
      var newData = evt.detail.newData
      if (oldData == undefined || oldData.x !== newData.x || oldData.y !== newData.y || oldData.z !== newData.z) {
        socket.emit('position', evt.detail.newData)
        this.lastPosition = newData
      }
    }
  },
  init: function() {
    console.log("in network init")
    if (this.data.master) {
      // hook up to camera position changes to notify the server
      this.el.addEventListener('componentchanged', this.onComponentChanged.bind(this))
    }
  },
  remove: function () {
    if (this.eventHandlerFn !== undefined) {
      this.el.removeEventListener('componentchanged', this.eventHandlerFn)
    }
  },
  lastPosition: null,
  lastRotation: null
})
