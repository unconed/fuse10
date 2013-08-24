Acko.Effect.Background = function () {
  Acko.Effect.call(this);

  this.order = 0;
  this.group = null;
  this.opacity = 0;

  this.renderer = 'webgl';
}

Acko.Effect.Background.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.background = this;

    var scene = exports.scene;

    var group = this.group = new THREE.Object3D();

    var geometry = this.makeGeometry();
    var material = this.material = new THREE.ShaderMaterial(Acko.SolidShader);
    var mesh = this.mesh = new THREE.Mesh(geometry, material);

    mesh.position.z = 0;
    mesh.position.y = 100;

    mesh.rotation.y = -.8;
    mesh.rotation.x = .4;
    mesh.rotation.z = .2;
    mesh.eulerOrder = "YXZ";

    mesh.renderDepth = 20000;
    group.add(mesh);

    scene.add(group);

    // mimic shader fog
    scene.fog = this.fog = new THREE.Fog(0xffffff, 1200, 2600);

    this.opacity = exports.doIntro ? -.1 : 1;
  },

  makeGeometry: function () {
    var geometry = new THREE.BufferGeometry();

    // Ranges for randoms
    var borderRadius = 50;
    var radius = [3000, 4200];
    var shift = [-2000, 2000];
    var scaleX = [17000, 20000];
    var scaleY = [80, 170];
    var scaleZ = [80, 170];

    // Boxes
    var n = 44;

    // Segments
    var nsX = 8;
    var nsY = 4;

    var nTris = nsX*(nsY+4)*2*n;
    var nVerts = nTris * 3;

    // Geometry streamer
    geometry.attributes = {
      index: {
        itemSize: 1,
        array: new Uint16Array(nTris * 3),
      },
      position: {
        itemSize: 3,
        array: new Float32Array(nVerts * 3),
      },
      normal: {
        itemSize: 3,
        array: new Float32Array(nVerts * 3),
      },
      color: {
        itemSize: 3,
        array: new Float32Array(nVerts * 3),
      },
    };

    var posIndex = 0;
    var vertexIndex = 0;
    var posRefIndex = 0;

    var indexData = geometry.attributes.index.array;
    var posData = geometry.attributes.position.array;
    var normalData = geometry.attributes.normal.array;
    var colorData = geometry.attributes.color.array;

    function mark() {
      posRefIndex = posIndex;
    }

    function vertex(v, n, c) {
      var p = posIndex * 3;

      posData[p] = v.x;
      posData[p + 1] = v.y;
      posData[p + 2] = v.z;

      v3.copy(n);
      v3.multiply(v3).add(n).normalize();

      normalData[p] = v3.x;
      normalData[p + 1] = v3.y;
      normalData[p + 2] = v3.z;

      colorData[p] = c.r;
      colorData[p + 1] = c.g;
      colorData[p + 2] = c.b;

      posIndex++;
    }

    function triangle(i, j, k) {
      indexData[vertexIndex++] = posRefIndex + i;
      indexData[vertexIndex++] = posRefIndex + k;
      indexData[vertexIndex++] = posRefIndex + j;
    }

    function quad(i, j, k, l) {
      indexData[vertexIndex++] = posRefIndex + i;
      indexData[vertexIndex++] = posRefIndex + k;
      indexData[vertexIndex++] = posRefIndex + j;

      indexData[vertexIndex++] = posRefIndex + j;
      indexData[vertexIndex++] = posRefIndex + k;
      indexData[vertexIndex++] = posRefIndex + l;
    }

    var v1 = _v();
    var v2 = _v();
    var v3 = _v();

    var m1 = new THREE.Matrix4();
    var m2 = new THREE.Matrix4();

    function sign(v) {
      v.x = v.x > 0 ? 1 : -1;
      v.y = v.y > 0 ? 1 : -1;
      v.z = v.z > 0 ? 1 : -1;
    }

    function randRange(range) {
      return range[0] + rand() * (range[1] - range[0]);
    }

    var colors = Acko.Palette.red.concat(Acko.Palette.blue);

    var cc = Acko.Palette.platinum[1];

    // Seed random generator
    var seed = 773239;

    rand(seed);

    // Manual tweaks
    var offsets = {
      0: [-1300, 0, 0, .3, 0, 0, 0],
      1: [1200, 1800, 0, 0, 0, 0, 0],
      2: [930, 1100, 0, 0, 0, 0, 0],

      3: [2300, 1400, 0, .35, .1, 0, 0],
      4: [700, 300, 140, 0, 0, 0, .08],
      5: [1040, 220, 140, .2, -.05, 0, -.2],

      6: [1050, 400, 0, .4, .1, -.1, 0],
      8: [800, -240, 0, 0, 0, 0, -.2],

      24: [0, 0, -100, 0, 0, 0, 0],
      25: [-500, 0, 500, 0, 0, 0, 0],

      36: [0, -300, -.1, 0, 0, 0, 0],
    };

    // Make blocks
    for (var i = 0; i < n; ++i) {

      var ignore = false;

      // Random position / rotation / scale
      var radial = (i + rand()) / n * τ + 2.585;
      var sx = randRange(scaleX);
      var sy = randRange(scaleY);
      var sz = randRange(scaleZ);

      var gray = rand() * .2 + .6;

//      gray = (i / n);
//      cc = colors[i % colors.length];

      var color = {r:gray*cc.r, g:gray*cc.g, b:gray*cc.b};

      var c = Math.cos(radial);
      var s = Math.sin(radial);
      var r = randRange(radius);

      // Some special cases for variation
      if (i > n - 3) {
        v2.set(radial + rand() * .6 + .2, .6, .8);
        v1.set(randRange(shift) * .3 - 7000, c * r, s * r - 2000);
      }
      else if (i > n - 5) {
        v2.set(radial + rand() * .6 + .2, 1.6, -3.8);
        v1.set(randRange(shift) * .3 + 9000, c * r, s * r - 4000);
      }
      else {
        v2.set(radial + rand() * .35 + .175, .6, 0);
        v1.set(randRange(shift), c * r * .7, s * r);
      }
      v3.set(1, 1, 1);

      // Clear way for content
      if (i >= 27 && i <= 32) {
        v1.multiplyScalar(1.2);
      }

      if (i == 0) {
        v1.multiplyScalar(1.1);
      }

      if (i == 1 || i == 2) {
        v1.multiplyScalar(1.1);
        v1.x *= 2.7;
      }

      if (i == 36 || i == 39) {
        v1.x -= 350;
        v1.y += 300;
        v2.y -= .05;
      }

      if (i == 37 || i == 38) {
        v1.y -= 300;
      }

      if (i == 37) {
        v1.y -= 700;
      }

      if (i > 34 && i <= 39) {
        v1.multiplyScalar(1.03);
        v1.y -= 200;
      }

      // Manual tweaks
      var o;
      if (o = offsets[i]) {
        if (o[6]) {
          color.r += o[6];
          color.g += o[6];
          color.b += o[6];
        }
        v1.x += o[0];
        v1.y -= o[1];
        v1.z += o[2];
        v2.x += o[3];
        v2.y -= o[4];
        v2.z += o[5];
      }

      // #0 - 9 too
      /*
      if (i >= 4 && i <= 9) {
        v1.x += 300;
        v1.y += 0;
        v1.z -= 300;
      }
      if (i >= 1 && i <= 3) {
        v1.x += 3000;
        v1.y += 0;
        v1.z -= 300;
      }
      if (i == 0) {
        v1.x -= 500;
      }
      */

      m1.makeFromPositionEulerScale(v1, v2, 'ZXY', v3);

      v1.set(0, 0, 0);
      m2.makeFromPositionEulerScale(v1, v2, 'ZXY', v3);

      var stepX = τ/nsX;
      var stepY = π/nsY;

      var edge = nsX - 1;

      // Body
      for (var y = 0, th = -π/2+stepY/2; y < nsY; ++y, th += stepY) {
        var ct = Math.cos(th);
        var st = Math.sin(th);

        for (var x = 0, phi = stepX/2; x < nsX; ++x, phi += stepX) {
          c = Math.cos(phi);
          s = Math.sin(phi);

          mark();

          // Sphere
          v1.set(c * ct, st, s * ct);
          v1.multiplyScalar(borderRadius);
          v2.copy(v1);

          // Offset towards corner
          sign(v2);
          v2.x *= sx;
          v2.y *= sy;
          v2.z *= sz;

          // Position
          v2.add(v1).applyMatrix4(m1);

          // Norm
          v1.normalize().applyMatrix4(m2);

          vertex(v2, v1, color);

          if (y > 0) {
            var right = x == edge ? -nsX + 1 : 1;
            ignore || quad(-nsX, right - nsX, 0, right);
          }
        }
      }

      mark();

      var corners = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ];

      // Top
      c = Math.cos(stepY/2);
      s = Math.sin(stepY/2);
      corners.forEach(function (corner) {
        v1.set(0, borderRadius, 0);
        v2.set(sx * corner[0], sy, sz * corner[1]);
        v2.add(v1).applyMatrix4(m1);

        v1.set(.7 * corner[0] * s, c, .7 * corner[1] * s);
        v1.applyMatrix4(m2);
        ignore || vertex(v2, v1, color);
      });

      var arc = nsX / 4;
      var o = nsX;
      for (var x = 0; x < nsX; ++x) {
        if (x % arc == 0) continue;
        ignore || triangle(Math.floor(x / arc), x - 1 - o, x - o);
      }
      for (var x = 0; x < 4; ++x) {
        var j = (x + 3) % 4;
        var k = (j + 1) * arc - 1;
        ignore || triangle(x, k - o, x * arc - o);
        ignore || triangle(x, j, k - o);
      }

      ignore || quad(0, 1, 3, 2);

      // Bottom
      c = Math.cos(stepY/2);
      s = Math.sin(stepY/2);
      corners.forEach(function (corner) {
        v1.set(0, -borderRadius, 0);
        v2.set(sx * corner[0], -sy, sz * corner[1]);
        v2.add(v1).applyMatrix4(m1);

        v1.set(.7 * corner[0] * s, -c, .7 * corner[1] * s);
        v1.applyMatrix4(m2);
        ignore || vertex(v2, v1, color);
      });

      var arc = nsX / 4;
      var o = nsX*nsY;
      for (var x = 0; x < nsX; ++x) {
        if (x % arc == 0) continue;
        ignore || triangle(4 + Math.floor(x / arc), x - o, x - 1 - o);
      }
      for (var x = 0; x < 4; ++x) {
        var j = (x + 3) % 4;
        var k = (j + 1) * arc - 1;
        ignore || triangle(4 + x, x * arc - o, k - o);
        ignore || triangle(4 + x, k - o, 4 + j);
      }

      ignore || quad(5, 4, 6, 7);
    }

    geometry.offsets = [{
      start: 0,
      index: 0,
      count: vertexIndex,
    }];

    return geometry;
  },

  update: function (exports) {

    var ride = exports.ride || exports.tracks.override();

    this.mesh.visible = this.opacity > 0;

    this.mesh.position.x = ride ? 0 : 400;
    this.mesh.position.z = ride ? 0 : -400;

    this.mesh.rotation.y = ride ? -.8 : -.9;
    this.mesh.rotation.x = .4;
    this.mesh.rotation.z = .2;

    var sc = .9;
    this.mesh.scale.set(sc, sc, sc);

    if (exports.ride && exports.audio && exports.audio.currentTime > 276) {
      this.opacity -= .005;
    }
    else if (exports.audio) {
      this.opacity = 1;
    }
    else {
      this.opacity += .003;
    }

    var opacity = .5 - .5*Math.cos(Math.min(1, Math.max(0, this.opacity)) * π);
    this.material.uniforms.opacity.value = opacity;
    this.material.uniforms.ambientCorrection.value = (exports.ambientCorrection || 0) + (exports.ride ? .3 : .6);

    exports.backgroundOpacity = opacity;

    var fogScale = (.85 - .15 * Math.abs(Math.cos(exports.cameraController.phi)));
    var near = exports.cameraController.perspective + 100;
    var far = exports.cameraController.perspective * 1.8 + 100;
    this.fog.near = near * fogScale;
    this.fog.far = far * fogScale;
  },

  resize: function (exports) {
  },

});

Acko.Effects.push(new Acko.Effect.Background());