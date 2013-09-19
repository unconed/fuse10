// Mathbox embeds

// Pause when scrolling out of view
(function () {

var margin = 200;

var getOffset = function (el) {
  var top = 0, left = 0, width = el.offsetWidth, height = el.offsetHeight;

  do {
    top += el.offsetTop || 0;
    left += el.offsetLeft || 0;
    el = el.offsetParent;
  } while (el);

  return { top: top, left: left, width: width, height: height };
};

var classMarker = 'mathbox-active';

var mathboxes = [];
var offsets = [];
var on = [];

function scan() {
  mathboxes = document.querySelectorAll('iframe.mathbox');
}

function reflow() {
  forEach(mathboxes, function (mathbox, i) {
    offsets[i] = getOffset(mathbox);
  });
}

function check() {
  var y = window.scrollY;
  forEach(mathboxes, function (mathbox, i) {
    var o = offsets[i];

    var isOn = (y + window.innerHeight > o.top - margin) && (y < o.top + o.height + margin);
    var wasOn = on[i];

    if (window.gl && gl.exports.pageStart)
      isOn = isOn && (window.scrollY > gl.exports.pageStart);

    if (wasOn != isOn) {
      var mbOp = isOn ? 'start' : 'stop';
      var clOp = isOn ? 'add' : 'remove';

      var mb;
      if (mathbox.contentWindow && (mb = mathbox.contentWindow.mathbox)) {
        mathbox.classList[clOp]('on');
        mb[mbOp]();

        on[i] = isOn;
      }

    }
  });
}

// Pass-through global time
var last = 0;

requestAnimationFrame(function loop() {
  requestAnimationFrame(loop);

  var speed = Time.getSpeed();
  if (Math.abs(speed - last) > .01) {
    forEach(mathboxes, function (el) {
      el && el.contentWindow && el.contentWindow.mathbox && el.contentWindow.mathbox.speed(speed);
    });
    last = speed;
  }
});

window.addEventListener('resize', reflow);
window.addEventListener('scroll', check);

Acko.Behaviors.push(function (el) {
  scan();
  reflow();
  check();
});

})();

// Pager
(function () {

  // Arrow controls
  // Controls for stand-alone
  window.addEventListener('keydown', function (e) {
    var on = document.querySelectorAll('iframe.mathbox.on');
    forEach(on, function (el) {
      var director = el.contentWindow.director;
      if (director) {
        var target, nav = el.parentNode.querySelector('.nav');
        if (e.keyCode == 38 || e.keyCode == 37) {
          target = nav.querySelector('.prev');
        }
        else if (e.keyCode == 40 || e.keyCode == 39) {
          target = nav.querySelector('.next');
        }
        target && !target.classList.contains('inactive') && target.click();
      }
    });
  });

})();

