/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Screen-space ambient occlusion shader
 * - ported from
 *   SSAO GLSL shader v1.2
 *   assembled by Martins Upitis (martinsh) (http://devlog-martinsh.blogspot.com)
 *   original technique is made by ArKano22 (http://www.gamedev.net/topic/550699-ssao-no-halo-artifacts/)
 * - modifications
 * - modified to use RGBA packed depth texture (use clear color 1,1,1,1 for depth pass)
 * - refactoring and optimizations
 */

Acko.SSAOShader = {

  uniforms: {

    "tDiffuse":     { type: "t", value: null },
    "tDepth":       { type: "t", value: null },
    "size":         { type: "v2", value: new THREE.Vector2(512, 512) },
    "resolution":   { type: "v2", value: new THREE.Vector2(1/512, 1/512) },
    "cameraNear":   { type: "f", value: 1 },
    "cameraFar":    { type: "f", value: 100 },
    "seed":         { type: "f", value: 1 },

  },

  vertexShader: [
    "varying vec2 vUV;",

    "void main() {",

      "vUV = uv;",
      "vec2 xy = uv * 2.0 - 1.0;",

      "gl_Position = vec4(xy, 1.0, 1.0);",
    "}",
  ].join("\n"),

  fragmentShader: [

    "uniform float cameraNear;",
    "uniform float cameraFar;",
    "uniform float seed;",

    "uniform vec2 size;",        // texture width, height

    "uniform sampler2D tDiffuse;",
    "uniform sampler2D tDepth;",

    "varying vec2 vUV;",

    // "#define PI 3.14159265",
    "#define DL 2.399963229728653",  // PI * (3.0 - sqrt(5.0))
    "#define EULER 2.718281828459045",

    // helpers

    "float width = size.x;",   // texture width
    "float height = size.y;",  // texture height

    "float cameraFarPlusNear = cameraFar + cameraNear;",
    "float cameraFarMinusNear = cameraFar - cameraNear;",
    "float cameraCoef = 2.0 * cameraNear;",

    // user variables

    "const int samples = 8;",     // ao sample count
    "const float radius = 4.0;",  // ao radius

    "const bool useNoise = false;",      // use noise instead of pattern for sample dithering
    "const float noiseAmount = 0.0003 * 4.0;", // dithering amount

    "const float diffArea = 0.4;",   // self-shadowing reduction
    "const float gDisplace = 0.4;",  // gauss bell center

    // RGBA depth

    "float unpackDepth(const in vec4 rgba_depth) {",

      "const vec4 bit_shift = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);",
      "float depth = dot(rgba_depth, bit_shift);",
      "return depth;",

    "}",

    // generating noise / pattern texture for dithering

    "vec2 rand(const vec2 coord) {",

      "vec2 noise;",

      "if (useNoise) {",

        "float nx = dot (coord, vec2(12.9898, 78.233));",
        "float ny = dot (coord, vec2(12.9898, 78.233) * 2.0);",

        "noise = clamp(fract (43758.5453 * sin(seed + vec2(nx, ny))), 0.0, 1.0);",

      "} else {",

        "float ff = fract(1.0 - coord.s * (width / 2.0));",
        "float gg = fract(coord.t * (height / 2.0));",

        "noise = vec2(0.25, 0.75) * vec2(ff) + vec2(0.75, 0.25) * gg;",

      "}",

      "return (noise * 2.0 - 1.0) * noiseAmount;",

    "}",

    "float readDepth(const in vec2 coord) {",

      // "return (2.0 * cameraNear) / (cameraFar + cameraNear - unpackDepth(texture2D(tDepth, coord)) * (cameraFar - cameraNear));",
      "return cameraCoef / (cameraFarPlusNear - unpackDepth(texture2D(tDepth, coord)) * cameraFarMinusNear);",


    "}",

    "float compareDepths(const in float depth1, const in float depth2, inout int far) {",

      "float garea = 2.0;",                         // gauss bell width
      "float diff = (depth1 - depth2) * 100.0;",  // depth difference (0-100)

      // reduce left bell width to avoid self-shadowing

      "if (diff < gDisplace) {",

        "garea = diffArea;",

      "} else {",

        "far = 1;",

      "}",

      "float dd = diff - gDisplace;",
      "float gauss = pow(EULER, -2.0 * dd * dd / (garea * garea));",
      "return gauss;",

    "}",

    "float calcAO(float depth, float dw, float dh) {",

      "float dd = radius - depth * radius;",
      "vec2 vv = vec2(dw, dh);",

      "vec2 coord1 = vUV + dd * vv;",
      "vec2 coord2 = vUV - dd * vv;",

      "float temp1 = 0.0;",
      "float temp2 = 0.0;",

      "int far = 0;",
      "temp1 = compareDepths(depth, readDepth(coord1), far);",

      // DEPTH EXTRAPOLATION
      "if (far > 0) {",

        "temp2 = compareDepths(readDepth(coord2), depth, far);",
        "temp1 += (1.0 - temp1) * temp2;",

      "}",

      "return temp1;",

    "}",

    "void main() {",

      "vec2 noise = rand(vUV);",
      "float depth = readDepth(vUV);",

      "float tt = clamp(depth, .3, 1.0);",

      "float w = (1.0 / width)  / tt + (noise.x * (1.0 - noise.x));",
      "float h = (1.0 / height) / tt + (noise.y * (1.0 - noise.y));",

      "float pw;",
      "float ph;",

      "float ao;",

      "float dz = 1.0 / float(samples);",
      "float z = 1.0 - dz / 2.0;",
      "float l = 0.0;",

      "for (int i = 0; i <= samples; i ++) {",

        "float r = ((1.0 - z) + sqrt(1.0 - z)) * .5;",

        "pw = cos(l) * r;",
        "ph = sin(l) * r;",
        "ao += calcAO(depth, pw * w, ph * h);",
        "z = z - dz;",
        "l = l + DL;",

      "}",

      "ao /= float(samples);",
      "ao = 1.0 - ao * .8;",

      "gl_FragColor = vec4(ao, ao, ao, 1.0);",

    "}"

  ].join("\n")

};



/**
 * Bilateral upsample for SSAO
 */

Acko.SSAOUpShader = {

  uniforms: {

    "tDiffuse":     { type: "t", value: null },
    "tDepth":       { type: "t", value: null },
    "tAO":          { type: "t", value: null },
    "size":         { type: "v2", value: new THREE.Vector2(512, 512) },
    "resolution":   { type: "v2", value: new THREE.Vector2(1/512, 1/512) },
    "cameraNear":   { type: "f", value: 1 },
    "cameraFar":    { type: "f", value: 100 },
    "seed":         { type: "f", value: 1 },
    "lumInfluence": { type: "f", value: .9 },

  },

  vertexShader: [
    "varying vec2 vUV;",

    "void main() {",

      "vUV = uv;",
      "vec2 xy = uv * 2.0 - 1.0;",

      "gl_Position = vec4(xy, 1.0, 1.0);",
    "}",
  ].join("\n"),

  fragmentShader: [

    "uniform float cameraNear;",
    "uniform float cameraFar;",
    "uniform float seed;",

    "uniform vec2 resolution;",
    "uniform vec2 size;",

    "uniform sampler2D tDiffuse;",
    "uniform sampler2D tDepth;",
    "uniform sampler2D tAO;",

    "uniform float lumInfluence;",

    "varying vec2 vUV;",

    // helpers

    "float dx = resolution.x;",
    "float dy = resolution.y;",
    "float width = size.x;",
    "float height = size.y;",

    "float cameraFarPlusNear = cameraFar + cameraNear;",
    "float cameraFarMinusNear = cameraFar - cameraNear;",
    "float cameraCoef = 2.0 * cameraNear;",

    // RGBA depth

    "float unpackDepth(const in vec4 rgba_depth) {",

      "const vec4 bit_shift = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);",
      "float depth = dot(rgba_depth, bit_shift);",
      "return depth;",

    "}",

    "float readDepth(const in vec2 coord) {",

      "return cameraCoef / (cameraFarPlusNear - unpackDepth(texture2D(tDepth, coord)) * cameraFarMinusNear);",

    "}",

    "void main() {",

      "vec2 uv = floor((vUV + resolution * .5) * size) * resolution - resolution * .5;",

      "float d = readDepth(vUV);",

      "float aoNW = texture2D(tAO, uv + vec2(0, 0)).r;",
      "float aoNE = texture2D(tAO, uv + vec2(dx, 0)).r;",
      "float aoSW = texture2D(tAO, uv + vec2(0, dy)).r;",
      "float aoSE = texture2D(tAO, uv + vec2(dx, dy)).r;",

      "float dNW = readDepth(uv + vec2(0, 0)) - d;",
      "float dNE = readDepth(uv + vec2(dx, 0)) - d;",
      "float dSW = readDepth(uv + vec2(0, dy)) - d;",
      "float dSE = readDepth(uv + vec2(dx, dy)) - d;",

      "float wNW = max(0.000001, .00001-dNW*dNW);",
      "float wNE = max(0.000001, .00001-dNE*dNE);",
      "float wSW = max(0.000001, .00001-dSW*dSW);",
      "float wSE = max(0.000001, .00001-dSE*dSE);",
      "float wT = 1.0 / (wNW+wNE+wSW+wSE);",

      "float ao = (aoNW*wNW + aoNE*wNE + aoSW*wSW + aoSE*wSE) * wT;",

      "vec4 sample = texture2D(tDiffuse, vUV);",
      "vec3 color = sample.rgb*sample.rgb;",

      "vec3 lumcoeff = vec3(0.299, 0.587, 0.114);",
      "float lum = dot(color.rgb, lumcoeff);",
      "vec3 luminance = vec3(lum);",

      "vec3 final = vec3(color * mix(vec3(ao), vec3(1.0), luminance*lumInfluence));",
      "gl_FragColor = vec4(sqrt(final),  1.0);",

    "}"

  ].join("\n")

};