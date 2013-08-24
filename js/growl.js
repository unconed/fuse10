var growl = (function () {
  var slots = {
    center: [],
    topright: [],
  };
  var last = 0;

  return function self(opts) {
    if (!document.body) {
      return setTimeout(function () {
        self(opts);
      }, 1000);
    }

    var type = opts.type || "generic";
    var text = opts.text || "";
    var delay = opts.delay || 0;
    var center = !!opts.center;
    var image = opts.image;
    var link = opts.link || false;

    var _slots = center ? slots.center : slots.topright;

    var n = _slots.length;

    for (var i = 0; i < n; ++i) {
      if (!_slots[i]) break;
    }

    _slots[i] = true;
    var shift = i * 98;
    var width = 296;
    var timer;

    var div = document.createElement('div');
    document.body.appendChild(div);

    div.classList.add('growl');
    div.classList.add(type);
    if (opts.image) { div.style.backgroundImage = 'url('+ opts.image +')' }
    if (link) div.classList.add('link');

    if (center) {
      div.classList.add('center');
      div.style.marginBottom = shift + "px";
    }
    else {
      div.style.marginTop = shift + "px";
    }

    div.innerHTML = '<div>' + text + '</div>';

    setTimeout(function () {
      div.classList.add('pop');
    }, delay);

    var expired = false;
    var hold = false;
    div.addEventListener('mouseover', function () {
      hold = true;
    });
    div.addEventListener('mouseout', function () {
      hold = false;
      if (expired) timer = setTimeout(cancel, 500);
    });
    div.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      e.preventDefault();
    });
    div.addEventListener('mouseup', function (e) {
      if (link) {
        window.open(link);
      }
      e.stopPropagation();
      e.preventDefault();
    });

    var cancelled = false;
    function cancel() {
      if (hold) {
        expired = true;
        return;
      }
      if (cancelled) return;
      cancelled = true;

      div.classList.remove('pop');
      _slots[i] = false;
      setTimeout(function () {
        document.body.removeChild(div);
      }, 1000);
    }

    timer = setTimeout(cancel, 6000 + delay);
    return cancel;
  };
})();
