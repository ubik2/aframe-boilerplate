if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

AFRAME.registerSystem('network', {
  dependencies: ['position', 'rotation'],
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
    this.socket.emit('spawn', { 'color': "#0F1963" })
    this.socket.on('message', function (data) {
      console.log(data)
    }).on('spawn', function (data) {
      var entityEl = document.createElement('a-box')
      entityEl.setAttribute('network', {
        master: false,
        serverId: data.id,
      })
      console.log("Spawning remote object: ", data.id)
      entityEl.setAttribute('position', data.position)
      entityEl.setAttribute('rotation', data.rotation)
      if (entityEl.components.material !== undefined) {
        entityEl.setAttribute('material', 'color', data.color)
      }
      var scene = document.querySelector('a-scene')
      scene.appendChild(entityEl)
      networkManager.registerMe(entityEl)
    }).on('position', function (data) {
      var entityEl = networkManager.entities[data.id]
      entityEl.setAttribute('position', data.position)
    }).on('rotation', function (data) {
      var entityEl = networkManager.entities[data.id]
      entityEl.setAttribute('rotation', data.rotation)
    }).on('despawn', function (data) {
      console.log("Despawning remote object: ", data.id)
      var entityEl = networkManager.entities[data.id]
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
    var socket = this.system.socket
    if (evt.detail.name === 'position') {
      var oldData = this.lastPosition
      var newData = evt.detail.newData
      if (oldData == undefined || oldData.x !== newData.x || oldData.y !== newData.y || oldData.z !== newData.z) {
        socket.emit('position', evt.detail.newData)
        this.lastPosition = newData
      }
    } else if (evt.detail.name === 'rotation') {
      var oldData = this.lastRotation
      var newData = evt.detail.newData
      if (oldData == undefined || oldData.x !== newData.x || oldData.y !== newData.y || oldData.z !== newData.z) {
        socket.emit('rotation', evt.detail.newData)
        this.lastRotation = newData
      }
    }
  },
  init: function() {
    if (this.data.master) {
      this.el.addEventListener('componentchanged', this.onComponentChanged.bind(this))
    }
  },
  lastPosition: null,
  lastRotation: null
})
