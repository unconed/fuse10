/**
 * Tracks
 */

Acko.TrackShader = {

  uniforms: {

    tGeometry: { type: "t", value: null },
    sampleStep: { type: 'v2', value: new THREE.Vector2() },
    opacity: { type: 'f', value: 1 },
    blackhole: { type: 'f', value: 1 },
    ambientCorrection: { type: 'f', value: 0 },
    ambientOcclusion: { type: 'f', value: 1 },
    center: { type: 'v3', value: _v(), },
    fogBegin: { type: 'f', value: 2200.0 },
  },

  vertexShader: [
    "uniform sampler2D tGeometry;",
    "uniform vec2 sampleStep;",
    "uniform float blackhole;",
    "uniform float ambientOcclusion;",

    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "varying vec3 vColor;",
    "varying float vAO;",

    "varying vec3 vZenith;",
    "varying vec3 vSun;",

    "attribute vec3 color;",

    "uniform vec3 center;",

    "void main() {",
      "vec2 uv = position.xy;",

      "vec4 posSample = texture2D(tGeometry, uv);",
      "vec4 normalSample = texture2D(tGeometry, uv + vec2(sampleStep.x, 0));",
      "vNormal = normalize(normalMatrix * normalSample.xyz);",

      "vec3 pos = posSample.xyz;",
      "if (blackhole > 0.701) {",
        "float ramp = sin(clamp((blackhole - .701), 0.0, 1.0)*1.57);",
        "vec3 pos2 = pos - center;",
        "pos2.y *= 2.0;",
        "float scale = length(pos2) / 300.0 - blackhole + 1.25;",
        "scale = clamp(scale, 0.0, 1.25);",
        "if (scale > .75) scale = 1.0 - (1.25 - scale)*(1.25 - scale);",
        "pos = pos2 * mix(1.0, scale, ramp);",
        "pos.y *= .5;",
        "pos += center;",
      "}",

      "vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);",
      "gl_Position = projectionMatrix * mvPos;",

      "vAO = mix(1.0, posSample.w, ambientOcclusion);",

      "vView = -mvPos.xyz;",
      "vColor = color;",

      "vSun = (normalMatrix * vec3(.416, .371, .619));",
      "vZenith = (normalMatrix * vec3(0.0, 1, 0.0));",

    "}"

  ].join("\n"),

  depthVertexShader: [
    "uniform sampler2D tGeometry;",
    "uniform float blackhole;",
    "uniform vec3 center;",

    "void main() {",
      "vec2 uv = position.xy;",
      "vec4 posSample = texture2D(tGeometry, uv);",
      "vec3 pos = posSample.xyz;",
      "if (blackhole > 0.701) {",
        "vec3 pos2 = pos - center;",
        "pos2.y *= 2.0;",
        "float scale = length(pos2) / 300.0 - blackhole + 1.25;",
        "scale = clamp(scale, 0.0, 1.25);",
        "if (scale > .75) scale = 1.0 - (1.25 - scale)*(1.25 - scale);",
        "pos = pos2 * scale;",
        "pos.y *= .5;",
        "pos += center;",
      "}",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
    "}"

  ].join("\n"),

  fragmentShader: [
    "uniform float opacity;",
    "uniform float ambientCorrection;",
    "uniform float blackhole;",
    "uniform float fogBegin;",

    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "varying vec3 vColor;",
    "varying float vAO;",

    "varying vec3 vZenith;",
    "varying vec3 vSun;",

    "float leClamp(float x) {",
      "return clamp(x, 0.0, 1.0);",
    "}",

    "float noise() {",
      "return fract(sin(dot(cameraPosition.xz, gl_FragCoord.xy + vec2(3.1380 + blackhole, 7.41)) * 13.414) * 1414.32);",
    "}",

    "void main() {",
      "vec3 diffuse = leClamp(dot(normalize(vNormal), vSun)) * vec3(1.5, 1., .7)"+
                    "+ leClamp(dot(vNormal, vZenith)) * vec3(.1, .4, .5);",
      "diffuse = diffuse * (.5 - ambientCorrection) + (.5 + ambientCorrection);",

      "vec3 halfDir = normalize(normalize(vView) + vSun);",
      "float specular = pow(leClamp(dot(vNormal, halfDir)), 4.0) * (1.0 + ambientCorrection);",
      "vec3 specColor = sqrt(vColor) * .15;",

      "float nlen = length(vNormal);",
      "float outline = clamp(3.0 - nlen * nlen * 3.0, 0.0, 1.0);",
      "float lum = dot(diffuse, vec3(0.299, 0.587, .114));",
      "vec3 ao = mix(vColor*(vAO*vAO+vAO)*.5, vec3(vAO), lum);",
      "vec3 color = (noise() * .04 + .96) * ao * (diffuse * vColor * (1.0 + outline * .35) + specular * specColor);",

      "float distance = length(vView);",
      "float fog = min(1.0, exp(-(distance - fogBegin) * .00022));",

      "gl_FragColor = vec4(sqrt(mix(vec3(1.0,1.0,1.0), color, fog * opacity)), 1.0);",

    "}"

  ].join("\n"),

};

