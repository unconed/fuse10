Acko.EightBitShader = {

  uniforms: {

    "tDiffuse":   { type: "t", value: null },
    "resolution": { type: "v2", value: new THREE.Vector2(1 / 1024, 1 / 512) },
    "pixelSize": { type: "f", value: 16 },

  },

  vertexShader: [

    "void main() {",

      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",

    "}"

  ].join("\n"),

  fragmentShader: [

    "uniform sampler2D tDiffuse;",
    "uniform vec2 resolution;",
    "uniform float pixelSize;",

    "void main() {",

      "vec2 uv1 = gl_FragCoord.xy * resolution - .5;",
      "vec2 uv2 = gl_FragCoord.xy * resolution - .5 + vec2(.01, 0);",
      "vec2 uv3 = gl_FragCoord.xy * resolution - .5 + vec2(0, -.01);",

      "vec2 crt1 = uv1 * (1.0 + dot(uv1, uv1)*.5) * .89;",
      "vec2 crt2 = uv2 * (1.0 + dot(uv2, uv2)*.5) * .89;",
      "vec2 crt3 = uv3 * (1.0 + dot(uv3, uv3)*.5) * .89;",

      "vec2 pixelR = floor((crt1 + vec2(.501, .5)) / resolution / pixelSize);",
      "vec2 pixelG = floor((crt1 + vec2(.5, .5)) / resolution / pixelSize);",
      "vec2 pixelB = floor((crt1 + vec2(.499, .5)) / resolution / pixelSize);",

      "vec4 sampleR = texture2D(tDiffuse,  pixelR * resolution * pixelSize) + mod(pixelR.x + pixelR.y, 2.0) * .006;",
      "vec4 sampleG = texture2D(tDiffuse,  pixelG * resolution * pixelSize) + mod(pixelG.x + pixelG.y, 2.0) * .006;",
      "vec4 sampleB = texture2D(tDiffuse,  pixelB * resolution * pixelSize) + mod(pixelB.x + pixelB.y, 2.0) * .006;",

      "vec3 sample = vec3(sampleR.r, sampleG.g, sampleB.b);",

      "vec3 color = floor(sample * sample * 3.0 + .5) / 3.0;",

      "float bars = sqrt(sqrt(.5-cos((crt1.y + .5) * 6.28318 / resolution.y / pixelSize)*.5))*.25+.75;",

      "float ratio = 20.0 - uv1.y * uv1.y * 10.0;",

      "float tube = length(abs(crt1)*abs(crt1)*abs(crt1)*abs(crt1));",
      "float mask = clamp(6.0 - ratio * tube * 4.0, 0.0, 1.0);",

      "float deltaX = length(abs(crt2)*abs(crt2)*abs(crt2)*abs(crt2)) - tube;",
      "float deltaY = length(abs(crt3)*abs(crt3)*abs(crt3)*abs(crt3)) - tube;",

      "vec3 n = vec3(-deltaX * 100.0, -deltaY * 100.0, 1.0);",

      "float shade = max(-0.5, dot(n, normalize(vec3(10.0, 10.0, 1.0)))) * .5;",
      "shade = shade * abs(shade);",

      "gl_FragColor = vec4(bars * mask * sqrt(shade + color), 1.0);",

    "}"

  ].join("\n")

};
