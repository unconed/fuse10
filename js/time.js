// Slowable time and foreground/background detection
var Time = (function () {
  var slow = false;
  var intra = 1;
  var speed = 1;
  var time = 0;
  var last = +new Date();
  var background = true;

  var timeout = 900;
  function checkBackground() {
    background = (+new Date() - last) > timeout;
  }
  setInterval(checkBackground, 1000);

  requestAnimationFrame(function loop() {
    background = false;

    requestAnimationFrame(loop);

    var target = slow ? .1 : 1;
    intra = intra + (target - intra) * .2;
    speed = speed + (intra - speed) * .2;

    var now = +new Date();
    time += (now - last) * speed;
    last = now;
  })

  document.addEventListener('keydown', callback);
  document.addEventListener('keyup', callback);
  function callback(e) {
    slow = e.shiftKey;
  }

  var clocks = {};

  return {
    clock: function (id) {
      id = id || '';
      if (clocks[id] == undefined) {
        clocks[id] = Time.get();
      }
      return (Time.get() - clocks[id]) / 1000;
    },

    getSpeed: function () {
      return speed;
    },

    isBackground: function () {
      return background;
    },

    isSlow: function () {
      return slow;
    },

    get: function () {
      return time;
    },

    absolute: function () {
      return (+new Date()) / 1000;
    },
  };
})();

