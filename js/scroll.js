(function () {

Acko.Scroll = function (width, height) {
  this.x = new Acko.Scroll.Coordinate();
  this.y = new Acko.Scroll.Coordinate();

  this.object = { x: this.x.value, y: this.y.value };

  this.extents(width, height);
}

var ASP = Acko.Scroll.prototype = {

  init: function () {
    window.addEventListener('resize', this.resize.bind(this));
    this.resize();
  },

  ignore: function () {
  },

  update: function () {
    this.object = { x: this.x.value, y: this.y.value };
  },

  get: function () {
    return this.object;
  },

  set: function (x, y) {
    this.x.set(x);
    this.y.set(x);
    this.update();
  },

  scroll: function (x, y, duration, delay) {
    if (x == this.x.value && y == this.y.value) return duration;

    var started = Time.clock() + (delay||0);
    var duration = Math.max(duration, Math.min(1.,
                     Math.sqrt(
                       Math.max(Math.abs(this.x.value - x), Math.abs(this.y.value - y)) / 1500)
                     )
                   );

    var xs = this.x.value;
    var ys = this.y.value;

    var loop = function () {

      var now = Time.clock();
      if (now - started <= duration) requestAnimationFrame(loop);

      var lerp = Math.min(1, Math.max(0, (now - started) / duration));
      var ease = .5 - .5 * Math.cos(lerp * π);

      this.set(xs + (x - xs) * ease, ys + (y - ys) * ease);

    }.bind(this);

    loop();

    return duration;
  },

  extents: function (width, height) {
    this.pageWidth = width || 0;
    this.pageHeight = height || 0;

    this.adjust();
  },

  resize: function () {
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;

    this.adjust();
  },

  adjust: function () {
    this.x.fit(0, this.pageWidth, this.viewWidth);
    this.y.fit(0, this.pageHeight, this.viewHeight);
  },

}

Acko.Scroll.Coordinate = function (value, min, max, thumb) {
  this.value = value;
  this.fit(min, max, thumb);
}

Acko.Scroll.Coordinate.prototype = {

  set: function (value) {
    this.value = Math.max(this.min, Math.min(this.max, value || 0));
  },

  fit: function (min, max, thumb) {
    this.min = min || 0;
    this.max = Math.max(this.min, (max || 0) - (thumb || 0));

    this.set(this.value);
  },

}

Acko.NativeScroll = function (width, height) {
  Acko.Scroll.call(this, width, height);

  this.ignoreEvents = 0;
}

Acko.NativeScroll.prototype = _.extend(new Acko.Scroll(), {

  init: function () {
    ASP.init.call(this);

    window.addEventListener('scroll', this.onScroll.bind(this));
    this.onScroll();
  },

  ignore: function (n) {
    this.ignoreEvents += n;
  },

  set: function (x, y) {
    window.scroll(x, y);
  },

  onScroll: function () {
    if (this.ignoreEvents && (this.ignoreEvents-- > 0)) {
      return;
    }

    this.x.set(window.scrollX);
    this.y.set(window.scrollY);
    this.update();
  },

  adjust: function () {
    ASP.adjust.call(this);

    var w = this.pageWidth > this.viewWidth ? this.pageWidth + 'px' : '100%';
    var h = this.pageHeight > this.viewHeight ? this.pageHeight + 'px' : '100%';

    document.body.style.width = w;
    document.body.style.height = h;
  },

});



})();


