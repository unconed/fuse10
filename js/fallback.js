Acko.Fallback = function () {
  document.documentElement.classList.add('no-js');
  document.documentElement.classList.remove('js');

  // Navigation and behavior for native content
  var scroll = window.scroller = new Acko.NativeScroll(0, 20000);
  scroll.init();

  var nav = window.nav = new Acko.Nav('native-frame',  scroll);
  nav.updateExtents();
  Acko.Behaviors.apply(document.body);
};

Acko.Fallback.isRequired = (function () {

  var oldOpera = navigator.userAgent.match(/Opera/) && !navigator.userAgent.match(/WebKit/);

  var canvas = document.createElement('canvas');
  var supported = !!(canvas && window.WebGLRenderingContext && canvas.getContext('experimental-webgl'));

  return function () {
    return oldOpera || !supported;
  };

})();

Acko.Fallback.warnWebGL = function () {
  if (Acko.Fallback.isRequired()) {
    var close = document.querySelector('#webgl-warning a.close:not(.pinged)');
    if (close) {
      close.classList.add('pinged');
      close.addEventListener('click', function (e) {
        e.preventDefault();
        Acko.Fallback.dismissWebGL();
      });
    }

    var warning = document.querySelector('#webgl-warning');
    warning.style.display = 'block';
    warning.classList.remove('collapsed');
  }
};

Acko.Fallback.dismissWebGL = function () {
  var warning = document.querySelector('#webgl-warning');
  warning.classList.add('collapsed');
};