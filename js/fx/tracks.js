Acko.Effect.Tracks = function () {
  Acko.Effect.call(this);

  this.order = 1;
  this.group = null;
  this.depthGroup = null;

  this.nSegments = 256;

  this.blackholeCenter = _v(285.0, -95.0 - 10/.8, 110.0+200/.8);

  this.blackhole = 0;
  this.blackholeA = 0;
  this.blackholeB = 0;

  this.trackData = Acko.TrackData;
};

(function (tr) {

// Vector registers
var v1 = _v();
var v2 = _v();
var v3 = _v();
var v4 = _v();
var v5 = _v();
var v6 = _v();
var v7 = _v();
var v8 = _v();
var v9 = _v();
var v10 = _v();
var v11 = _v();

var m1 = new THREE.Matrix4();

tr.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.tracks = this;

    var renderer = exports.renderer;
    var scene = exports.scene;
    var depthScene = exports.depthScene;
    var gl = exports.context;

    // Visible objects
    var visibleGroup = this.visibleGroup = new THREE.Object3D();
    scene.add(visibleGroup);

    // Depth-pass objects
    var depthGroup = this.depthGroup = new THREE.Object3D();
    depthScene.add(depthGroup);

    // Track holder (for sharing w/ linked camera)
    var visibleHolder = this.visibleHolder = new THREE.Object3D();
    visibleHolder.position.x = 0;
    visibleHolder.position.y = -10;
    visibleHolder.position.z = 200;
    visibleGroup.add(visibleHolder);

    var depthHolder = this.depthHolder = new THREE.Object3D();
    depthHolder.position.x = 0;
    depthHolder.position.y = -10;
    depthHolder.position.z = 200;
    depthGroup.add(depthHolder);

    this.prepareTracks();
    this.prepareAO();
    this.prepareTexture(gl);
    this.prepareGeometry();
    this.prepareMesh();
    this.prepareWriter(gl);

//    exports.debug.tracks = this.textureObject;
  },

  prepareTracks: function () {
    var ns = this.nSegments;

    this.trackPages = [];
    this.tracks = [];
    this.width = 0;
    this.height = ns;

    // Instantiate tracks and count vertices
    this.trackData.forEach(function (trackData) {
      var track = new tr.Track(trackData, ns);
      this.tracks.push(track);

      this.trackPages.push(this.width / 2);
      if (!track.dead) {
        this.width += track.getN() * 2;
      }
    }.bind(this));

    this.nTris = this.width * this.height;
    this.nVerts = this.width * this.height / 2;
  },

  prepareAO: function () {
    if (!this.tracks.length) return;

    // Load pre-bake
    if (Acko.AOData) {
      this.importAO(Acko.AOData);
    }
    else {
      this.AO = new tr.AmbientOcclusion();
      this.AO.build(this.tracks);
      this.AO.compute();

      var discs;

      // light tweaks
      discs = this.tracks[13].AODiscs
      discs[88].front += .1*1.2;
      discs[90].front += .25*1.2;
      discs[92].front += .3*1.2;
      discs[94].front += .25*1.2;
      discs[96].front += .15*1.2;
      discs[89].front += .1*1.2;
      discs[91].front += .15*1.2;
      discs[93].front += .15*1.2;
      discs[95].front += .1*1.2;

      discs = this.tracks[12].AODiscs;
      discs[54].back -= .06*1.15;
      discs[54].back -= .06*1.15;
      discs[55].back -= .12*1.15;
      discs[55].back -= .12*1.15;
      discs[56].back -= .18*1.15;
      discs[57].back -= .18*1.15;
      discs[58].back -= .24*1.15;
      discs[59].back -= .25*1.15;
      discs[60].back -= .17*1.15;
      discs[61].back -= .18*1.15;
      discs[62].back -= .12*1.15;
      discs[63].back -= .14*1.15;
      discs[64].back -= .05*1.15;
      discs[65].back -= .06*1.15;
      discs[67].back -= .03*1.15;

      discs = this.tracks[2].AODiscs;
      discs[61].front += .3;
      discs[63].front += .25;
      discs[65].front += .15;
      discs[62].front += .25;
      discs[64].front += .2;
      discs[66].front += .1;
    }
  },

  prepareTexture: function (gl) {
    // Build geometry texture
    var t = this.texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    var w = this.width;
    var h = this.height;

    var empty = new Float32Array(w * h * 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, empty);

    var textureObject = this.textureObject = new THREE.Texture(
      new Image(),
      new THREE.UVMapping(),
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.NearestFilter,
      THREE.NearestFilter//,
    );
    textureObject.__webglInit = true;
    textureObject.__webglTexture = this.texture;
  },

  prepareGeometry: function (gl) {
    // Separate geometry for normal and depth pass
    this.geometry = this.makeGeometry(gl);
    this.depthGeometry = this.makeGeometry(gl);
  },

  makeGeometry: function (gl) {

    var geometry = new THREE.BufferGeometry();

    geometry.attributes = {
      index: {
        itemSize: 1,
        array: new Uint16Array(this.nTris * 3),
      },
      position: {
        itemSize: 3,
        array: new Float32Array(this.nVerts * 3),
      },
      color: {
        itemSize: 3,
        array: new Float32Array(this.nVerts * 3),
      },
    };

    var w = this.width;
    var h = this.height;
    var dx = 1 / w;
    var dy = 1 / h;

    var ns = this.nSegments;

    var position = geometry.attributes.position.array;
    var index = geometry.attributes.index.array;
    var color = geometry.attributes.color.array;

    // Lay out tracks in vertical pages.
    var pageX = dx / 2;
    var ip = 0, ii = 0, ij = 0;
    _.each(this.tracks, function (track) {
      var np = track.getN();
      var c = track.getColor().clone().convertGammaToLinear();

      // Assign UVs for reading from texture in X/Y grid order within one track.
      for (var y = 0, sy = dy / 2; y < ns; ++y, sy += dy) {
        for (var x = 0, sx = pageX; x < np; ++x, ip += 3, sx += dx * 2) {
          position[ip] = sx;
          position[ip + 1] = sy;
          position[ip + 2] = 0;

          color[ip] = c.r;
          color[ip + 1] = c.g;
          color[ip + 2] = c.b;
        }
      }

      pageX += track.getN() * 2 * dx;

      // Triangulate vertices into wrapping grid mesh
      var iy = np;

      var flip = true;
      for (var y = 0; y < ns; ++y) {
        if (y == ns - 1) iy = np * (1 - ns);
        var ix = 1;

        for (var x = 0; x < np; ++x, ii += 6, ++ij) {
          if (x == np - 1) ix = 1 - np;

          if (flip) {
            index[ii] = ij;
            index[ii + 1] = ij + ix + iy;
            index[ii + 2] = ij + iy;

            index[ii + 3] = ij;
            index[ii + 4] = ij + ix;
            index[ii + 5] = ij + ix + iy;
          }
          else {
            index[ii] = ij;
            index[ii + 1] = ij + ix;
            index[ii + 2] = ij + iy;

            index[ii + 3] = ij + ix;
            index[ii + 4] = ij + ix + iy;
            index[ii + 5] = ij + iy;
          }

          // Flip odd/even to ensure symmetric triangulation
          if ((x+1)%2 == 0)
            flip = !flip;
        }
      }
    });

    return geometry;
  },

  prepareMesh: function () {

    // Visible pass
    var shader = Acko.TrackShader;
    var material = this.material = new THREE.ShaderMaterial(shader);
    material.uniforms.tGeometry.value = this.textureObject;
    material.uniforms.sampleStep.value.set(1 / this.width, 1 / this.height);

    var mesh = this.mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    mesh.renderDepth = -20000;
    this.visibleHolder.add(mesh);

    // Depth pass
    var depthMaterial = this.depthMaterial = toDepthMaterial(material);
    var depthMesh = this.depthMesh = new THREE.Mesh(this.depthGeometry, this.depthMaterial);
    depthMesh.frustumCulled = false;
    depthMesh.renderDepth = -20000;
    this.depthHolder.add(depthMesh);
  },

  prepareWriter: function (gl) {

    var textureOffset = 0;

    // Callback to set current page.
    this.setPage = function (i) {
      var x = this.trackPages[i];
      textureOffset = x * 2;
      return x;
    };

    // Lazy texture binding for writing
    var bindRequested = true;
    var texture = this.texture;
    this.bindTexture = function () {
      bindRequested = true;
    };

    // Callback to write to the current page.
    var ii = 0;
    this.writeCallback = function (data, x, y, w, h) {
      if (bindRequested) {
        // Bind texture once
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        bindRequested = false;
      }
      x += textureOffset;

      if ((y + h) > this.height) console.assert(false);

      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.FLOAT, data);
    }.bind(this);

    // Priority sorter
    this.prioritySort = function (a, b) {
      return b.priority - a.priority;
    };

  },

  updateTrackTexture: function (time, delta) {
    var ns = this.nSegments;

    this.bindTexture();

    var offsets = [];
    var n = this.tracks.length;
    for (var i = 0; i < n; ++i) {
      var track = this.tracks[i];

      if (track.dead) continue;

      // Update track
      var offset = this.setPage(i);
      track.update(time, delta, this.writeCallback);

      // Collect geometry offsets
      (offsets = offsets.concat(track.getGeometryOffsets(offset * ns)));
    }

    offsets.sort(this.prioritySort);

    this.geometry.offsets = offsets;
    this.depthGeometry.offsets = offsets;
  },

  update: function (exports) {
    if (!this.tracks.length) return;

    this.mesh.visible = !exports.pastMasthead || (exports.visualizer.playing && exports.visualizer.slerpB < .9);

    this.updateTrackTexture(exports.time, exports.delta);

    var u = this.material.uniforms;
    var ud = this.depthMaterial.uniforms;
    var s = exports.heroAbsScale || 1;

    // Tweak lighting if SSAO is off
    u.ambientCorrection.value = exports.ambientCorrection || 0;
    u.opacity.value = exports.ride ? exports.backgroundOpacity : 1.0;

    // Ramp up and down AO if graphic is incomplete
    var referenceTrack = this.tracks[0];
    u.ambientOcclusion.value = Math.min(1, Math.max(0, 1 - (Math.abs(referenceTrack.initial - referenceTrack.travel) - 1500) / 3300)) * .5 + .5;

    // Black hole effect
    var lerp = Math.pow(.12, 3/(1+2*Time.getSpeed()));
    this.blackholeA = this.blackholeA + (this.blackhole * 2.85 - this.blackholeA) * lerp;
    this.blackholeB = this.blackholeB + (this.blackholeA - this.blackholeB) * lerp;

    var b = this.blackholeB;
    b = .7 + (b<.5 ? b*b : b - .25);

    u.blackhole.value = exports.ride ? 0 : b;
    ud.blackhole.value = exports.ride ? 0 : b;
    u.fogBegin.value = 2200 * (1.0 + exports.overlayScale) / 2.

    // Reposition black hole during flyby
    m1.getInverse(this.mesh.matrixWorld);
    v1.copy(this.blackholeCenter).multiplyScalar(s).applyMatrix4(m1);
    u.center.value.copy(v1);

    // Scale hero piece for responsive layout
    this.visibleHolder.scale.set(s, s, s);
    this.depthHolder.scale.set(s, s, s);
  },

  override: function (value) {
    if (!this.tracks.length) return;

    if (value !== undefined) {
      for (var i =0; i < this.tracks.length; ++i) {
        this.tracks[i].override = value;
      }
    }
    return this.tracks[0].override;
  },

  exportTexture: function () {
    var material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: this.textureObject,
      fog: false
    });

    material.side = THREE.DoubleSide;

    var geometry = new THREE.RoundRectGeometry(this.width, this.height, 7, 6, true);
    var object = new THREE.Mesh(geometry, material);

    return {
      object: object,
      width: this.width,
      height: this.height,
    };
  },

  exportTracks: function () {
    var ns = this.nSegments;

    var object = new THREE.Object3D();

    var skeletonGeometry = new THREE.Geometry();
    var curveGeometry = new THREE.Geometry();
    var normalGeometry = new THREE.Geometry();

    var sgv = skeletonGeometry.vertices;
    var ngv = normalGeometry.vertices;
    var cgv = curveGeometry.vertices;

    this.tracks.slice(0, -6).forEach(function (track, i) {
      var relative = track.relative;

      if (i == 1 || i == 3 || i == 5) return;

      var points = track.points.map(function (p) {
        return warpVertex(p[0].clone().add(relative));
      }).slice(1, -1);
      var vertices = track.path.vertices.slice(1, -1);
      var normals = track.path.normals.slice(1, -1);

      if (i == 4) {
        points = points.slice(2);
        vertices = vertices.slice(5);
        normals = normals.slice(5);
      }

      if (i == 8) {
//        points = points.slice(0, -6);
        vertices = vertices.slice(0, -20);
        normals = normals.slice(0, -20);
      }

      var r = _v(.3, .5, 0), o;

      for (i in points) {
        if (i > 0) {
          sgv.push(points[i - 1]);
          sgv.push(points[i]);
        }
      }

      for (i in vertices) {
        var vertex = vertices[i];
        if (i > 0) {
          cgv.push(vertices[i - 1]);
          cgv.push(vertex);
        }

        v1.copy(normals[i]).multiplyScalar(25);
        ngv.push(vertex.clone());
        ngv.push(vertex.clone().add(v1));
      }
    }.bind(this));

    skeletonGeometry.computeBoundingSphere();
    normalGeometry.computeBoundingSphere();
    curveGeometry.computeBoundingSphere();

    var skeletonLine = new THREE.Line(
      skeletonGeometry,
      new THREE.LineBasicMaterial({
        color: Acko.Palette.blue[1],
        linewidth: 2,
      }));
    skeletonLine.renderDepth = 1;
    skeletonLine.type = THREE.LinePieces;

    var curveLine = new THREE.Line(
      curveGeometry,
      new THREE.LineBasicMaterial({
        color: Acko.Palette.blue[0],
        linewidth: 2,
      }));
    curveLine.renderDepth = 3;
    curveLine.type = THREE.LinePieces;

    var normalLine = new THREE.Line(
      normalGeometry,
      new THREE.LineBasicMaterial({
        color: Acko.Palette.platinum[0],
        linewidth: 1,
      }));
    normalLine.renderDepth = 4;
    normalLine.type = THREE.LinePieces;

    object.add(skeletonLine);
    object.add(curveLine);
    object.add(normalLine);

    return {
      object: object,
      width: 960,
      height: 500,
    };
  },

  exportDiscs: function () {
    var object = makeDiscs(this.tracks, Acko.Palette.blue[1], Acko.Palette.blue[0]);
    return {
      object: object,
      width: 960,
      height: 500,
    };
  },

  importAO: function (data) {
    try {
      data = JSON.parse(data);
    } catch (e) { return; }

    var last = null;
    var discs, disc, i, j, c;

    for (i in data) {
      var trackAO = data[i];
      var track = this.tracks[i];

      if (trackAO) {
        var discs = [];

        track.AOStart = trackAO[0];
        track.AOEnd   = trackAO[1];
        track.AOStep  = trackAO[2];

        var radius = trackAO[3];
        var coords = trackAO[4];

        for (j in coords) {
          c = coords[j];

          disc = new tr.Disc(_v(c[0], c[1], c[2]), _v(c[3], c[4], c[5]), radius, 1);
          disc.front = c[6];
          disc.back = c[7];

          discs.push(disc);
        }

        track.AODiscs = discs;
        last = track;
      }
      else {
        track.AOStart = last.AOStart;
        track.AOEnd   = last.AOEnd;
        track.AOStep  = last.AOStep;
        track.AODiscs = last.AODiscs;
      }

    }
  },

  exportAO: function () {
    var last = null;

    // Pack AO data
    var data = this.tracks.map(function (tr, j) {
      if ((!last || (last != tr.AODiscs)) && tr.AODiscs) {
        last = tr.AODiscs;
        var coords = [], disc;
        for (i in tr.AODiscs) {
          var disc = tr.AODiscs[i];
          coords.push([disc.position.x, disc.position.y, disc.position.z, disc.normal.x, disc.normal.y, disc.normal.z, disc.front, disc.back]);
        }
        return [tr.AOStart, tr.AOEnd, tr.AOStep, disc.radius, coords];
      }
      else {
        last = null;
        return null;
      }
    });

    // Reduce size of numbers
    return JSON.stringify(data)
            .replace(/([1-9][0-9]{2,})\.([0-9]+)/g, '$1')
            .replace(/([1-9][0-9])\.([0-9])([0-9]*)/g, '$1.$2')
            .replace(/([1-9])\.([0-9]{2})([0-9]*)/g, '$1.$2')
            .replace(/(0\.[0-9]{3})([0-9]+)/g, '$1')
            .replace(/0\.0+([,}])/g, '0$1')
            .replace(/[0-9]+\.[0-9]+e-[0-9]+/g, 0)
  },

});

