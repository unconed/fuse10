var classes = document.documentElement.classList;
classes.add('js');
classes.remove('no-js');

DomReady.ready(function () {
  if (Acko.Fallback.isRequired()) {
    Acko.Fallback();
  }
  else {
    Acko.Main();
  }
});

Acko.Main = function () {

  // Do intro or not
  var doIntro = location.pathname == '/';
  doIntro = true; // For Github release

  // Scroll mechanism
  var scroll = new Acko.NativeScroll(0, 20000);
  var camera = Acko.Effect.Camera.camera;
  scroll.init();

  // FPS stats
  var stats  = window.stats = new Stats();
  stats.domElement.style.position  = 'fixed';
  stats.domElement.style.zIndex  = 100;
  stats.domElement.style.display  = 'none';
  document.body.appendChild(stats.domElement);

  // WebGL renderer
  var gl = new Acko.Renderer({
    effects: Acko.Effects,
    klass: THREE.WebGLRenderer,
    camera: camera,
    type: 'webgl',
    parameters: {
      stencil: false,
      alpha: false,
      antialias: true,
    },
    autoSize: true,
    autoRender: false,
    dead: true,
  });
  gl.init();

  // CSS 3D renderer
  var cameraElement = document.getElementById('camera-frame');
  var css3d = new Acko.Renderer({
    effects: Acko.Effects,
    klass: THREE.CSS3DRenderer,
    camera: camera,
    type: 'css3d',
    parameters: {
      cameraElement: cameraElement,
    },
    dead: true,
  });
  css3d.init();

  // Navigation and behavior for native content
  var nav = new Acko.Nav('native-frame', scroll, gl);
  nav.updateExtents();
  window.onload = nav.updateExtents();

  gl.exports.scrollController = css3d.exports.scrollController = scroll;
  gl.exports.doIntro = doIntro;

  // Scroll down if not intro
  if (!doIntro && (scroll.get().y == 0)) {
    scroll.set(0, gl.exports.pageStart - 200);
  }

  // Export into global scope for console and spaghetti
  window.nav = nav;
  window.gl = gl;
  window.css3d = css3d;
  window.scroller = scroll;

  // Apply HTML behaviors
  Acko.Behaviors.apply(document.body);

  // Render loop
  var focus = true;
  var visible = true;
  var last = null;
  var force = false;
  var cssActive = true;
  var idle = false;
  var resetTimer = null;
  var lastOn = false;

  // Delay rendering until mathjax is done
  if (window.MathJax) {
    visible = false;
    MathJax.Hub.Queue(function () {
      visible = true;
    });
  }

  // Core
  var ii = 0;
  function loop() {
    requestAnimationFrame(loop);

    // Skip frames for debug
    /*
    ii = (ii+1)%16;
    if (ii > 0) return;
    */

    // Begin rendering
    idle = false;

    var s = scroll.get();
    var scrolled = !(last && last.x == s.x && last.y == s.y);

    // Don't render if not visible or
    // a) not doing the intro and
    // b) scrolled past the header and
    // c) is not scrolling right now and
    // d) camera is centered
    // e) nothing fancy is happening
    var on = visible
            && (false
             || (Time.clock() < 15)
             || !gl.exports.pastMasthead
             || scrolled
             || Math.abs(gl.exports.cameraController.phiT) > .0001
             || gl.exports.visualizer.playing
             || !gl.exports.cameraController.bound
             );
    last = s;

    // Fix for excessive downscaling: reset at top.
    if (scrolled && s.y == 0) {
      resetTimer = setTimeout(function () {
        gl.resize(true);
      }, 500);
    }
    else if (scrolled && resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    // Maintain clocks if visible
    if (visible) {
      gl.tick();
      css3d.tick();
    }

    // Render conservatively but always do 1 frame more to ensure cleanups happen
    if (on || lastOn || force) {

      // Sync up two renderer's effect states
      if (css3d.exports.masthead) {
        gl.exports.masthead = css3d.exports.masthead;
      }

      // Update GL
      gl.visible(visible);
      gl.scroll(s);
      gl.update();

      if (!gl.exports.ride) {
        // Sync up two renderer's effect states
        css3d.exports.cameraLerp = gl.exports.cameraLerp;
        css3d.exports.cameraController = gl.exports.cameraController;
        css3d.exports.ride = gl.exports.ride;
        css3d.exports.tracks = gl.exports.tracks;

        // Update CSS 3D
        css3d.visible(visible);
        css3d.scroll(s);
        css3d.update();

        cssActive = !gl.exports.pastMasthead;
      }
      else {
        // Render one last frame of css3d to clean things up
        css3d.visible(false);
        cssActive && css3d.update();
        cssActive = false;
      }
    }

    gl.exports.updateStats && stats.update();

    lastOn = on;
    force = false;
    idle = true;
  }

  window.addEventListener('resize', function () {
    force = true;
  });
  window.addEventListener('focus', function () {
    force = true;
    focus = true;
    gl.resize(true);
  }.bind(this));
  window.addEventListener('blur', function () {
    focus = false;
  });

  requestAnimationFrame(loop);

  // Debug
  window.getIdle = function () {
    return idle;
  };

};
