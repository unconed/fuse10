Acko.Effect.Debug = function () {
  Acko.Effect.call(this);

  this.order = Infinity;
  this.display = null;
  this.last = 0;
}

Acko.Effect.Debug.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    return;

    var scene = exports.scene;

    if (this.display) {
      scene.remove(this.display);
    }

    var textures = [];
    for (var i in exports.debug) {
      textures.push(exports.debug[i]);
    }

    if (textures.length == 0) return;

    var display = this.display = new ThreeRTT.Display(textures);
    display.position.z = 0;
    display.position.y = -350;
    display.position.x = -500;
    display.scale.x = 400;
    display.scale.y = 400;
    display.scale.z = 400;
    scene.add(display);

  },

  update: function (exports) {
    var now = Time.get();
    if (now - this.last > 10000) {
      this.last = now;
      this.build(exports);
    }
  },

  resize: function (exports) {
  },

});

Acko.Effects.push(new Acko.Effect.Debug());