tr.Track = function (trackData, nSegments) {

  this.nSegments = nSegments;

  var d = trackData || {};

  // Creation parameters
  this.nProfile = d.n        || 8;
  this.width    = d.width    || 100;
  this.height   = d.height   || 50;
  this.power    = d.power    || .25;
  this.points   = d.points   || [];
  this.arrow    = d.arrow    || 0;
  this.shift    = d.shift    || 0;
  this.truncate = d.truncate || 0;
  this.aspect   = d.aspect   || 1;
  this.smooth   = d.smooth   || 0;
  this.spring   = d.spring   || .3;
  this.up       = d.up       || _v(0, 1, 0);
  this.detail   = d.detail   || 5;
  this.relative = d.relative || _v(0, 0, 0);
  this.color    = d.color    || new THREE.Color(0xffffff);
  this.bend     = d.bend     || 3;
  this.edge     = d.edge     || 2;
  this.dead     = d.dead     || false;

  this.AOStep   = d.AOStep || null;

  this.castAO    = d.castAO    === undefined ? 1 : d.castAO;
  this.receiveAO = d.receiveAO === undefined ? 1 : d.receiveAO;
  this.lengthAO  = d.lengthAO;
  this.travelAO  = d.travelAO;

  this.bank      = d.bank      === undefined ? true : d.bank;
  this.warp      = d.warp      === undefined ? true : d.warp;
  this.refine    = d.refine    === undefined ? true : d.refine;
  this.simplify  = d.simplify  === undefined ? true : d.simplify;

  // Global detail adjustment
  this.detail = Math.max(this.detail, 10) * 1.1;
  this.smooth *= 1.1;

  // Visible interval
  this.travel = d.travel || 0;
  this.length = d.length || 50;
  this.travelOverride = d.travelOverride || this.travel;
  this.lengthOverride = d.lengthOverride || this.length;
  this.override = false;

  // Arrival/Exit animation
  this.speed    = d.speed    || 600;
  this.distance = (d.distance || 3000) * 1.09;

  this.speed *= 1.15;
  this.duration = (this.distance / Math.max(1, this.speed)) + this.bend;
  this.initial  = this.travel;

  // Instantiate profile and path
  this.profile   = makeProfile(this.width, this.height, this.power, this.nProfile);
  this.path      = makePath(this.points, this.detail, this.smooth, this.bank, this.up, this.relative, this.warp, this.spring, this.refine, this.simplify);

  // Measure track length
  this.lengthMap = new tr.LengthMap(this.path.vertices);

  this.bufferSize = nSegments;
  this.buffer = new Float32Array(this.nProfile * 4 * 2 * this.bufferSize);

  // Prepare state
  this.lastTravel = 0;
  this.lastLength = 0;
  this.priority = tr.Track.index--;

  // Prepare slot assignments
  var map = this.lengthMap;
  this.lastStartSlot = 0;
  this.lastEndSlot = 0;
  this.startSlot = 0;
  this.endSlot = 0;
  this.range = 0;
  this.slots = [];
  for (var i = 0; i < this.nSegments; ++i) {
    this.slots.push(new tr.Slot());
  }
  this.baseIndex = -1;

  // Prepare geometry offsets
  this.geometryOffsets = [
    {
      start: 0,
      index: 0,
      count: 0,
    },
    {
      start: 0,
      index: 0,
      count: 0,
    },
  ];

  // Scratch matrices
  this.mat4 = new THREE.Matrix4();
  this.mat3 = new THREE.Matrix3();

  this.prepareGenerator();
}

