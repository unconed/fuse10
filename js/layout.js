// Expanded layout >= 1280px
// Plus various dynamic sizings
(function () {
  var wideWidth = 1280;
  var normalWidth = 960;

  var iframeBuffer = 250;
  var iframeMin = 300;
  var iframeMax = 250;

  var classes = document.documentElement.classList;

  var handler = function (e, el) {
    el = el || document;

    // Wide images
    var width = window.innerWidth;

    var fullMargin = Math.max(0, width - normalWidth) / 2;
    var widerMargin = Math.max(0, Math.min(wideWidth, width) - normalWidth) / 2;

    var wide = el.querySelectorAll('.wide');
    var squeezed = width <= wideWidth;

    forEach(wide, function (el) {
      var full = el.classList.contains('full');
      var margin = full ? fullMargin : widerMargin;
      el.style.marginLeft = -Math.ceil(margin + .00001) + 'px';
      el.style.marginRight = -Math.floor(margin + .00001) + 'px';

      el.classList[(full || squeezed) ? 'add' : 'remove']('squeezed');
    });

    // Iframes
    var iframes = el.querySelectorAll('iframe.autosize');
    forEach(iframes, function (el) {

      var w, h, w2, h2;
      var max = +el.getAttribute('data-max-height') || Infinity;
      var min = +el.getAttribute('data-min-height') || 0;

      if (el.classList.contains('square')) {
        w = el.parentNode.offsetWidth;
        h = w;

        w2 = w;
        m2 = 0;
      }
      else {
        w = window.innerWidth;
        h = window.innerHeight - iframeBuffer;

        h = Math.max(h, min);
        h = Math.min(h, max);
        h = Math.min(w / 16 * 9, h);

        w2 = el.parentNode.offsetWidth;
        m2 = (w2 - w) / 2;
      }

      el.style.maxWidth = (w2 - m2 * 2) + 'px';
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.marginLeft = m2 + 'px';
    });
  };

  window.addEventListener('resize', handler);

  handler();
  DomReady.ready(handler);
  Acko.Behaviors.push(function (el) { handler(null, el); });

})();
