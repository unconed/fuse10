Acko.Effect.Visualizer = function () {
  Acko.Effect.call(this);

  this.order = -5;
  this.display = null;
  this.last = 0;

  this.skip = 25;
  this.fade = 10;

  this.volume = 1;
  this.rotate = 0;
  this.fakelevels = [];

  this.level = 0;
  this.levels = [];
  this.smooths = [];
  this.phases = [];
  this.finals = [];
  this.boosts = [];
  this.smoothboosts = [];
  this.growlCancel = [];
  this.playing = false;

  this.lastTime = this.skip;

  this.refRotation = _v();

  this.quietFrames = 0;

  this.q1 = new THREE.Quaternion();
  this.slerpT = 0;
  this.slerpA = 0;
  this.slerpB = 0;
}

Acko.Effect.Visualizer.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.visualizer = this;
  },

  start: function () {

    if (this.playing) return;

    gl.resize(true);

    this.masthead.showArrow = 0;

    this.volume = 1;
    this.playing = true;
    this.startedAt = null;

    try {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.play();
      }
      else {
        this.injectAudio();

//        throw "no analyzer";
        this.analyzer = new ThreeAudio.Source(2048, this.audio);
      }

    } catch (e) {

      growl({
        type: 'info',
        text: '<strong>Web Audio API</strong> support is required for music response.',
      });

      this.analyzer = null;
    }

  },

  stop: function () {
    this.playing = false;

    this.masthead.showArrow = 1;

    if (this.audio) {
      try {
        this.audio.currentTime = 0;
        this.audio.pause();
      }
      catch (e) {};
    }
    this.cameraController.lock(0);
    this.volume = 0;

    this.tracks.tracks.forEach(function (track, i) {
      if (track._length !== undefined) {
        track.length = track._length;
        track.travel = track.initial = track._initial;
        delete track._length;
        delete track._initial;
      }
    });
  },

  update: function (exports) {
    this.tracks = exports.tracks;
    this.cameraController = exports.cameraController;
    this.background = exports.background;

    this.masthead = exports.masthead;

    // Use inverse camera for visualizer to not disturb with scrolling camera
    var tg = this.tracks.visibleGroup;
    var tdg = this.tracks.depthGroup;
    var bg = this.background.group;

    if (!this.playing) {
      tg.useQuaternion = tdg.useQuaternion = bg.useQuaternion = false;

      tg.rotation.x = 0;
      tg.rotation.y = 0;
      tg.rotation.z = 0;

      tdg.rotation.copy(tg.rotation);
      bg.rotation.copy(tg.rotation);

      return;
    }

    // Audio clock is not fine enough in moz, replicate its signal
    if (!this.startedAt && this.audio && this.audio.currentTime > this.skip) {
      this.startedAt = Time.absolute() - this.skip;
    }
    var time = this.startedAt ? Time.absolute() - this.startedAt : 0;

    // Stuff
    if (this.lastTime < 400 && time >= 400) {
      achievement && achievement('hpntd');
    }
    var end = 422;

    // Volume fade
    var target = this.volume * Math.min(1, Math.max(0, Math.exp((-exports.scroll.y / exports.pageStart)*4.0 + .3)));

    // Force volume up for demonstration
    if (this.quietFrames < 0) {
      target = Math.min(1, 1 - this.quietFrames / 30);
    }

    var fade = Math.max(0, Math.min(1, (time - this.skip) / this.fade))
             * Math.max(0, Math.min(1, (end - time) / this.fade));
    this.level = this.level + (target - this.level) * .05;
    if (this.audio) {
      try {
        this.audio.volume = this.level * fade * Acko.globalVolume;
      } catch (e) {};
    }

    // Get audio levels
    var levels;
    if (this.analyzer) {
      this.analyzer.update();
      if (this.analyzer.data) {
        levels = this.analyzer.data.freq;
      }
    }
    if (!levels) {
      levels = this.fakelevels;
      var tt = time / 131.9;
      var intensity = Math.min(1,tt);
      for (var i = 0; i < 1024; ++i) {
        var displace = Math.sin(i + tt * .3112 + Math.cos(tt *.735)) + Math.sin(i + tt * .498 + Math.cos(tt *.261));
        levels[i] = Math.min(255, Math.max(0, levels[i]||0)*.98 + displace*(1.5+intensity));
      }
    }

    // Map tracks to frequencies
    var bins = [
      15, 15, 20, 20, 40, 40, 10, 10, 70, 50, 60, 100, 50, 80,
    ];
    var volumes = [
      .35, .35, .5, .5, 1, 1, .6, .6, 3.0, 1.7, 1.9, 4.5, 1.8, 2.1,
    ];
    var offsets = [
      -150, -150, 0, 0, 0, 0, 200, 200, 200, -200, -400, -500, -500, 500,
    ];
    var lengths = [
      20, 20, 20, 20, 20, 20, 90, 90, 100, 50, 50, 200, 50, 50,
    ];

    // Begin wild phase
    var trans = 129.7;
    var wild = Math.max(0, Math.min(1, (time - trans) / 2));

    // Begin turning
    var trans2 = 104.5-2;
    var turn = Math.max(0, (time - trans2) / 15);
    turn = (turn < .5 ? turn*turn : turn-.25);

    // Camera 'path'
    tg.rotation.x = (Math.sqrt(2 + turn*turn)/2 - Math.sqrt(2)/2)*3.66 + Math.sin(turn * .133 + .25 * Math.sin(turn*.471));
    tg.rotation.y = (Math.sqrt(turn+1)-1 + Math.sin(turn * .165 + .5 * Math.sin(turn*1.411)))*1.74;
    tg.rotation.z = turn * .21;

    // Collision fix
    var mid = 134.9;
    var range = 20;
    var lerp = .5+.5*Math.cos(Math.max(-π, Math.min(π, (time - mid)*π/range)));
    tg.rotation.y += lerp * .2;

    // Direction change
    var trans8 = 365;
    var change = Math.min(1, Math.max(0, (time - trans8) / 60));
    tg.rotation.x += (.5-.5*Math.cos(change*π)) * π * .3;
    tg.rotation.z += (.5-.5*Math.cos(change*π)) * π * .2;


    // Dispersion phases
    var trans4 = 180.5;
    wild *= Math.max(0, Math.min(1, (trans4 - time - 1) / π));
    var disperse = Math.max(0, Math.min(1, (time - trans4 - 1) / π))

    var trans5 = 199.65;
    wild += Math.max(0, Math.min(1, (time - trans5 - 1) / π));
    disperse *= Math.max(0, Math.min(1, (trans5 - time - 1) / π))

    var trans6 = 243.65;
    wild *= Math.max(0, Math.min(1, (trans6 - time - 1) / π));
    disperse += Math.max(0, Math.min(1, (time - trans6 - 1) / π))

    var trans7 = 294.85;
    wild += Math.max(0, Math.min(1, (time - trans7 - 1) / π));
    disperse *= Math.max(0, Math.min(1, (trans7 - time - 1) / π))

    disperse = .5 - .5 * Math.cos(disperse * π);
    wild = .6 - .6 * Math.cos(wild * π);

    // Apply to tracks
    this.tracks.tracks.forEach(function (track, i) {
      if (i > 13) return;

      if (this.levels[i] === undefined) {
        this.phases[i] = this.finals[i] = this.smooths[i] = this.smoothboosts[i] = 0;
        this.levels[i] = [0, 0, 0];
        this.boosts[i] = [0, 0, 0];
      }

      // 3-tap average filter for levels
      var level = (levels[bins[i]*8]/255 * volumes[i]) || 0;
      level = Math.max(0, level*1.1 - .1);

      var l = this.levels[i];
      l.push(level);
      if (l.length > 3) l.shift();
      var avgLevel = l.reduce(function (a, b) { return a + b; }, 0) / l.length;

      // Two phases of lerping
      var timefactor = Math.min(4.0, exports.delta / 0.01666);
      var lerpfactor = .045 * timefactor;
      var smoothed = this.smooths[i] = this.smooths[i] + (avgLevel - this.smooths[i]) * lerpfactor;
      var finaled = this.finals[i] = this.finals[i] + (smoothed - this.finals[i]) * lerpfactor;

      // Boost from derivative
      var boost = Math.max(0, -this.finals[i] + this.smooths[i]);

      // 5-tap average filter for boost
      var b = this.boosts[i];
      b.push(boost);
      if (b.length > 5) b.shift();
      var avgBoost = b.reduce(function (a, b) { return a + b; }, 0) / b.length;
      smoothBoost = this.smoothboosts[i] = this.smoothboosts[i] + (avgBoost - this.smoothboosts[i]) * .1;

      // Calculate final length
      var finalLevel = finaled * 1500 + smoothBoost * 4;
      var length = (finalLevel + lengths[i]) * fade + lengths[i];

      // Store original track for later
      if (track._length === undefined) {
        track._length = track.length;
        track._initial = track.initial;
        track.distance = 0;
        track.speed = 0;
      }

      // Integrate level into phase
      this.phases[i] += (Math.sqrt(Math.abs(finaled)) * .01 + .0025) * timefactor;
      var ph = this.phases[i];

      // Compose motions
      var start = track.initial + track._length / 2 - length + offsets[i];
      var wobble = (i > 7) ? 400 * pow(wild * (Math.sin(1+ph*2.31+i+Math.cos(ph*.181))+Math.sin(ph*.718)), 2) : 0;
      var glide = Math.sin(ph) * (200 + length/3) * (1.0 - disperse * .75)  + 900 * disperse * pow(Math.sin(time * .64), .85);

      track.travel = start + glide + wobble;
      track.length = length * 2;

      var ease = .5 + .5 * Math.cos(Math.min(1, fade * 2) * π);
      track.travel = track.travel + (track.initial - track.travel) * ease;
      track.length = track.length + (track._length - track.length) * ease;

    }.bind(this));

    // Slerp away visualizer camera on end / scroll
    var scrollLerp = Math.max(0, Math.min(1, exports.scroll.y / (exports.pageStart / 2) * 2.0 - 1.3));
    this.slerpT = (time > end - 15) ? 1 : scrollLerp;

    var lerpFactor = (time > end - 15) ? (.005 + .095 * scrollLerp) : .1;
    this.slerpA = this.slerpA + (this.slerpT - this.slerpA) * lerpFactor;
    this.slerpB = this.slerpB + (this.slerpA - this.slerpB) * lerpFactor;

    this.cameraController.lock((this.playing && turn > 0.01) ? .01 : 0);

    tg.quaternion.setFromEuler(tg.rotation, tg.eulerOrder);
    tg.quaternion.slerp(this.q1, this.slerpB);

    tdg.rotation.copy(tg.rotation);
    bg.rotation.copy(tg.rotation);
    tdg.quaternion.copy(tg.quaternion);
    bg.quaternion.copy(tg.quaternion);

    tg.useQuaternion = tdg.useQuaternion = bg.useQuaternion = this.slerpB > 0;

    if (time > end + 15) {
      this.stop();
    }

    this.lastTime = time;

  },

  tick: function (exports) {

    if (!this.playing) return;

    // Stop
    if (this.level < 0.05 || this.quietFrames < 0) this.quietFrames++;
    else this.quietFrames = Math.min(0, this.quietFrames);

    if (this.quietFrames > 180) {
      this.stop();
      this.quietFrames = 0;
    }

  },

  resize: function (exports) {
  },

  injectAudio: function () {
    if (this.audio) return;

    var audio = this.audio = new Audio();

    var url;
    var sources = [
      ['audio/ogg', 'audio/dangerous-days.ogg'],
      ['audio/mpeg', 'audio/dangerous-days.mp3'],
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

    audio.style.display = 'none';
    document.body.appendChild(audio);

    audio.autoplay = true;
    audio.src = url;

    audio.addEventListener('play', function () {
      try {
        audio.currentTime = this.skip;
      } catch (e) {};
      audio.volume = 0;

      growl({
        type: 'music',
        text: '<strong>Seba</strong><br>Dangerous Days',
        delay: 500,
        link: 'http://www.secretoperations.com/',
      });
    }.bind(this));
  },
});

Acko.Effects.push(new Acko.Effect.Visualizer());