tr.Track.prototype = {

  prepareGenerator: function () {
    var np = this.nProfile;
    var ns = this.nSegments;
    var bufferSize = this.bufferSize;
    var buffer = this.buffer;

    var arrow = this.arrow;
    var aspect = this.aspect;
    var map = this.lengthMap;
    var width = this.width;
    var truncate = this.truncate;
    var shift = this.shift;
    var slots = this.slots;

    var writeCallback = null;
    var writePointer = 0;
    var buffered = 0;
    var slotIndex = 0;
    var cut = Infinity;
    var cutDistance = Infinity;
    var adjacent = false;

    // Flush batch of vertices
    function flush(slotIndex) {
      if (buffered > 0) {
        writeCallback(buffer, 0, slotIndex, np * 2, buffered);
      }
      writePointer = 0;
      buffered = 0;
    };

    // Begin new pass, move slot index to new location
    this.beginPass = function (index, callback) {
      slotIndex = index;
      writeCallback = callback;
      adjacent = false;
    };

    // End pass, flush remaining vertices
    this.endPass = function () {
      flush(slotIndex - buffered);
    };

    // Clear vertices (for visualization purposes)
    this.clear = function (index, n) {
      var wrapped = ((index % ns) + ns) % ns;
      index = wrapped;

      for (var i = 0; i < n; ) {
        slots[index].type = -1;

        this.getBlank(writePointer);
        writePointer += np;
        ++buffered;

        ++i;

        var end = (wrapped + i) % ns;
        if (end == 0) {
          flush(wrapped);
          wrapped = 0;
        }

        index = end;
      }
      flush(wrapped);
    };

    // Handle next slot
    this.nextSlot = function (offset, type, key) {
      var slot = slots[slotIndex];
      if (!slot) return;

      if (slot.offset !== offset || slot.type !== type || slot.key !== key) {

        // Generate new vertices
        type(offset);
        writePointer += np;
        ++buffered;

        // Remember slot occupancy
        slot.offset = offset;
        slot.type = type;
        slot.key = key;

        adjacent = true;
      }
      else {
        adjacent && flush(slotIndex - buffered);
        adjacent = false;
      }

      // Wrap around, begin new batch
      if ((buffered == bufferSize) || (slotIndex == ns - 1)) flush(slotIndex - buffered + 1);
      slotIndex = (slotIndex + 1) % ns;
    };

    // Shape generators
    this.generators = {
      begin: function (o) {
        this.getEnd(o, -1, writePointer);
      }.bind(this),

      beginCap: function (o) {
        this.getOutline(o, 0, o, -1, .8, .8, writePointer);
      }.bind(this),

      outline: function (o) {
        this.getOutline(o, 0, o, 0, 1, 1, writePointer);
      }.bind(this),

      beginArrow: function (o) {
        this.getOutline(map.map(map.unmap(o) + shift), -shift, o, 0, arrow / width, 1, writePointer);
      }.bind(this),

      midArrow: function (o) {
        var l = this.arrow / this.aspect;
        var tl = (l - this.truncate) / 2;
        this.getOutline(map.map(map.unmap(o) + shift), tl - shift, map.map(map.unmap(o) + tl), 0, arrow / width * (1.0 - tl / l), 1, writePointer);
      }.bind(this),

      endArrow: function (o) {
        var l = this.arrow / this.aspect;
        var tl = l - this.truncate;
        this.getOutline(map.map(map.unmap(o) + shift), tl - shift, map.map(map.unmap(o) + tl), 0, arrow / width * (1.0 - tl / l), 1, writePointer);
      }.bind(this),

      endCap: function (o) {
        this.getOutline(o, 0, o, 1, .8, .8, writePointer);
      }.bind(this),

      end: function (o) {
        this.getEnd(o, 1, writePointer);
      }.bind(this),
    };

  },

  update: function (time, delta, writeCallback) {
    var ns = this.nSegments;
    var map = this.lengthMap;

    var flip = (Acko.ReverseTracks ? -1 : 1);

    if (this.distance) {
      // Arrival animation
      var t = Math.max(0, (this.duration - time) / this.bend);
      t = (t < .5 ? t * t : t - .25) * this.bend;

      this.travel = this.initial - t * this.speed * flip;

      if (t == 0) {
        this.speed = this.distance = 0;
      }
    }

    // Sanity check and override
    var travel = this.override ? this.travelOverride : this.travel;
    var length = Math.max(0, this.override ? this.lengthOverride : this.length);
    length -= this.arrow / this.aspect;

    // Recalculate endpoints and see if they changed
    var changed = (travel != this.lastTravel) || (length != this.lastLength);
    if (!changed) return;

    this.lastTravel = travel;
    this.lastLength = length;

    var s = map.map(travel);
    var innerTruncate = Math.max(0, this.truncate - this.arrow / this.aspect);
    var e = map.map(travel + length - innerTruncate);

    // Map onto segment slots
    var min = this.getPathCount();
    function cap(x) {
      return Math.min(min, Math.max(0, x));
    }
    var floor = cap(Math.floor(s));
    var ceil = cap(Math.ceil(e));

    // Align start at 0
    if (this.baseIndex == -1) {
      this.baseIndex = floor;
    }

    // Count active segments
    var startSlot = floor - this.baseIndex;
    var endSlot = ceil - this.baseIndex;
    var activeSegments = endSlot - startSlot;

    // Add room for caps
    endSlot = startSlot + activeSegments + (this.arrow ? 5 : 4);
    this.range = endSlot - startSlot;

    // Sanity check
    if (this.range >= ns) {
      console.warn('Track: Segment limit exceeded');
    }
    else {
      // Unnecessary clearing for visualization purposes
      if (this.lastStartSlot < startSlot) {
        this.clear(this.lastStartSlot, startSlot - this.lastStartSlot);
      }
      if (this.lastEndSlot > endSlot) {
        this.clear(endSlot + 1, this.lastEndSlot - endSlot);
      }
    }

    // Wrap slot index and remember state
    this.startSlot = ((startSlot % ns) + ns) % ns;
    this.endSlot = ((endSlot % ns) + ns) % ns;

    // Re-align to new start
    this.beginPass(this.startSlot, writeCallback);

    // Begin and end mini cuts
    var beginCut = map.map(travel - this.edge);
    var endCut = map.map(travel + length - innerTruncate + this.edge);

    // Build track outlines

    // Begin cap
    var g = this.generators;
    this.nextSlot(beginCut, g.begin);
    this.nextSlot(beginCut, g.beginCap);
    this.nextSlot(s, g.outline);

    // Body
    for (var i = 1; i < activeSegments; ++i) {
      var o = floor + i;
      this.nextSlot(o, g.outline);
    }

    // Arrowhead
    if (this.arrow) {
      this.nextSlot(e, g.outline, endCut);
      this.nextSlot(e, g.beginArrow, endCut);
      this.nextSlot(e, g.midArrow, endCut);
      this.nextSlot(e, g.endArrow, endCut);
    }
    // End cap
    else {
      this.nextSlot(e, g.outline);
      this.nextSlot(endCut, g.endCap);
      this.nextSlot(endCut, g.end);
    }

    this.endPass();

    // Remember unwrapped slot indices for clearing
    this.lastStartSlot = startSlot;
    this.lastEndSlot = endSlot;
  },

  getGeometryOffsets: function (pageIndex) {

    var g = this.geometryOffsets;
    var n = this.nSegments * this.nProfile;

    var start = this.startSlot * this.nProfile;
    var end = start + this.range * this.nProfile;
    var count = this.range * this.nProfile;

    if (start == end) return [];

    g[0].priority = this.priority;
    g[1].priority = this.priority;

    if (end > n) {
      // Wrap around vertex buffer edge
      g[0].start = (pageIndex + start) * 6;
      g[0].index = 0;
      g[0].count = (n - start) * 6;

      g[1].start = (pageIndex) * 6;
      g[1].index = 0;
      g[1].count = (count - (n - start)) * 6;

      return g;
    }
    else {
      // Single contiguous chunk
      g[0].start = (pageIndex + start) * 6;
      g[0].index = 0;
      g[0].count = count * 6;

      return [g[0]];
    }

  },

  getPathCount: function () {
    return this.path.vertices.length;
  },

  getMatrices: function (offset) {
    // Return 4x4 and 3x3 TBN matrix at given offset along path

    var pathVerts = this.path.vertices;
    var pathNorms = this.path.normals;

    var index = Math.floor(Math.max(0, Math.min(pathVerts.length - 1.0001, offset)));
    var frac = offset - index;

    var va = pathVerts[index - 1];
    var vb = pathVerts[index    ];
    var vc = pathVerts[index + 1];
    var vd = pathVerts[index + 2];

    var nb = pathNorms[index    ];
    var nc = pathNorms[index + 1];

    // Lerp tangent
    if ((index == 0 && frac <= .5) ||
        (index == pathVerts.length - 2 && frac > .5)) {
      v3.subVectors(vc, vb);
    }
    else {
      if (frac > .5) {
        v1.subVectors(vc, vb);
        v2.subVectors(vd, vc);
      }
      else {
        v1.subVectors(vb, va);
        v2.subVectors(vc, vb);
      }
      v3.copy(v1).lerp(v2, (frac + .5)%1);
    }

    // Lerp normal
    v4.copy(nb).lerp(nc, frac);

    // Lerp position
    v1.copy(vb).lerp(vc, frac);

    // Build TBN matrix
    var T = v3.normalize();
    var N = v4.normalize();
    var B = v5.crossVectors(T, N);
    N.crossVectors(T, B);

    this.mat4.set(
      B.x, N.x, T.x, v1.x,
      B.y, N.y, T.y, v1.y,
      B.z, N.z, T.z, v1.z,
      0,   0,   0,   1//,
    );

    this.mat3.set(
      B.x, N.x, T.x,
      B.y, N.y, T.y,
      B.z, N.z, T.z//,
    );

    return { mat4: this.mat4, mat3: this.mat3 };
  },

  getBlank: function (writePointer) {
    var n = this.nProfile;

    // Marker for debugging
    for (var i = 0, j = writePointer*8; i < n; ++i, j += 8) {
      this.buffer[j  ] = 0;
      this.buffer[j+1] = 0;
      this.buffer[j+2] = 0;
      this.buffer[j+3] = 1;

      this.buffer[j+4] = 0;
      this.buffer[j+5] = 0;
      this.buffer[j+6] = 1;
      this.buffer[j+7] = 1;
    }
  },

  getEnd: function (offset, neg, writePointer) {
    // End piece (degenerate)

    var m = this.getMatrices(offset);

    v1.set(0, 0, 0);
    v1.applyMatrix4(m.mat4);

    var e = m.mat3.elements;
    v2.set(neg * e[6], neg * e[7], neg * e[8]);

    // AO values returned in v6 / v7
    if (this.receiveAO) this.getAO(offset);

    var ao = 1;
    if (this.receiveAO) {
      ao = (v6.y + v6.x + v7.y + v7.x) / 4;
    }

    var n = this.nProfile;
    for (var i = 0, j = writePointer*8; i < n; ++i, j += 8) {

      this.buffer[j  ] = v1.x;
      this.buffer[j+1] = v1.y;
      this.buffer[j+2] = v1.z;

      this.buffer[j+3] = ao;

      this.buffer[j+4] = v2.x;
      this.buffer[j+5] = v2.y;
      this.buffer[j+6] = v2.z;

      // unused
      this.buffer[j+7] = 1.0;
    }

    return this.buffer;
  },

  getOutline: function (offset, shift, aoOffset, neg, sx, sy, writePointer) {
    // Middle piece
    var m = this.getMatrices(offset);

    var profileVerts = this.profile.vertices;
    var profileNorms = this.profile.normals;
    var n = this.nProfile;

    var e = m.mat3.elements;
    v4.set(neg * e[6], neg * e[7], neg * e[8]);

    v3.set(sx, sy, 1);

    // AO values returned in v6 / v7
    if (this.receiveAO) this.getAO(aoOffset);

    for (var i = 0, j = writePointer*8; i < n; ++i, j += 8) {
      v1.copy(profileVerts[i]);
      v1.z += shift;

      v1.multiply(v3).applyMatrix4(m.mat4);

      this.buffer[j  ] = v1.x;
      this.buffer[j+1] = v1.y;
      this.buffer[j+2] = v1.z;

      var ao = 1;
      if (this.receiveAO) {
        var fx = (profileNorms[i].x * .5 + .5)
        var fy = (profileNorms[i].y * .5 + .5);

        // Fuck with normals to look good
        fx = (fx + 3*(profileVerts[i].x / this.width * .5 + .5))/4;
        fy = (fy + 3*(profileVerts[i].y / this.height * .5 + .5))/4;

        fx *= sx;
        fy *= sy;

        // Bilinear filter AO around profile
        var ao1 = v7.y + (v7.x - v7.y) * fy;
        var ao2 = v6.y + (v6.x - v6.y) * fy;
        ao = ao1 + (ao2 - ao1) * fx;
      }

      this.buffer[j+3] = ao;

      if (neg) {
        this.buffer[j+4] = v4.x;
        this.buffer[j+5] = v4.y;
        this.buffer[j+6] = v4.z;
      }
      else {
        v2.copy(profileNorms[i]);
        v2.applyMatrix3(m.mat3);

        this.buffer[j+4] = v2.x;
        this.buffer[j+5] = v2.y;
        this.buffer[j+6] = v2.z;
      }

      // unused
      this.buffer[j+7] = 1.0;
    }

    return this.buffer;
  },

  getAO: function (o) {
    var distance = Math.max(this.AOStart, Math.min(this.AOEnd, this.lengthMap.unmap(o)));

    var offset = (distance - this.AOStart) / this.AOStep;
    var index = Math.min(this.AODiscs.length / 2 - 2, Math.floor(offset));
    var frac = offset - index;

    index *= 2;

    var a = this.AODiscs[index].front;
    var b = this.AODiscs[index + 2].front;

    var c = this.AODiscs[index].back;
    var d = this.AODiscs[index + 2].back;

    var e = this.AODiscs[index + 1].front;
    var f = this.AODiscs[index + 3].front;

    var g = this.AODiscs[index + 1].back;
    var h = this.AODiscs[index + 3].back;

    function ramp(ao) {
      return Math.max(.1, Math.min(1.0 - ao * .75));
    }

    // Cosine interpolation
    frac = .5 - .5 * Math.cos(frac * π);

    // Filter 4 neighbouring discs along curve direction, return left/right and front/back.

    // Return in v6 / v7
    v6.set(ramp(a + (b - a) * frac), ramp(c + (d - c) * frac), 0);
    v7.set(ramp(e + (f - e) * frac), ramp(g + (h - g) * frac), 0);
  },

  getN: function () {
    return this.nProfile;
  },

  getColor: function () {
    return this.color;
  },

  generateDiscs: function (defaultStep, previousTrack) {
    if (!this.castAO && !this.receiveAO) {
      return [];
    }

    var step = this.AOStep || defaultStep;

    var out = [];
    var v1 = _v();
    var v2 = _v();

    var start = this.travelAO || Math.max(300, this.travelOverride);
    var end = start + (this.lengthAO || Math.min(3000, this.lengthOverride));

    var map = this.lengthMap;
    var n = (end - start) / step;

    this.AOStep = step;
    this.AOStart = start;
    this.AOEnd = end;

    if (this.castAO) {
      for (var i = 0; i < n; ++i) {
        var m = this.getMatrices(map.map(start)).mat4.elements;

        v1.set(m[12], m[13], m[14]);
        v2.set(m[4], m[5], m[6]);

        v3.set(m[0], m[1], m[2]).multiplyScalar(this.width / 1.4);

        var radius = (step / 2 + this.width / 1.2) / 2 * this.castAO;

        out.push(new tr.Disc(v1.clone().add(v3), v2.clone(), radius, this.receiveAO));
        out.push(new tr.Disc(v1.clone().sub(v3), v2.clone(), radius, this.receiveAO));
        start += step;
      }
      this.AODiscs = out;
    }
    else {
      // Hack: inherit previous track's discs.
      this.AODiscs = previousTrack;
    }

    return out;
  },

};