// Slideshow
(function () {

Acko.SlideShow = function (container) {
  this.container = container;

  this.skip = 0;
  this.step = 0;
  this.steps = [];
  this.director = null;
  this.nav = {};
  this.reflowTimer = null;

  if (Acko.Fallback.isRequired()) {
    this.unsupported();
  }
  else {
    this.build();
    this.bind();
  }

};

Acko.SlideShow.prototype = {

  unsupported: function () {
    this.iframe = this.container.querySelector('iframe');

    // Add message
    var nav = this.nav = document.createElement('div');
    nav.className = 'nav';
    this.iframe.parentNode.appendChild(nav);

    var message = document.createElement('div');
    message.className = 'step';
    message.style.opacity = 1;
    message.innerHTML = '<p>WebGL is required to view this slideshow.</p>';

    this.container.querySelector('.steps').appendChild(message);
  },

  build: function () {

    if (this)

    // Mark as processed
    this.container.classList.add(classMarker);

    // Fetch iframe and slides
    this.iframe = this.container.querySelector('iframe');
    this.steps = this.container.querySelectorAll('.steps > .step');
    this.extras = this.container.querySelectorAll('.steps .extra');

    // Mark extras with steps
    forEach(this.steps, function (el, i) {
      el.setAttribute('data-step', i);
    });

    // Attach slideshow navigation
    var nav = this.nav = document.createElement('div');
    nav.className = 'nav';
    nav.innerHTML = '<a class="prev" title="Previous Slide"><span class="invisible">Previous Slide</span><span class="icon-arrow"><span></span><span></span></span></a>'+
                    '<a class="again" title="Repeat Animation"><span class="invisible">Repeat Animation</span><span class="icon-repeat"><span></span><span></span><span></span><span></span></span></a>'+
                    '<a class="next" title="Next Slide"><span class="invisible">Next Slide</span><span class="icon-arrow"><span></span><span></span></span></a>'+
                    '<span class="pages"></span></a>';

    this.nav.prev  = nav.querySelector('.prev');
    this.nav.again = nav.querySelector('.again');
    this.nav.next  = nav.querySelector('.next');
    this.nav.pages = nav.querySelector('.pages');

    this.iframe.parentNode.appendChild(nav);

    this.skip = +this.container.getAttribute('data-skip') || 0;

    this.go(0);

    // Make sure we catch init
    this.iframe.onload = function () {
      setTimeout(function () {
        this.go(0);
      }.bind(this), 1000);
      setTimeout(function () {
        this.go(0);
      }.bind(this), 3000);
    }.bind(this);
  },

  layout: function () {
    var x  = this.nav.offsetWidth / 2;
    var y  = this.iframe.offsetHeight / 2;
    var xp = this.iframe.offsetHeight * 16 / 9 / 2;

    forEach(this.extras, function (el) {

      var w = el.offsetWidth / 2,
          h = el.offsetHeight / 2,
          l = x - w,
          t = -y - h;

      var factorX = +el.getAttribute('data-align-x') || 1,
          factorY = +el.getAttribute('data-align-y') || 1;

      var cl = el.classList;

      if (cl.contains('edge')) {
        if (cl.contains('top')) t -= y * factorY - h;
        if (cl.contains('bottom')) t += y * factorY - h;

        if (cl.contains('left')) l -= xp * factorX - w;
        if (cl.contains('right')) l += xp * factorX - w;
      }
      else {
        if (cl.contains('top')) t -= y * factorY / 2;
        if (cl.contains('bottom')) t += y * factorY / 2;

        if (cl.contains('left')) l -= xp * factorX / 2;
        if (cl.contains('right')) l += xp * factorX / 2;
      }

      el.style.left = Math.round(l) + 'px';
      el.style.top = Math.round(t) + 'px';

    }.bind(this));
  },

  resize: function () {
    if (this.reflowTimer) clearTimeout(this.reflowTimer);
    this.reflowTimer = setTimeout(function () {
      this.layout();
      this.reflowTimer = null;
    }.bind(this), 300);
  },

  connect: function () {
    this.director = this.iframe && this.iframe.contentWindow && this.iframe.contentWindow.director;
  },

  bind: function () {
    // Controls
    this.nav.prev.addEventListener('click', this.prevHandler = function (e) {
      e.preventDefault();
      this.prev();
    }.bind(this));

    this.nav.again.addEventListener('click', this.againHandler = function (e) {
      e.preventDefault();
      this.again();
    }.bind(this));

    this.nav.next.addEventListener('click', this.nextHandler = function (e) {
      e.preventDefault();
      this.next();
    }.bind(this));
  },

  unbind: function () {
    // Controls
    this.nav.prev.removeEventListener('click', this.prevHandler);
    this.nav.again.removeEventListener('click', this.againHandler);
    this.nav.next.removeEventListener('click', this.nextHandler);
  },

  prev: function () {
    this.go(-1);
  },

  next: function () {
    this.go(1);
  },

  go: function (direction) {
    // Fade out/in slide divs
    this.connect();

    if (direction) {
      this.steps[this.step].classList.remove('active');
      this.step = Math.max(0, Math.min(this.steps.length - 1 - this.skip, this.step + direction));

      this.lastDirection = direction;
    }

    this.steps[this.step].classList.add('active');
    this.update();

    forEach(this.steps, function (step, i) {
      if (Math.abs(i - this.step) > 2) {
        if (!step.classList.contains('inactive')) {
          step.classList.add('inactive');
        }
      }
      else {
        if (step.classList.contains('inactive')) {
          step.classList.remove('inactive');
        }
      }
    }.bind(this));

    this.director && this.director.go(this.step + this.skip);
  },

  again: function () {
    if (this.director && this.step > 0) {
      this.director.go(this.step - 1 + this.skip, true);

      forEach(this.extras, function (el) {
        el.classList.remove('active');
      }.bind(this));

      setTimeout(function () {
        this.update();
        this.director.go(this.step + this.skip);
      }.bind(this), 300);
    }
  },

  update: function () {
    var op;

    op = (this.step == 0) ? 'add' : 'remove';
    this.nav.prev.classList[op]('inactive');
    this.nav.again.classList[op]('inactive');

    op = (this.step == this.steps.length - 1 - this.skip) ? 'add' : 'remove';
    this.nav.next.classList[op]('inactive');

    var caption = (this.step + 1) +' / '+ (this.steps.length - this.skip);
    this.nav.pages.innerHTML = caption;

    forEach(this.extras, function (el) {
      var step = +el.parentNode.getAttribute('data-step');
      var hold = +el.getAttribute('data-hold') || 0;

      var op = (this.step >= step && this.step <= step + hold) ? 'add' : 'remove';

      var delay = (op == 'add' && this.lastDirection > 0) ? (+el.getAttribute('data-delay') || 0) : 0;
      el.style.transitionDelay = delay + 's';
      el.style.WebkitTransitionDelay = delay + 's';
      el.classList[op]('active');
    }.bind(this));
  },

};

var classMarker = 'slideshow-active';
var slideShows = [];

var resizeHandler = function () {
  slideShows.slice().forEach(function (show, i) {
    show.resize();
  });
};
window.addEventListener('resize', resizeHandler);

Acko.Behaviors.push(function (el) {

  // Cleanup old ones
  var removed = 0;
  slideShows.slice().forEach(function (show, i) {
    var p = show.container;
    while ((p = p.parentNode) && (p != document.body)) {};

    if (!p) {
      show.unbind();
      slideShows.splice(i - removed, 1);
      removed++;
    }
  });

  // Find new ones
  var els = el.querySelectorAll('.slideshow:not(.' + classMarker + ')');
  forEach(els, function (el) {
    var slideshow = new Acko.SlideShow(el);
    slideShows.push(slideshow);
  });

  if (window.MathJax) {
    MathJax.Hub.Queue(function () {
      resizeHandler();
    });
  }
  else {
    resizeHandler();
  }
});

})();