/*
Intertial touch scroller prototype

DomReady.ready(function () {

  var touchOverride = false;

  var scrollX = 0;
  var scrollY = 0;

  var sizeX = 0;
  var sizeY = 1200;

  var viewX = window.innerWidth;
  var viewY = window.innerHeight;

  var maxX = Math.max(0, sizeX - viewX);
  var maxY = Math.max(0, sizeY - viewY);

  if (!touchOverride) {
    sizeX && (document.body.style.width = sizeX + 'px')
    sizeY && (document.body.style.height = sizeY + 'px');
  }
  else {
    document.body.style.overflow = 'hidden';
    document.querySelector('.frame.fixed').style.position = 'absolute';
  }

  window.addEventListener('scroll', function (e) {
    scrollX = window.scrollX;
    scrollY = window.scrollY;

    update();
  });

  if (touchOverride) {
    var raq = window.requestAnimationFrame
            || window.webkitRequestAnimationFrame
            || (function (c, t) {
              setTimeout(c, t || 0);
            });

    var touching = 0;
    var tracking = false;
    var animating = false;
    var snapX = false,
        snapY = false;
    var start = 0;
    var lastX = 0,
        lastY = 0,
        lastT = 0,
        lastA = 0,
        lastU = 0,
        deltaX = 0,
        deltaY = 0,
        deltaT = 0,
        targetX = 0,
        targetY = 0;

    function touchAnimate(now, step) {
      var t3 = Math.max(0, Math.min(1, (now - start) / 300));
      var qease = 1 - (1 - t3)*(1 - t3)

      if (snapX) {
        scrollX = sourceX + (targetX - sourceX) * qease;
      }
      else {
        var fx = (scrollX < 0 || scrollX > maxX) ? 4 : 1;
        scrollX -= -deltaX / deltaT * step / fx;

        if (scrollX < 0) {
          scrollX *= .9;
        }
        if (scrollX > maxX) {
          scrollX = (scrollX - maxX) *.9 + maxX;
        }

        deltaX *= .9;
      }

      if (snapY) {
        scrollY = sourceY + (targetY - sourceY) * qease;
      }
      else {
        var fy = (scrollY < 0 || scrollY > maxY) ? 4 : 1;
        scrollY -= deltaY / deltaT * step / fy;

        if (scrollY < 0) {
          scrollY *= .9;
        }
        if (scrollY > maxY) {
          scrollY = (scrollY - maxY) *.9 + maxY;
        }

        deltaY *= .9;
      }

      if (qease == 1) animating = false;
    }

    function touchUpdate() {
      (animating || tracking) && raq(touchUpdate, 16);

      var now = +new Date();
      var step = now - lastU;

      animating && touchAnimate(now, step);
      update();

      lastU = now;
    }

    window.addEventListener('touchstart', function (e) {
      var n = e.touches.length;
      if (!touching && n == 1) {
        tracking = true;

        var t = e.touches[0];
        lastX = t.pageX;
        lastY = t.pageY;

        raq(touchUpdate);
      }
      else {
        tracking = false;
      }
      touching = n;
//      if (touching == 1) e.preventDefault();
    });
    window.addEventListener('touchmove', function (e) {
      if (tracking) {
        var now = +new Date();

        var t = e.touches[0];
        var x = t.pageX;
        var y = t.pageY;

        deltaX = x - lastX;
        deltaY = y - lastY;

        deltaT = now - lastT;

        var fx = (scrollX < 0 || scrollX > maxX) ? 4 : 1;
        var fy = (scrollY < 0 || scrollY > maxY) ? 4 : 1;
        scrollX -= deltaX / fx;
        scrollY -= deltaY / fy;

        lastX = x;
        lastY = y;
        lastT = now;

        e.preventDefault();
      }
    });
    window.addEventListener('touchend', function (e) {
      if (tracking) {
        snapX = (scrollX < 0 || scrollX > maxX);
        snapY = (scrollY < 0 || scrollY > maxY);

        sourceX = scrollX;
        sourceY = scrollY;

        targetX = Math.max(0, Math.min(maxX, sourceX));
        targetY = Math.max(0, Math.min(maxY, sourceY));

        var a = Math.abs(deltaX) + Math.abs(deltaY);
        start = +new Date();

        if (snapX || snapY || (a > 2)) {
          animating = true;
        }
      }
      tracking = false;
      touching = e.touches.length;
    });
  }

  var el = document.getElementById('test');
  function update() {
    var style = 'translateY('+ -scrollY +'px)';
//    console.log(style)
    el.style.WebkitTransform = style;
    el.style.transform = style;

    window._scrollY = scrollY;
  }

})
*/