tr.Track.index = 0;


tr.Slot = function () {
  this.offset = -1;
  this.type   = null;
}

tr.AmbientOcclusion = function () {
  this.discs = [];
  this.discHash = {};

  this.range = 130; // range in world units to scan for
}

tr.AmbientOcclusion.prototype = {

  build: function (tracks) {
    var step = 50;

    var discs = [];

    // Generate discs
    tracks.forEach(function (track) {
      discs = track.generateDiscs(step, discs);
      this.discs = this.discs.concat(discs);
    }.bind(this));

    // Sort into x/y/z buckets
    this.discs.forEach(function (disc) {
      var key = this.hash(disc);
      if (!this.discHash[key]) this.discHash[key] = [];
      this.discHash[key].push(disc);
    }.bind(this));
  },

  hash: function (disc) {
    var p = disc.position;
    return [Math.round(p.x / this.range * .9), Math.round(p.y / this.range * .9), Math.round(p.z / this.range * .9)];
  },

  compute: function () {
    this.shade();
    this.swap();
    this.shade();
  },

  shade: function () {
    var n = this.discs.length;
    var range = this.range;

    for (var i = 0; i < n; ++i) {
      var receiver = this.discs[i];

      var refX = receiver.position.x;
      var absorption = receiver.absorption;

      v1.copy(receiver.position);
      v2.copy(receiver.normal);

      var hash = this.hash(receiver);
      for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
          for (var x = -1; x <= 1; x++) {
            var key = [hash[0] + x, hash[1] + y, hash[2] + z];
            var list = this.discHash[key];
            if (!list) continue;

            var m = list.length;
            for (var j = 0; j < m; ++j) {

              var emitter = list[j];
              if (receiver == emitter) continue;

              v3.copy(emitter.position).sub(v1);
              var distance = v3.length();
              if (distance > range) continue;

              var flipped = receiver.normal.dot(emitter.normal) < 0;
              var face = flipped ? 'lastFront' : 'lastBack';

              var falloff = .4 + .6 * Math.max(0, 1.0 - emitter[face]);

              v3.normalize();
              var cosTe = v3.dot(emitter.normal);
              var cosTr = v3.dot(receiver.normal);

              var area = (1.0 - 1.0 / Math.sqrt(emitter.radius * emitter.radius * 2 / (distance * distance) + 1)) * Math.abs(cosTe) * Math.min(1, 4 * Math.abs(cosTr));

              if (cosTr > 0) {
                receiver.front += area * falloff * absorption;
              }
              else {
                receiver.back += area * falloff * absorption;
              }

            }
          }
        }
      }
    }

  },

  swap: function () {
    var n = this.discs.length;

    for (var i = 0; i < n; ++i) {
      var receiver = this.discs[i];
      receiver.lastFront = receiver.front;
      receiver.lastBack  = receiver.back;
      receiver.front = 0;
      receiver.back = 0;
    }
  },

};

