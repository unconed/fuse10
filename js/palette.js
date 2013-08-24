Acko.Palette = {
  red: [
    [190, 10, 71],
    [204, 54, 30],
    [222, 90, 51],
    //[245, 100, 51],
    [248, 100, 61],
  ],

  platinum: [
    [148,157,160],
    [222,235,240],
    [255,255,255],
  ],

  blue: [
    [22,92,143],
    [0,176,212],
    //[0,147,198],
  ],

  slate: [
    [73,94,119],
    [86,125,147],
    [77,160,186],
  ],

  orange: [
  ],

};

function toneMap(color) {
  function m(x) {
    x = clamp(x);
    return (x*2.5 + (1.0 - (1.0-x*x)*(1.0-x*x))) / 3.5;
  }

  function clamp(x) {
    return Math.max(0, Math.min(1, x));
  }

  function unnorm(v) {
    return [clamp(v[0]) * 255, clamp(v[1]) * 255, clamp(v[2]) * 255];
  }

  var r = color[0] / 255;
  var g = color[1] / 255;
  var b = color[2] / 255;

  Acko.colorChange = true;

  if (document.location.hash == '#sepia') {
    var a = r*.3+g*.6+b*.1;
    var c = m(a);
    return unnorm([c, c, c]);
  }

  if (document.location.hash == '#faded') {
    return unnorm([m((Math.max(r, b)*3+r)*.25), m((Math.max(g, b)*3+g)*.25), m(b)*1.05]);
  }

  if (document.location.hash == '#nored') {
    return unnorm([m(r), m(Math.max(r, g)), m(Math.max(r, b))]);
  }

  if (document.location.hash == '#noblue') {
    return unnorm([m(Math.max(r, b)), m(Math.max(g, b)), m(b)]);
  }

  if (document.location.hash == '#nogreen') {
    return unnorm([m(Math.max(r, g)), m(g), m(Math.max(b, g))]);
  }

  if (document.location.hash == '#lilac') {
    var c = (g+b) / 2;
    return unnorm([m(Math.max(r, c)), m(Math.max(g, c)), m(Math.max(b, c))]);
  }

  if (document.location.hash == '#70s') {
    return unnorm([m(Math.max(r*r, b))*1.1, m(Math.max(b*b, g))*1.1, m(g)]);
  }

  if (document.location.hash == '#white') {
    return [255, 255, 255];
  }

  if (document.location.hash == '#strong') {
    return unnorm([m(r), m(g), m(b)]);
  }

  if (document.location.hash == '#null') {
    return unnorm([r,g,b]);
  }

  Acko.colorChange = false;

  // Yellow the blues
  var c = b*.9;
  return unnorm([m((Math.max(r, c) + r)/2)*1.05, m((Math.max(g, c) + g)/2)*1.05, m(b)*1.03]);
}

_.each(Acko.Palette, function (palette, key) {
  Acko.Palette[key] = _.map(palette, function (color) {
    if (typeof color == "string") {
      color = color.split('/');
      return Acko.Palette[color[0]][color[1]];
    }
    color = toneMap(color);
    return new THREE.Color((color[0] << 16) + (color[1] << 8) + color[2]);
  });
});
