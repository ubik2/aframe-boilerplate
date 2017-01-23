if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

AFRAME.registerComponent('networkmanager', {
  schema: {
    url: {
      type: 'string',
      default: null
    },
    port: {
      type: 'int'
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
      console.log("Spawning remote object at ", data['position'])
      entityEl.setAttribute('position', data['position'])
      entityEl.setAttribute('rotation', data['rotation'])
      //entityEl.setAttribute('color', data['color'])
      networkManager.el.appendChild(entityEl)
      networkManager.networkComponents[data['id']] = entityEl
    }).on('position', function (data) {
      var networkComponent = networkManager.networkComponents[data['id']]
      networkComponent.setAttribute('position', data['position'])
    }).on('despawn', function (data) {
      var networkComponent = networkManager.networkComponents[data['id']]
      networkComponent.parentNode.removeChild(networkComponent)
      networkManager.networkComponents.delete([data['id']])
    })
  },
  init: function () {
    console.log("in networkmanager init")
    var sceneEl = this.el
    if (this.data.url == undefined || this.data.url == "") {
      this.data.url = location.protocol + '//' + location.hostname + ':' + this.data.port + '/chat'
    }
    var socket = io.connect(this.data.url)
    socket.on('connect', this.onNetworkConnect.bind(this))
    this.socket = socket
  },
  remove: function () {
    this.socket.disconnect(true)
  },
  socket: null,
  networkComponents: new Map()
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
    if (parentNode.components.networkmanager == undefined ||
        parentNode.components.networkmanager.socket == undefined) {
        return
    }
    var socket = parentNode.components.networkmanager.socket
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
    var parentNode = this.el.parentNode
    if (this.data.master) {
      // hook up to camera position changes to notify the server
      var parentNode = this.el.parentNode
      //var networkManager = this.el.parentNode.components.networkmanager
      //this.socket = networkManager.socket
      var networkComponent = this
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