tr.Disc = function (position, normal, radius, absorption) {
  this.position = position || _v();
  this.normal   = normal || _v();
  this.radius   = radius || 1;
  this.absorption = absorption || 1;

  this.lastFront     = 0;
  this.lastBack      = 0;

  this.front     = 0;
  this.back      = 0;
}

function toDepthMaterial(material) {
  var m = material.clone();
  m.fragmentShader = THREE.ShaderLib["depthRGBA"].fragmentShader;
  m.vertexShader = Acko.TrackShader.depthVertexShader;
  m.blending = THREE.NoBlending;
  m.transparent = true;
  m.uniforms = material.uniforms;

  return m;
}

function makeProfile(w, h, a, n) {
  var vertices = [];
  var normals = [];
  var step = τ/n, th = step / 2;

  v1.set(0, 0, 1);

  // Superellipse
  for (var i = 0; i < n; ++i) {
    vertices.push(_v(pow(Math.cos(th), a) * w, pow(Math.sin(th), a) * h, 0));
    th += step;
  }

  // Vertex normals
  for (var i = 0; i < n; ++i) {
    normals.push(vertices[(i + 1) % n].clone().sub(vertices[(i + n - 1) % n]).cross(v1).normalize());
  }

  return { vertices: vertices, normals: normals };
}

