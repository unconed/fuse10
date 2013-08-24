window.Acko = window.Acko || {};

var π = Math.PI,
    τ = π * 2;

// Seedable random generator
var rand = (function () {
  var seed = 0;
  return function (sd) {
    seed = sd || seed;

    // Robert Jenkins' 32 bit integer hash function.
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;

    return (seed & 0xfffffff) / 0x10000000;
  };
})();

// Sign-preserving power
function pow(x, a) {
  var s = (x < 0) ? -1 : 1;
  return s * Math.pow(Math.abs(x), a);
}

// Debug timer
function tick() {
  var now = +new Date();
  return function (label) {
    var delta = (+new Date() - now);
    console.log(label, delta + " ms");
    return delta;
  };
}

// Log that shuts up after n
var log = (function () {
  var count = 0;
  var limit = 500;
  return function () {
    if (count++ < limit) console.log.apply(console, arguments);
  };
})();

// Local storage proxy
var getStorage = function (key) {
  var o = localStorage[key];
  if (o) try { o = JSON.parse(o) } catch (e) {};
  if (!o || typeof o != 'object' || o.forEach) {
    o = {};
  }
  return o;
};
var setStorage = function (key, value) {
  localStorage[key] = JSON.stringify(value);
};

// Content scripts
Acko.Behaviors = [];
Acko.Behaviors.apply = function (el) {
  el = el || document.body;
  this.forEach(function (f) {
    f(el);
  });
}

// Helpers
var _v = function (x, y, z) { return new THREE.Vector3(x, y, z); };
var forEach = function (list, c) {
  Array.prototype.forEach.call(list, c);
};

