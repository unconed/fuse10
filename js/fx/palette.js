Acko.Effect.Palette = function () {
  Acko.Effect.call(this);

  this.order = 0;
  this.group = null;
}

Acko.Effect.Palette.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    var scene = exports.scene;

    var group = this.group = new THREE.Object3D();
    scene.add(group);

    var colors = [];
    for (i in Acko.Palette) {
      colors = colors.concat(Acko.Palette[i]);
    }

    var geometry = new THREE.CubeGeometry(1, 1, 1);

    var n = colors.length;
    var sz = 30;
    var x = -sz * n / 2;

    for (var i = 0; i < n; ++i) {
      var material = new THREE.MeshPhongMaterial({ color: colors[i] });
      var mesh = new THREE.Mesh(geometry, material);

      mesh.scale.x = sz;
      mesh.scale.y = sz;
      mesh.scale.z = sz;

      mesh.position.x = x;
      mesh.position.y = -200;
      mesh.position.z = 300;

      mesh.rotation.y = τ * .2;

      x += sz;

      var dir = this.dir = new THREE.DirectionalLight(0xffffff, .15);
      dir.position.set(1, 1.5, 1.3);
      group.add(dir);

      group.add(mesh);
    }

    scene.add(group);
  },

  update: function (exports) {
  },

  resize: function (exports) {
  },

});

Acko.Effects.push(new Acko.Effect.Palette());