function warpVertex(v) {
  v.z += Math.cos(v.x / 250) * 30.0;
  return v;
}

function makePath(points, defaultDetail, smooth, bank, up, relative, warp, spring, refine, simplify) {
  var vertices = [];
  var normals = [];

  // Cosmetic warp
  function applyWarp(v) {
    if (warp) return warpVertex(v);
    return v;
  }

  var last = null;
  var n = points.length;
  for (var i = 0; i < n; ++i) {

    var prev = points[i - 1];
    var point = points[i];
    var next = points[i + 1];

    var pos = point[0];
    var normal = point[1];
    var radius = point[2] || 0;
    var detail = point[3] || defaultDetail;

    if (prev && next && radius > 0) {
      // Round corner
      var prevPos = prev[0];
      var nextPos = next[0];
      var nextNormal = next[1];

      // Cap border radius
      v1.subVectors(prevPos, pos);
      var l1 = v1.length();
      v2.subVectors(nextPos, pos);
      var l2 = v2.length();
      radius = Math.min(radius, Math.min(l1, l2) / 2);
      v1.multiplyScalar(radius / l1);
      v2.multiplyScalar(radius / l2);

      // Find center
      v3.addVectors(v1, v2);
      v3.add(pos);

      var step = π/2/(detail-1), th = 0;
      for (var j = 0; j < detail; ++j) {
        // Superellipse
        var cos = pow(Math.cos(th), .8);
        var sin = pow(Math.sin(th), .8);

        v4.copy(v2).multiplyScalar(-cos);
        v5.copy(v1).multiplyScalar(-sin);

        v4.add(v5);
        v4.add(v3);
        v4.add(relative);

        vertices.push(applyWarp(v4.clone()));

        if (!bank) {
          // Interpolate normals
          v4.copy(normal).multiplyScalar(cos);
          v5.copy(nextNormal).multiplyScalar(sin);
          v4.add(v5);
          normals.push(v4.clone());
        }
        else {
          // Add placeholder normal
          normals.push(_v());
        }

        th += step;
      }

    }
    else {
      vertices.push(applyWarp(pos.clone().add(relative)));
      normals.push(!bank ? normal : _v());
    }
  }

  n = vertices.length;

  for (var i = 1; i < n - 1; ++i) {
    var l = v1.subVectors(vertices[i], vertices[i - 1]).length();
    if (l < 1) {
      vertices.splice(i, 1);
      i--;
      n--;
    }
  }

  if (smooth > 0) {
    // Relax curve iteratively
    for (var i = 0; i < smooth; ++i) {
      v1.copy(vertices[0]);
      v2.copy(vertices[1]);

      for (var j = 1; j < n - 2; ++j) {
        v3.copy(vertices[j + 1]);

        v4.subVectors(v1, v2);
        v5.subVectors(v3, v2);

        var l1 = v4.length();
        var l2 = v5.length();
        if (l1 > 0 && l2 > 0) {
          v4.add(v5).multiplyScalar(spring);
          vertices[j].add(v4);
        }

        v1.copy(v2);
        v2.copy(v3);
      }
    }
  }

  if (refine && n > 3) {
    // Refine corners and simplify straights

    var high = 9*τ/360;
    var low = 1*τ/360;
    var added = 0;
    var removed = 0;

    var vertices2, normals2;

    // Subdivide sections that are still too angular
    for (var k = 0; k < 2; ++k) {
      vertices2 = [];
      normals2 = [];

      vertices2.push(vertices[0]);
      normals2.push(normals[0]);

      v1.copy(vertices[0]);
      v2.copy(vertices[1]);

      for (var i = 1; i < n - 2; ++i) {
        v3.copy(vertices[i + 1]);

        v4.subVectors(v1, v2).normalize();
        v5.subVectors(v3, v2).normalize();

        v6.crossVectors(v4, v5);

        vertices2.push(vertices[i]);
        normals2.push(normals[i]);

        var angle = Math.asin(v6.length());

        if (angle > high) {
          v4.copy(vertices[i + 2]);

          for (var j = 1/2; j < 1; j += 1/2) {
            var j2 = j*j;
            var j3 = j2*j;

            v5.x = tr.interpolate(v1.x, v2.x, v3.x, v4.x, j, j2, j3);
            v5.y = tr.interpolate(v1.y, v2.y, v3.y, v4.y, j, j2, j3);
            v5.z = tr.interpolate(v1.z, v2.z, v3.z, v4.z, j, j2, j3);

            vertices2.push(v5.clone());
            normals2.push(_v());

            added++;
          }
        }

        v1.copy(v2);
        v2.copy(v3);
      }

      vertices2.push(vertices[i]);
      normals2.push(normals[i]);
      vertices2.push(vertices[i + 1]);
      normals2.push(normals[i + 1]);

      vertices = vertices2;
      normals = normals2;

      n = vertices.length;
    }

    if (simplify) {
      vertices2 = [];
      normals2 = [];
      vertices2.push(vertices[0]);
      normals2.push(normals[0]);

      var accum = 0;

      v1.copy(vertices[0]);
      v2.copy(vertices[1]);

      // Merge sections that are too straight
      for (var i = 1; i < n - 2; ++i) {
        v3.copy(vertices[i + 1]);

        v4.subVectors(v1, v2).normalize();
        v5.subVectors(v3, v2).normalize();

        v6.crossVectors(v4, v5);

        var angle = Math.asin(v6.length()) + accum;

        if (angle > low) {
          vertices2.push(vertices[i]);
          normals2.push(normals[i]);

          accum = 0;
        }
        else {
          removed++;
          accum = angle;
        }

        v1.copy(v2);
        v2.copy(v3);
      }

      //console.log("Refine", added, removed)
      //console.log(vertices.length, vertices2.length);

      vertices2.push(vertices[i]);
      normals2.push(normals[i]);
      vertices2.push(vertices[i + 1]);
      normals2.push(normals[i + 1]);

      vertices = vertices2;
      normals = normals2;

      n = vertices.length;
    }
  }


  if (bank) {
    // Auto-bank normals using parallel transport
    normals[0].copy(up).normalize();

    v6.copy(normals[0]);

    v1.copy(vertices[0]);
    v2.copy(vertices[1]);

    for (var i = 1; i < n - 1; ++i) {
      v3.copy(vertices[i + 1]);

      // Cross two adjacent edges
      v4.subVectors(v2, v1).normalize();
      v5.subVectors(v3, v2).normalize();
      v4.cross(v5);

      // Construct rotation matrix
      var th = Math.asin(v4.length());
      var c = Math.cos(th);
      var s = Math.sin(th);

      v4.normalize();

      var mat3 = new THREE.Matrix3(
          c + v4.x*v4.x*(1 - c), v4.x*v4.y*(1 - c) - v4.z*s, v4.x*v4.z*(1 - c) + v4.y*s, 
          v4.x*v4.y*(1 - c) + v4.z*s, c + v4.y*v4.y*(1 - c), v4.y*v4.z*(1 - c) - v4.x*s, 
          v4.x*v4.z*(1 - c) - v4.y*s, v4.y*v4.z*(1 - c) + v4.x*s, c + v4.z*v4.z*(1 - c)//, 
        );

      // Rotate normal
      v6.applyMatrix3(mat3).normalize();
      normals[i].copy(v6);

      v1.copy(v2);
      v2.copy(v3);
    }
    normals[i].copy(v6);

    // Smooth normals
    for (var i = 0; i < 2; ++i) {
      v1.copy(normals[0]);
      v2.copy(normals[1]);

      for (var j = 1; j < n - 1; ++j) {
        v3.copy(normals[j + 1]);

        v4.subVectors(v1, v2);
        v5.subVectors(v3, v2);

        var l1 = v4.length();
        var l2 = v5.length();
        if (l1 > 0 && l2 > 0) {
          v4.add(v5).multiplyScalar(.3);
          normals[j].add(v4).normalize();
        }

        v1.copy(v2);
        v2.copy(v3);
      }
    }
  }

  // Force lo-res
  var lores = navigator.userAgent.match(/Android/);
  if (lores) {
    var v = vertices.filter(function (v, i) { return !(i%2); });
    var n = normals.filter(function (v, i) { return !(i%2); });

    vertices = v;
    normals = n;
  }

  return { vertices: vertices, normals: normals };
}

