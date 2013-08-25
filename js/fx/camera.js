Acko.Effect.Camera = function () {
  Acko.Effect.call(this);

  this.order = -2;
  this.fov = 30;

  this.renderer = 'webgl';

  // Orbit positioning
  this.phi = 0;
  this.theta = 0;
  this.perspective = 0;
  this.lookAt = _v(0, 0, 0);
  this.center = _v(0, 0, 0);
  this.orbitScale = 1;

  // Easing on controls
  this.thetaI = this.thetaT = this.thetaA = this.thetaB = .27;
  this.phiT = this.phiA = this.phiB = 0;
  this.orbitT = this.orbitA = this.orbitB = 1;
  this.phiDelta = this.thetaDelta = this.orbitFactor = 0;

  // Size adjustments for responsive layout
  this.heroScale = 1;
  this.overlayScale = 1;

  // Initial position
  this.phiC = -.64;
  this.orbitC = 1200;

  // Scroll resistance near top
  this.scrollEaseRatio = .1;
  this.scrollEaseRange = 1.7;

  // Magic
  this.slowframes = 0;
  this.forceLock = 0;
  this.controls = hasAchievement('prllx');
  this.absolute = 1;
  this.sacc = 0;
  this.sdir = 0;
  this.scnt = 1;
  this.shdr = 0;
  this.travel = 0;
  this.last = [-1, -1];
  this.cuts = 0;
  this.bounceLimit = 8;
  this.ignoreClicks = 0;
  this.growlCancel = [];
  this.lastAudio = 0;
  this.cameraLock = true;
  this.rides = Acko.CameraRides;
  this.activeRide = -1 ;

  this.v1 = _v();
  this.v2 = _v();
  this.v3 = _v();
  this.v4 = _v();

  this.m1 = new THREE.Matrix4();
  this.m2 = new THREE.Matrix4();

  this.handlers = {
    'document': {},
    'window': {},
  };
  this.container = null;
}

