THREE.CallbackPass = function ( callback ) {

  this.enabled = true;
  this.clear = true;
  this.needsSwap = false;

  this.callback = callback;

};

THREE.CallbackPass.prototype = {

  render: function ( renderer, writeBuffer, readBuffer, delta ) {
    this.callback(writeBuffer, readBuffer);
  }

};