tr.interpolate = function (p0, p1, p2, p3, t, t2, t3) {
  // Catmull-Rom
  var v0 = (p2 - p0) * 0.5,
      v1 = (p3 - p1) * 0.5;

  return t3 * ( 2 * (p1 - p2) + v0 + v1)
       + t2 * (-3 * (p1 - p2) - 2 * v0 - v1)
       + t  *  v0 + p1;
}

// Linear remapping of a path
tr.LengthMap = function (points) {
  this.points = points;

  var lengths = this.lengths = [];
  var accum = this.accum = [0];
  var n = points.length;

  var x = 0;
  for (var i = 1; i < n; ++i) {
    var l = v1.subVectors(points[i], points[i - 1]).length();
    lengths.push(l);
    accum.push(x += l);
  }

}

tr.LengthMap.prototype = {

  getLength: function () {
    return this.accum[this.accum.length - 1];
  },

  unmap: function (offset) {
    var floor = Math.floor(Math.max(0, Math.min(this.accum.length - 2, offset)));
    var frac = offset - floor;
    var a = this.accum[floor];
    var b = this.accum[floor + 1]
    return a + (b - a) * frac;
  },

  map: function (distance) {
    var start = 0;
    var accum = this.accum;
    var end = accum.length - 2;

    do {
      var mid = Math.ceil((start + end)/2);
      if (distance < accum[mid]) {
        end = mid - 1;
      }
      else {
        start = mid;
      }
    } while (end - start > 0);

    var s = accum[start];
    var e = accum[start + 1];

    var f = (distance - s) / (e - s);
    return start + f;
  },

};