Acko.Effect.Camera.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.cameraController = this;

    this.bind();

    this.container = document.querySelector('#native-frame');
    this.parent = exports.parent;
  },

  bind: function () {
    // Mouse controls
    var drag = false;
    var draggable = false;
    var last = [0, 0, 0, 0];
    var lastTarget = null;
    var lastCursor = null;

    var cursor = function (e) {
      e = e || {};
      var mouseY = (e.clientY || last[3]) + (this.last.y||0);
      if (e.clientY) {
        last[3] = e.clientY;
      }

      var inHeader = (mouseY < this.pageStart);
      var onDraggable = lastTarget && lastTarget.classList.contains('draggable');

      this.cameraLock = !(onDraggable || drag);

      draggable = (this.controls && !this.ride && inHeader) || onDraggable;

      var cursor = draggable ? 'move' : 'default';
      if (cursor != lastCursor) {
        this.pointerPunch.style.cursor = cursor;
        lastCursor = cursor;
      }

    }.bind(this);

    document.addEventListener('mousedown', 
      this.handlers.document.mousedown = function (e) {

      if (e.which != 1 || (e.target.tagName == 'SELECT')) return;

      drag = draggable;
      last = [e.pageX, e.pageY, e.clientX, e.clientY];

      if (drag) {
        e.preventDefault();
      }
    }.bind(this));

    document.addEventListener('mouseup',
      this.handlers.document.mouseup = function (e) {

      drag = false;
      this.cameraLock = false;

    }.bind(this));

    document.addEventListener('mousemove',
      this.handlers.document.mousemove = function (e) {

      lastTarget = e.target;
      cursor(e);

      if (drag) {
        var now = [e.pageX, e.pageY, e.clientX, e.clientY];

        this.phiT -= (now[0] - last[0]) * .005;
        this.thetaT = Math.min(π/2 * .9, Math.max(-π/2 * .9, this.thetaT + (now[1] - last[1]) * .005));
        last = now;
      }

    }.bind(this));

    window.addEventListener('scroll',
      this.handlers.window.scroll = function (e) {

      cursor();
    });

    // WASD controls
    document.addEventListener('keydown',
      this.handlers.document.keydown = function (e) {

      if (!this.controls) return;

      switch (e.keyCode) {
        case 68:
          this.phiDelta = -1;
          break;
        case 65:
          this.phiDelta = 1;
          break;
        case 87:
          this.thetaDelta = -1;
          break;
        case 83:
          this.thetaDelta += 1;
          break;
        case 81:
          this.orbitFactor = 1;
          break;
        case 69:
          this.orbitFactor = -1;
          break;
      }

    }.bind(this));
    document.addEventListener('keyup', 
      this.handlers.document.keyup = function (e) {

      if (e.keyCode == 13 || e.keyCode == 32 || e.keyCode == 27) {
        this.stopRide();
      }

      if (!this.controls) return;

      switch (e.keyCode) {
        case 68:
        case 65:
          this.phiDelta = 0;
          break;
        case 87:
        case 83:
          this.thetaDelta = 0;
          break;
        case 81:
        case 69:
          this.orbitFactor = 0;
          break;
      }

    }.bind(this));

    this.pointerPunch = document.querySelector('.pointer-punch');

    this.bound = true;
  },

  unbind: function () {
    for (var key in this.handlers) {
      var list = this.handlers[key];
      for (var type in list) {
        window[key].removeEventListener(type, list[type]);
      }
    }
    document.body.style.cursor = 'default';
    this.bound = false;
  },

  updateCameraState: function (c) {
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    c.matrixWorldInverse.getInverse(c.matrixWorld);
  },

  update: function (exports) {
    // Link up with tracks and vis effect
    this.tracks = exports.tracks;
    this.visualizer = exports.visualizer;

    var sc = exports.scene;
    var c = exports.camera;

    var s = exports.scroll;
    var tr = exports.tracks;

    var v1 = this.v1;
    var v2 = this.v2;
    var v3 = this.v3;
    var v4 = this.v4;

    var m1 = this.m1;
    var m2 = this.m2;

    if (!this.bound) {
      return this.updateCameraState(c);
    }

    // Lerp scroll twist
    var lerp = Math.max(0, Math.min(1, (s.y - 100) / Math.max(100, this.pageStart - 300)));
    var ease = .5 - .5 * Math.cos(lerp * 3.1415);
    var absolute = ease * .8 + .2;

    // Key controls
    var speed = .05;
    this.thetaT = Math.min(π/2 * .9, Math.max(-π/2 * .9, this.thetaT + speed * this.thetaDelta));
    this.phiT += speed * this.phiDelta;
    this.orbitT = Math.min(1.6, this.orbitT * pow(1.07, this.orbitFactor));

    // Lerp live controls
    this.thetaA = this.thetaA + (this.thetaT - this.thetaA) * .2;
    this.thetaB = this.thetaB + (this.thetaA - this.thetaB) * .2;
    this.theta = this.thetaB * (1.0 - ease);

    this.phiA = this.phiA + (this.phiT - this.phiA) * .2;
    this.phiB = this.phiB + (this.phiA - this.phiB) * .2;
    this.phi = this.phiB + this.phiC * (1 - ease);

    this.orbitA = this.orbitA + (this.orbitT - this.orbitA) * .2;
    this.orbitB = this.orbitB + (this.orbitA - this.orbitB) * .2;
    this.orbit = (this.orbitB + (1 - this.orbitB) * ease) * this.orbitC;

    // Intro override
    this.intro(c, exports.time);

    // Scroll resistance
    var unit = this.scrollEase;
    var ratio = this.scrollEaseRatio;
    function scrollEase(y) {
      var t = y/unit;
      t = (t<.5?t*t:t-.25)*unit;
      return t + (y - t) * ratio;
    }

    // Live hero graphic resizing for responsive layout
    exports.heroAbsScale = (1 + (1/this.overlayScale - 1) * ease) * .8;

    // Stuff
    if (Time.isSlow() && (exports.visualizer.playing || this.tracks.tracks[0].speed > 0 || this.tracks.blackhole > 0.1)) {
      this.slowFrames++;
      (this.slowFrames == 120) && achievement && achievement('bllt');
    }
    else {
      this.slowFrames = 0;
    }

    // Ride
    if (!this.audioWaiting && this.ride) {

      try {
        this.audio.volume = Acko.globalVolume;
      } catch (e) {};

      // Slave clock to audio
      var delta = this.audio.currentTime == 0 ? 0 : exports.delta / Time.getSpeed();
      delta = Math.max(.00001, delta);

      // Camera relative to tracks
      tr.visibleHolder.add(c);

      // Ride cycling
      var ride = this.rides[this.activeRide];
      var slack = 0;
      if (ride && this.travel != null) {
        var reverse = ride[7];
        var sign = reverse ? -1 : 1;

        // Loop
        var limit = reverse ? ride[2] : ride[3];
        if (this.travel * sign > limit * sign) {
          slack += Math.abs(this.travel - limit);
          ride = this.cycleRide();
        }
      }

      // Fetch track
      var index = ride[0];
      var flip = ride[1] ? -1 : 1;
      reverse = ride[7];
      sign = reverse ? -1 : 1;

      var start = ride[7] ? ride[3] : ride[2];
      var offset = ride[4];
      var fovScale = ride[5];
      var lerpScale = Math.min(1 / 10, delta) / .016 / Time.getSpeed();
      var lerp = Math.pow(ride[6]*2, 1/lerpScale);
      var targetOffset = ride[8] || [0, 0, 0];
      var correctBend = !ride[9];

      var rideTrack = tr.tracks[index];
      var step = 180 * delta * sign;
      var lookAhead = 175 * sign;

      var m;

      // Give active track z priority to reduce overdraw
      rideTrack.priority = this.cuts;

      // Pre-init lerps
      if (!this.ridePos) {
        this.travel = start + slack;

        var factor = 1 / Math.max(.25, lerp);

        m = rideTrack.getMatrices(rideTrack.lengthMap.map(this.travel - step * factor));
        m1.copy(m.mat4);

        m = rideTrack.getMatrices(rideTrack.lengthMap.map(this.travel + lookAhead - step * factor));
        m2.copy(m.mat4);

        v2.set(m1.elements[4] * offset * flip,
               m1.elements[5] * offset * flip,
               m1.elements[6] * offset * flip);

        v1.set(m1.elements[12],
               m1.elements[13],
               m1.elements[14]).add(v2);

        v3.set(m2.elements[12],
               m2.elements[13],
               m2.elements[14]).add(v2);

        v3.x += targetOffset[0];
        v3.y += targetOffset[1];
        v3.z += targetOffset[2];

        this.ridePos = _v().copy(v1);
        this.rideTarget = _v().copy(v3);
        this.rideUp = _v().copy(v2);

      }

      // Get track matrices for current point and target
      m = rideTrack.getMatrices(rideTrack.lengthMap.map(this.travel));
      m1.copy(m.mat4);

      m = rideTrack.getMatrices(rideTrack.lengthMap.map(this.travel + lookAhead));
      m2.copy(m.mat4);

      this.travel += step;

      // Track offset
      v2.set(m1.elements[4] * offset * flip,
             m1.elements[5] * offset * flip,
             m1.elements[6] * offset * flip);

      // Get pos + offset
      v1.set(m1.elements[12],
             m1.elements[13],
             m1.elements[14]).add(v2);

      // Dampen look ahead on track on downward bends
      v3.set(m2.elements[12],
             m2.elements[13],
             m2.elements[14]).add(v2).sub(v1);
      v4.set(m1.elements[4] * flip,
             m1.elements[5] * flip,
             m1.elements[6] * flip);
      var d = v3.dot(v4) / v3.length();

      var lhf = 1.0;
      if (correctBend && (d < 0)) {
        lhf = Math.max(.2, 1 + d*.2 - d*d*.6);
        var lh = lookAhead * lhf;
        matrices2 = rideTrack.getMatrices(rideTrack.lengthMap.map(this.travel + lh));
        m2 = matrices2.mat4;
      }

      // Target position
      v3.set(m2.elements[12], m2.elements[13], m2.elements[14]).add(v2);
      v3.x += targetOffset[0];
      v3.y += targetOffset[1];
      v3.z += targetOffset[2];

      // Lerp position/target/up vectors
      this.ridePos.lerp(v1, lerp);
      this.rideTarget.lerp(v3, lerp);
      this.rideUp.lerp(v2, lerp / 6 / (3.0 + lhf) * 4);

      // Construct camera matrix
      var m = c.matrix;
      m.set(1, 0, 0, this.ridePos.x,
            0, 1, 0, this.ridePos.y,
            0, 0, 1, this.ridePos.z,
            0, 0, 0, 1);

      m.lookAt(this.ridePos, this.rideTarget, this.rideUp);

      c.fov = this.fov * fovScale;

      c.matrixAutoUpdate = false;
      c.matrixWorldNeedsUpdate = true;
    }
    else {

      var h = exports.viewHeight;
      c.fov = this.fov;
      this.perspective = 0.5 / Math.tan(THREE.Math.degToRad(c.fov * 0.5)) * h;

      // Orbit positioning
      var ct = Math.cos(this.theta);
      var st = Math.sin(this.theta);
      var cp = Math.cos(this.phi);
      var sp = Math.sin(this.phi);

      var x = (s.x || 0);
      var y = -(scrollEase(s.y) || 0);

      var o = this.orbit * this.heroScale * this.orbitScale;
      var p = this.perspective;
      p = o + (p - o) * absolute;
      p = Math.min(2400, p);

      var r = p * ct;

      // Absolute camera
      sc.add(c);

      // Scroll mode
      c.matrixAutoUpdate = true;

      c.position.copy(this.center).multiplyScalar(1.0 - ease);

      c.position.x += r * sp;
      c.position.z += r * cp;
      c.position.y += p * st;

      v1.copy(this.lookAt).multiplyScalar(1.0 - ease);
      c.lookAt(v1);

      c.position.x += x - (y * st * sp) - ease * 20 + (1 - ease) * 140;
      c.position.y += y * ct;
      c.position.z -= y * st * cp;
    }

    // Scroll monitor
    if (this.last && s.y != 0) {
      var sdir = s.y - this.last.y;

      if (s.y > this.pageStart * 1.5 + 200) {
        this.scnt = 0;
      }

      if (Math.abs(sdir) > 0) {

        if (sdir * this.sacc >= 0) {
          this.sacc += sdir;
        }
        else {
          if (s.y > exports.pageStart) {
            this.shdr = Math.max(this.shdr - 1, 0);
          }
          else {
            this.shdr += 2;
          }

          if (Math.abs(this.sacc) > 50) {
            this.scnt++;

            if (this.scnt % this.bounceLimit == 0) {
              if (this.shdr > 3) {
                this.bounceLimit = 12;
                this.shdr = 0;

                achievement && achievement('prllx');

                this.controls = true;
                this.visualizer.start();
              }

              this.scnt = 0;
            }
          }
          else {
            this.scnt = Math.max(0, this.scnt - 1);
          }

          this.sacc = 0;
        }

        this.stopRide();
      }
    }
    this.last = s;

    exports.ride = this.ride;
    exports.audio = this.audio;
    exports.cameraLerp = lerp;

    var cutoff = 265.7;
    var end = 280.5;
    if (this.audio) {
      var time = this.audio.currentTime;
      if (this.lastAudio <= cutoff && time > cutoff) {
        achievement && achievement('dm');
      }
      if (this.lastAudio <= end && time > end) {
        this.audio.currentTime += 10;
      }
      this.lastAudio = time;
    }

    var pmh = exports.pastMasthead = this.last && (this.last.y > exports.pageStart);
    var phmh = exports.pastHalfMasthead = (this.last.y > this.pageStart / 2);

    var lerp = this.forceLock || .1;
    if (pmh || this.forceLock) {
      this.thetaT = this.thetaT + (this.thetaI - this.thetaT) * lerp;
    }

    if (this.forceLock || (phmh && this.cameraLock)) {
      this.phiDelta = 0;
      this.thetaDelta = 0;
      this.orbitFactor = 0;

      function mod(a) {
        return (((a + π) % τ) + τ) % τ - π;
      }

      this.phiT = mod(this.phiT) * (1.0 - lerp);
      this.phiA = mod(this.phiA);
      this.phiB = mod(this.phiB);
    }

    this.updateCameraState(c);
  },

  lock: function (lock) {
    if (lock !== undefined) {
      this.forceLock = lock;
    }
    return this.forceLock;
  },

  intro: function (camera, time) {
    if (time > 8.05) return;

    // Intro tracking shot
    var t = Math.max(0, 8 - time) * .303125;
    t = (t < .5 ? t*t : t - .25) * 4;

    this.lookAt.x = -t*t * 6;
    this.lookAt.y = -t * 18;

    this.center.x = -t * 50;
    this.center.z = -t*t * 10;
    this.center.y = t * 52;
  },

  stopRide: function () {
    if (!this.ride) return;

    this.ride = false;
    this.ridePos = null;
    this.fadeAudio();

    var cancel;
    while (cancel = this.growlCancel.pop()) cancel();

    this.tracks.override(false);

    this.parent.resize(true);
  },

  cycleRide: function () {
    var n = this.rides.length;

    this.activeRide = (this.activeRide + 1) % n;
    this.travel = null;
    this.ridePos = null;
    this.rideTarget = null;
    this.rideUp = null;

    this.cuts++;

    return this.rides[this.activeRide];
  },

  runRide: function () {
    if (this.ride) return;

    gl.exports.scrollController.set(0, 0);

    this.ignoreClicks = 1;

    this.ride = true;
    this.activeRide = -1;
    this.cycleRide();

    this.scnt = 0;

    this.visualizer.stop();
    this.tracks.override(true);

    this.injectAudio();
  },

  resize: function (exports) {
    var c = exports.camera;
    var w = exports.viewWidth;
    var h = exports.viewHeight;

    c.aspect = exports.aspect;

    this.heroScale = Math.max(1, h/w*1.9);
    exports.overlayScale = this.overlayScale = Math.max(960 / w, 1);
    this.scrollEase = h * this.scrollEaseRange;

    this.heroHeight = this.scrollEase / 2;
    this.heroMargin = 140;

    this.pointerPunch.style.paddingBottom = (this.heroHeight * .65) + 'px';

    // Push down page contents
    exports.heroMargin = this.heroMargin;
    exports.pageStart = this.pageStart = this.heroHeight + this.heroMargin + Math.max(0, exports.viewHeight - 940) / 4;
    this.container.style.top = Math.round(this.pageStart) + 'px';

    // For lining up HTML and WebGL
    exports.cameraScrollYOffset = (1 - this.scrollEaseRatio) * .25 * this.scrollEase;
  },

  injectAudio: function () {
    if (this.audio) return;

    var audio = this.audio = new Audio();

    var url;
    var sources = [
      ['audio/ogg', 'audio/this-world.ogg'],
      ['audio/mpeg', 'audio/this-world.mp3'],
    ];
    sources.forEach(function (source) {
      if (audio.canPlayType(source[0])) {
        url = source[1];
      }
    });
    if (!url) {
      growl({ type: 'info', text: 'Your browser does not support MP3 or OGG audio playback.' });
      return;
    }

    audio.autoplay = true;
    audio.style.display = 'none';
    audio.src = url;

    this.audioWaiting = true;

    audio.addEventListener('play', function () {
      this.audioWaiting = false;
      audio.currentTime = 0;


      this.growlCancel.push(growl({
        type: 'info',
        text: 'Scroll down to stop',
      }));
      this.growlCancel.push(growl({
        type: 'music',
        text: '<strong>Selah Sue</strong><br>This World',
        delay: 1000,
        link: 'http://www.selahsue.com/',
      }));
    }.bind(this));

    audio.addEventListener('ended', function () {
      this.audioWaiting = true;
      this.cycleRide();
      this.activeRide = 0;

      audio.play();
    }.bind(this));

    document.body.appendChild(audio);
  },

  fadeAudio: function () {
    var audio = this.audio;
    this.audio = null;

    var fade = 1;
    var interval = setInterval(function () {
      fade = fade * .95;
      audio.volume = fade * Acko.globalVolume;

      if (fade < .001) {
        audio.pause();
        document.body.removeChild(audio);
        clearInterval(interval);
      }
    }, 15);
  },

});

Acko.Effects.push(new Acko.Effect.Camera());
(function () {
  // Shitty depth buffer on mobile
  var crap = navigator.userAgent.match(/Android/);
  if (crap) {
    Acko.Effect.Camera.camera = new THREE.PerspectiveCamera(45, 1, 500, 10000);
  }
  else {
    Acko.Effect.Camera.camera = new THREE.PerspectiveCamera(45, 1, 2, 17000);
  }
})();
