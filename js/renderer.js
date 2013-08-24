Acko.Renderer = function (options) {
  options = options || {};

  this.parameters = options.parameters || {};

  this.container = options.container || null;
  this.klass = options.klass || THREE.WebGLRenderer;
  this.type = options.type || 'generic';
  this.camera = options.camera || new THREE.PerspectiveCamera();
  this.autoSize = options.autoSize || false;
  this.dead = options.dead || false;

  this.autoRender = options.autoRender !== undefined ? options.autoRender : true;
  this.isVisible = options.visible !== undefined ? options.visible : true;
  this.lastVisible = -1;

  var effects = options.effects || [];

  this.renderer = null;
  this.scene = null;
  this.depthScene = null;

  this.frames = 0;
  this.fps = 58;
  this.capWidth = 0;
  this.capHeight = 0;
  this.warmUp = 2;
  this.skipFrames = 0;

  this.handlers = {};
  this.exports = {};

  this.effects = effects.filter(function (effect) {
    var r = effect.renderer;
    return r == this.type;
  }.bind(this));

  this.effects.forEach(function (effect) {
    effects.splice(effects.indexOf(effect), 1);
  });
}

Acko.Renderer.prototype = {

  init: function () {

    var renderer = this.renderer = new (this.klass)(this.parameters);
    var scene = this.scene = new THREE.Scene();
    var depthScene = this.depthScene = new THREE.Scene();
    var camera = this.camera;

    var el = this.renderer.domElement;
    el.style.display = 'none';
    if (!this.renderer.domElement.parentNode) {
      (this.container || document.body).appendChild(el);
    }
    el.className = 'frame fixed';
    if (this.dead) el.classList.add('dead');

    window.addEventListener('resize', this.resize.bind(this));

    var exports = this.exports = {
      parent: this,
      scene: scene,
      depthScene: depthScene,
      camera: camera,
      renderer: renderer,
      context: renderer.context,
      scroll: { x: 0, y: 0 },
      time: 0,
      debug: {},
    };

    var effects = this.effects;
    effects.sort(function (a, b) {
      return a.order - b.order;
    });

    var tock = tick();
    _.each(effects, function (effect) {
      effect.build(exports);
    });
    tock(this.type.toUpperCase() +' effect build');

    this.resize();
  },

  scroll: function (scroll) {
    this.exports.scroll = scroll;
  },

  resize: function (e) {
    if (this.autoSize && e) {
      this.capWidth = 0;
      this.capHeight = 0;
    }

    var exports = this.exports;
    var c = this.container;
    var vw, vh;
    var w = vw = this.width = c ? c.offsetWidth : window.innerWidth;
    var h = vh = this.height = c ? c.offsetHeight : window.innerHeight;

    exports.viewWidth = w;
    exports.viewHeight = h;

    this.fps = 58;
    this.frames = 0;

    if (this.capWidth || this.capHeight) {
      var w2 = Math.min(this.capWidth || Infinity, w);
      var h2 = Math.min(this.capHeight || Infinity, h);

      var scale = Math.min(w2 / w, h2 / h);
      w *= scale;
      h *= scale;
    }

    w = Math.round(w);
    h = Math.round(h);

    // Ensure even size for 2x2 upscale
    var renderW = w + (w & 1);
    var renderH = h + (h & 1);
    var renderAspect = this.aspect = renderW / renderH;

    if (exports.width != renderW || exports.height != renderH) {
      exports.width = renderW;
      exports.height = renderH;
      exports.aspect = renderAspect;

      _.each(this.effects, function (effect) {
        effect.resize(exports);
      });

      this.renderer.setSize(renderW, renderH, false);

      var el;
      if (el = this.renderer.domElement) {

        // Fix odd width/height if rendering at native ress.
        var ml = 0, mt = 0;
        if (vw + 1 == renderW) {
          ml = -1;
          vw = renderW;
        }
        if (vh + 1 == renderH) {
          mt = -1;
          vh = renderH;
        }

        el.style.marginLeft = ml + "px";
        el.style.marginTop = mt + "px";
        el.style.width = vw + "px";
        el.style.height = vh + "px";
      }
    }

  },

  tick: function () {
    // Delay clock because first few frames are slow
    var exports = this.exports;
    var now = (this.warmUp-- > 0) ? 0 : Time.clock(this.type);
    var delta = now - exports.time;

    if (!Time.isBackground() && ++this.frames > 5) {
      var fps = 1 / Math.max(.0166, delta);
      this.fps = Time.isSlow() ? 60 : (this.fps + (fps - this.fps) * .15);
    }

    if (exports) {
      exports.delta = delta;
      exports.time = now;
      exports.fps = this.fps;
    }

    _.each(this.effects, function (effect) {
      effect.tick(exports);
    }.bind(this));
  },

  visible: function (visible) {
    if (visible !== undefined) {
      this.isVisible = visible;
    }
    return this.isVisible;
  },

  update: function () {
    var exports = this.exports;

    if (this.skipFrames-- > 0) return;

    if (this.lastVisible != this.isVisible) {
      this.renderer.domElement.style.display = this.isVisible ? 'block' : 'none';
      this.lastVisible = this.isVisible;
    }

    if (!this.visible) return;

    if (this.autoSize && this.fps < 48) {
      this.capWidth = Math.max(960, this.capWidth || window.innerWidth);
      this.capHeight = Math.max(540, this.capHeight || window.innerHeight);

      this.capWidth *= .9;
      this.capHeight *= .9;
      this.resize();
    }

    _.each(this.effects, function (effect) {
      effect.update(exports);
    }.bind(this));

    if (this.autoRender) {
      this.renderer.render(this.scene, this.camera);
    }

  },
}