function makeDiscs(tracks, color, color2) {

  var discs = [];
  var last = null;
  for (var i in tracks) {
    if ((last != tracks[i].AODiscs) && tracks[i].AODiscs)
      discs = discs.concat(tracks[i].AODiscs);
    last = tracks[i].AODiscs;
  }

  var n = discs.length;

  var group = new THREE.Object3D();

  group.add(function () {
    var geometry = new THREE.Geometry();
    var linevs = geometry.vertices = [];

    var detail = 12;
    var step = τ/detail;
    for (var i = 0; i < n; ++i) {
      var disc = discs[i];
      var r = disc.radius;

      v1.copy(disc.normal);
      v2.copy(disc.position);

      v3.copy(disc.normal);
      v3.x += v3.y * 2;
      v3.z += .1 - v3.y;
      v3.cross(v1).normalize();
      v4.crossVectors(v3, v1);

      v7.copy(v2);

      var lum = Math.max(0, 1.0 - disc.front);
      if (lum <= 0) continue;

      linevs.push(v1.clone().multiplyScalar(.5).add(v2));
      linevs.push(v1.clone().multiplyScalar(lum * r).add(v2));

      linevs.push(v3.clone().multiplyScalar(r*.5).add(v2));
      linevs.push(v3.clone().multiplyScalar(r).add(v2));

      linevs.push(v3.clone().multiplyScalar(-r*.5).add(v2));
      linevs.push(v3.clone().multiplyScalar(-r).add(v2));

      linevs.push(v4.clone().multiplyScalar(r*.5).add(v2));
      linevs.push(v4.clone().multiplyScalar(r).add(v2));

      linevs.push(v4.clone().multiplyScalar(-r*.5).add(v2));
      linevs.push(v4.clone().multiplyScalar(-r).add(v2));

      var th = 0;
      for (var j = 0; j <= detail; ++j) {

        v5.copy(v3).multiplyScalar(Math.cos(th)*r*lum);
        v6.copy(v4).multiplyScalar(Math.sin(th)*r*lum);
        v6.add(v5).add(v2);

        if (j > 0) {
          linevs.push(v6.clone());
          linevs.push(v7.clone());
        }

        v7.copy(v6);

        th += step;
      }
    }

    geometry.computeBoundingSphere();

    var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: color }));
    line.type = THREE.LinePieces;
    line.renderDepth = 3;

    return line;
  }());

  color2 = color2.clone();
  color2.r *= .5;
  color2.g *= .5;
  color2.b *= .5;

  group.add(function () {
    var geometry = new THREE.Geometry();
    var linevs = geometry.vertices = [];

    var detail = 12;
    var step = τ/detail;
    for (var i = 0; i < n; ++i) {
      var disc = discs[i];
      var r = disc.radius;

      v1.copy(disc.normal);
      v2.copy(disc.position);

      v3.copy(disc.normal);
      v3.x += v3.y * 2;
      v3.z += .1 - v3.y;
      v3.cross(v1).normalize();
      v4.crossVectors(v3, v1);

      v7.copy(v2);

      var lum = Math.max(0, 1.0 - disc.back);

      if (lum <= 0) continue;

      linevs.push(v1.clone().multiplyScalar(-.5).add(v2));
      linevs.push(v1.clone().multiplyScalar(-lum * r).add(v2));

      var th = 0;
      for (var j = 0; j <= detail; ++j) {

        v5.copy(v3).multiplyScalar(Math.cos(th)*r*lum);
        v6.copy(v4).multiplyScalar(Math.sin(th)*r*lum);
        v6.add(v5).add(v2);

        if (j > 0) {
          linevs.push(v6.clone());
          linevs.push(v7.clone());
        }

        v7.copy(v6);

        th += step;
      }
    }

    geometry.computeBoundingSphere();

    var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: color2 }));
    line.type = THREE.LinePieces;
    line.renderDepth = 10;

    return line;
  }());

  return group;
}

})(Acko.Effect.Tracks);

Acko.Effects.push(new Acko.Effect.Tracks());
