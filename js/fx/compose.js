Acko.Effect.Compose = function () {
  Acko.Effect.call(this);

  this.order = 100;

  this.ssao = false;
  this.fxaa = 'auto';
  this.msaa = false;
  this.eightbit = false;

  this.white = new THREE.Color(0xffffff);
}

Acko.Effect.Compose.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.compose = this;

    var gl = exports.context;
    this.msaa = gl.getParameter(gl.SAMPLES);

    var scene = exports.scene;
    var camera = exports.camera;
    var renderer = exports.renderer;

    // SSAO
    var ssaoStage = this.ssaoStage = new ThreeRTT.Stage(renderer, {
      history: -1,
      width: 1,
      height: 1,
      texture: {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
      },
    });

    var ssaoShader = Acko.SSAOShader;
    var ssaoMaterial = this.ssaoMaterial =
      new ThreeRTT.ShaderMaterial(
        ssaoStage,
        ssaoShader.vertexShader,
        ssaoShader.fragmentShader,
        [],
        ssaoShader.uniforms
      );
    ssaoMaterial.depthTest = false;
    ssaoMaterial.depthWrite = false;
    ssaoStage.fragment(ssaoMaterial);

    // Compositing pipeline
    var composer = this.composer = new THREE.EffectComposer(renderer);

    // Render scene
    var render = this.render = new THREE.RenderPass(scene, camera);
    render.clearAlpha = 0;
    composer.addPass(render);

    // FXAA un-ao'd image
    var fxaaEffect = this.fxaaEffect = new THREE.ShaderPass(THREE.FXAAShader);
    composer.addPass(fxaaEffect);

    // Render SSAO
    var ssaoEffect = this.ssaoEffect = new THREE.CallbackPass(this.ssaoPass.bind(this));
    composer.addPass(ssaoEffect);

    // Bilateral upscaler
    var ssaoScaler = this.ssaoScaler = new THREE.ShaderPass(Acko.SSAOUpShader);
    composer.addPass(ssaoScaler);

    // 8bit pass
    var eightBitEffect = this.eightBitEffect = new THREE.ShaderPass(Acko.EightBitShader);
    eightBitEffect.renderToScreen = true;
    composer.addPass(eightBitEffect);
  },

  ssaoPass: function (write, read) {
    // Render SSAO
    this.ssaoMaterial.uniforms['tDiffuse'].value = read;
    this.ssaoStage.render();
  },

  depthPass: function (renderer, scene, camera) {
    // Render SSAO depth buffer
    renderer.render(scene, camera, this.depthTarget);
  },

  update: function (exports) {
    var scene = exports.scene;
    var depthScene = exports.depthScene;
    var camera = exports.camera;
    var renderer = exports.renderer;

    // Disable SSAO past masthead, the lack of MSAA makes vector graphics look ugly.
    var ssao = this.ssao && !exports.pastMasthead;

    // Just for fun
    var eightbit = this.eightbit;

    // Auto-enable FXAA if SSAO is active or there is no native MSAA
    var fxaa = (this.fxaa == 'auto') ? (ssao || eightbit || !this.msaa) : this.fxaa;

    // Enable composer passes
    var ssaoEffect = this.ssaoEffect;
    ssaoEffect.enabled = ssao;

    var ssaoScaler = this.ssaoScaler;
    ssaoScaler.enabled = ssao;
    ssaoScaler.renderToScreen = !eightbit;

    var fxaaEffect = this.fxaaEffect;
    fxaaEffect.enabled = fxaa;
    fxaaEffect.renderToScreen = !ssao && !eightbit;

    var eightBitEffect = this.eightBitEffect;
    eightBitEffect.enabled = eightbit;

    // White bg
    renderer.setClearColor(0xffffff, 1);

    // Set SSAO parameters
    if (ssao) {
      // Render depth-pass
      this.depthPass(renderer, depthScene, camera);

      // Set up SSAO uniforms
      var ssaoMaterial = this.ssaoMaterial;
      ssaoMaterial.uniforms['cameraNear'].value = camera.near;
      ssaoMaterial.uniforms['cameraFar'].value = camera.far;
      ssaoMaterial.uniforms['seed'].value = exports.scroll.y;

      ssaoScaler.uniforms['cameraNear'].value = camera.near;
      ssaoScaler.uniforms['cameraFar'].value = camera.far;
    }

    this.render.clearColor = this.white;

    if ((ssao || fxaa || eightbit)) {
      // Render via effect composer
      this.composer.render();
    }
    else {
      // Render directly to screen
      renderer.render(scene, camera);
    }

//    exports.debug.ssaoStage = this.ssaoStage;
//    exports.debug.depthTarget = this.depthTarget;
//    exports.debug.renderTarget1 = this.composer.renderTarget1;
//    exports.debug.renderTarget2 = this.composer.renderTarget2;

    exports.ambientCorrection = this.ssao ? 0 : -.1;
  },

  resize: function (exports) {
    if (this.depthTarget) this.depthTarget.dispose();

    var retina = exports.renderer.devicePixelRatio;

    var width = exports.width;
    var height = exports.height;
    var viewHeight = exports.viewHeight;

    // 8bit: Native
    var eightBitEffect = this.eightBitEffect;
    eightBitEffect.uniforms['resolution'].value.set(1 / width / retina, 1 / height / retina);
    eightBitEffect.uniforms['pixelSize'].value = 12 * height / viewHeight;

    // SSAO depth: Native
    var depthTarget = this.depthTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    // FXAA: Native
    var fxaaEffect = this.fxaaEffect;
    fxaaEffect.uniforms['resolution'].value.set(1 / width / retina, 1 / height / retina);

    // SSAO: Half width/height
    var ssaoStage = this.ssaoStage;
    ssaoStage.size(width / 2 * retina, height / 2 * retina);

    var ssaoMaterial = this.ssaoMaterial;
    ssaoMaterial.uniforms['tDepth'].value = depthTarget;
    ssaoMaterial.uniforms['size'].value.set(width / 2 * retina, height / 2 * retina);
    ssaoMaterial.uniforms['resolution'].value.set(2 / width / retina, 2 / height / retina);

    var ssaoScaler = this.ssaoScaler;
    ssaoScaler.uniforms['tDepth'].value = depthTarget;
    ssaoScaler.uniforms['tAO'].value = ssaoStage.read();
    ssaoScaler.uniforms['size'].value.set(width / 2 * retina, height / 2 * retina);
    ssaoScaler.uniforms['resolution'].value.set(2 / width / retina, 2 / height / retina);

    this.composer.setSize(width, height);
  },

});

Acko.Effects.push(new Acko.Effect.Compose());



