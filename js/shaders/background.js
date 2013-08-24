/**
 * Backgrounds
 */

Acko.SolidShader = {

  uniforms: {
    opacity: { type: 'f', value: 0 },
    ambientCorrection: { type: 'f', value: 0 },
    fogBegin: { type: 'f', value: 2200.0 },
  },

  vertexShader: [
    "varying vec3 vNormal;",
    "varying vec3 vView;",

    "attribute vec3 color;",

    "varying vec3 vColor;",

    "varying vec3 vZenith;",
    "varying vec3 vSun;",

    "void main() {",
      "vNormal = normalMatrix * normal;",

      "vec4 mvPos = modelViewMatrix * vec4(position, 1.0);",
      "gl_Position = projectionMatrix * mvPos;",

      "vView = -mvPos.xyz;",
      "vColor = color;",

      "vSun = (viewMatrix * vec4(.416, .371, .619, 0.0)).xyz;",
      "vZenith = (viewMatrix * vec4(0.0, 1, 0.0, 0.0)).xyz;",
    "}"
  ].join("\n"),

  depthVertexShader: [
    "void main() {",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"

  ].join("\n"),

  fragmentShader: [
    "uniform float opacity;",
    "uniform float ambientCorrection;",
    "uniform float fogBegin;",

    "varying vec3 vNormal;",
    "varying vec3 vView;",
    "varying vec3 vColor;",

    "varying vec3 vZenith;",
    "varying vec3 vSun;",

    "float leClamp(float x) {",
      "return clamp(x, 0.0, 1.0);",
    "}",

    "void main() {",
      "vec3 diffuse = leClamp(dot(normalize(vNormal), vSun)) * vec3(1.5, 1., .6)"+
                    "+ leClamp(dot(vNormal, vZenith)) * vec3(.1, .4, .5);",
      "diffuse = diffuse * (.5 - ambientCorrection) + .5 + ambientCorrection;",

      "vec3 halfDir = normalize(normalize(vView) + vSun);",
      "float specular = pow(leClamp(dot(vNormal, halfDir)), 8.0) * (1.0 + ambientCorrection);",
      "vec3 specColor = sqrt(vColor) * .35;",

      "float nlen = length(vNormal);",
      "float outline = clamp(3.0 - nlen * nlen * 3.0, 0.0, 1.0);",
      "vec3 color = (diffuse * vColor * (1.0 + outline * .35) + specular * specColor);",

      "float distance = length(vView);",
      "float fog = min(1.0, exp(-(distance - fogBegin) * .00022));",
      "gl_FragColor = vec4(sqrt(mix(vec3(1.0,1.0,1.0), color, fog * opacity)), 1.0);",
    "}"

  ].join("\n")

};

