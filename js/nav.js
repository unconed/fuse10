// Delayed execution for in-post scripts
Acko.Queue = [];

Acko.queue = function (c) {
  Acko.Queue.push(c);
};

Acko.Behaviors.push(function () {
  Acko.Queue.forEach(function (c) {
    c();
  });
  Acko.Queue = [];
});

(function () {
  // Navigation transitions

  var beginMarker = '<!-- Begin Content -->';
  var endMarker = '<!-- End Content -->';
  var classMarker = 'nav-link';

  // ms per pixel
  var pageTransition = .4;


  // HTML processors

  var findAll = function (re, text) {
    var result;
    var out = [];
    while ((result = re.exec(text)) !== null) {
      out.push(result);
    }
    return out;
  };

  var extractContent = function (html) {
    var chunks = html.split(beginMarker);
    if (chunks[1]) {
      chunks = chunks[1].split(endMarker);
      if (chunks) {
        return chunks[0];
      }
    }
    return '';
  };

  var extractTitle = function (html) {
    var titles = findAll(/<title[^>]*>((.|\n)*?)<\/title>/gi, html);
    return titles && decodeEntities(titles[0][1]) || '';
  };

  var extractVideos = function (html) {
    var videos = findAll(/<video[^>]*>((.|\n)*?)<\/video>/gi, html);
    var out = [];
    videos.forEach(function (video) {
      out.push({ source: video[0] });
    });
    return out;
  };

  var extractImages = function (html) {
    var images = findAll(/<img[^>]*>/gi, html);
    var out = [];
    images.forEach(function (image) {
      out.push({ source: image[0] });
    });
    return out;
  };

  var extractIframes = function (html) {
    var iframes = findAll(/<iframe[^>]*>((.|\n)*?)<\/iframe>/gi, html);
    var out = [];
    iframes.forEach(function (iframe) {
      out.push({ source: iframe[0] });
    });
    return out;
  };

  var extractScripts = function (html) {
    var scripts = findAll(/<script([^>]*)>((.|\n)*?)<\/script>/gi, html);
    var out = [];
    scripts.forEach(function (script) {
      var attributes = script[1];
      var local = script[2];
      var src = attributes.match(/\s*src=("([^"]*)"|'([^']*)'|([^>]*))/i);
      var type = attributes.match(/\s*type=("([^"]*)"|'([^']*)'|([^>]*))/i);

      if (type) {
        type = (type[2]||"") + (type[3]||"") + (type[4]||"");
        if (type != 'text/javascript') {
          return;
        }
      }

      if (src) {
        var url = decodeEntities((src[2]||"") + (src[3]||"") + (src[4]||""));
        if (url) {
          out.push({ source: script[0], url: url });
        }
      }
      else if (local) {
        out.push({ source: script[0], local: local });
      }
    });
    return out;
  };

  var decodeEntities = function (string) {
    var div = document.createElement('div');
    div.innerHTML = string;
    return div.textContent || div.innerText || string || '';
  };

  var shift = function (el, x) {
    var tr = 'translateX(' + x + 'px) translateZ(0px)';

    el.style.transform = tr;
    el.style.WebkitTransform = tr;
  };

  // Main nav controller

  Acko.Nav = function (selector, scroll, gl) {
    this.container = document.getElementById(selector);
    this.scroll = scroll;
    this.gl = gl;

    this.animating = false;
    this.warm = {};
    this.warm[location.href] = true;

    this.cache = {};

    if (Acko.History.isSupported()) {
      this.history = new Acko.History(this);
    }

    this.bind();
  };

  Acko.Nav.prototype = {

    bind: function () {
      var resize = function () {
        this.width = window.innerWidth;

        this.updateExtents();
      }.bind(this);

      this.width = window.innerWidth;
      window.addEventListener('resize', resize);

      Acko.Behaviors.push(function (el) {
        this.applyBehavior(el);
      }.bind(this));
    },

    updateExtents: function () {
      var h = 0;
      forEach(this.container.children, function (el) {
        h = Math.max(h, el.offsetHeight);
      });

      // Hero margin
      var computed = window.getComputedStyle(this.container);
      h += this.container.offsetTop + (parseInt(computed.paddingTop)||0);

      this.scroll.extents(0, h);
    },

    applyBehavior: function (el) {
      el = el || this.container;

      if (window.MathJax) {
        MathJax.Hub.Queue(function () {
          this.updateExtents();
        }.bind(this));
      }

      var links = el.querySelectorAll('a:not(.' + classMarker +')');

      forEach(links, function (el) {
        el.classList.add(classMarker);

        var href = ''+(el.getAttribute('href')||'');
        var local = href.match(/^\/(?!\/)/);

        if (local) {
          el.addEventListener('click', function (e) {
            if (el.classList.contains('history-back')) return;
            if (e.ctrlKey || e.metaKey || e.button !== 0) return;
            e.preventDefault();

            var reverse = el.classList.contains('reverse');
            var computed = window.getComputedStyle(this.container);
            var scrollOffset = Math.round(this.container.offsetTop + (parseInt(computed.paddingTop)||0) - 200);

            this.navigateTo(el.href, reverse, scrollOffset, true);

          }.bind(this));
        }
      }.bind(this));

    },

    navigateTo: function (url, reverse, scroll, push, callback) {

      (this.gl && this.gl.exports) && (this.gl.exports.cameraController.scnt = 0);

      if (push && (url == location.href)) {
        return scroller.scroll(0, scroll, 0, .1);
      }

      var insert = function (content, title, scripts) {

        push && this.history && this.history.push(url, title, scroll, reverse);

        var duration = pageTransition * this.width / 1000;
        var delay = .1;

        if (typeof scroll == 'number') {
          duration = this.scroll.scroll(0, scroll, duration, delay);
        }

        this.transitionContent(
          content, 
          duration,
          delay,
          reverse,
          !this.warm[url],
          function () {

            this.runScripts(scripts, function () {
              this.restoreSources();
              Acko.Behaviors.apply(this.container);

              callback && callback();
            }.bind(this));

          }.bind(this));

        this.warm[url] = true;

        if (!cache) {
          this.cache[url] = {
            content: content,
            title:   title,
            scripts: scripts,
          };
        }
      }.bind(this);

      var cache;
      if (cache = this.cache[url]) {
        insert(cache.content, cache.title, cache.scripts);
      }
      else microAjax(url, function (content) {
        this.processHTML(content, function (content, title, scripts) {
          insert(content, title, scripts);
        }.bind(this));
      }.bind(this));
    },

    processHTML: function (html, callback) {
      var content = extractContent(html);
      var title   = extractTitle(html);
      var scripts = extractScripts(content);
      var iframes = extractIframes(content);
      var images  = extractImages(content);
      var videos  = extractVideos(content);

      scripts.forEach(function (script) {
        content = content.replace(script.source, '');
      })

      iframes.forEach(function (iframe) {
        var replace = iframe.source.replace('src=', 'src="about:blank" data-src=');
        content = content.replace(iframe.source, replace);
      });

      images.forEach(function (image) {
        var replace = image.source.replace('src=', 'data-src=');
        content = content.replace(image.source, replace);
      });

      videos.forEach(function (video) {
        var replace = video.source;
        replace = replace.replace(/src=/g, 'data-src=');
        replace = replace.replace(/type=/g, 'data-type=');
        content = content.replace(video.source, replace);
      });

      callback && callback(content, title, scripts);
    },

    transitionContent: function (content, duration, delay, reverse, cold, callback) {

      var flip = reverse ? -1 : 1;
      var width = this.width;
      var container = this.container;

      var dummy = document.createElement('div');
      dummy.innerHTML = content;

      var next = dummy.children[0];
      var prev = container.children[container.children.length - 1];

      shift(next, width * flip);
      cold && next.classList.add('cold');

      var media = next.querySelectorAll('img, iframe, video');
      forEach(media, function (el) {
        el.classList.add('hide');
      });

      prev.style.pointerEvents = 'none';
      next.style.pointerEvents = 'none';

      container.appendChild(next);

      var loop = function () {
        var lerp = Math.max(0, Math.min(1, (Time.clock() - started) / duration));
        var ease = .5 - .5 * Math.cos(lerp * π);
        shift(next, width * flip * (1 - ease));
        shift(prev, -width * flip * ease);

        if (lerp < 1) {
          requestAnimationFrame(loop);
        }
        else {
          setTimeout(function () {
            container.removeChild(prev);
            cold && next.classList.remove('cold');

            prev.style.pointerEvents = 'auto';
            next.style.pointerEvents = 'auto';

            callback && callback();
          }, 33);
        }
      };

      // Prevent renderer from autosizing during transition
      this.gl && (this.gl.frames = -100);

      // Remove 3d replacement objects from existing content
      this.gl && this.gl.exports.replace.reset();

      // Animate
      var started = Time.clock() + (delay||0);
      this.animating = true;
      loop();
    },

    restoreSources: function () {
      var elements = document.querySelectorAll('iframe, img, video');
      forEach(elements, function (el) {
        var src;

        function begin() {
          el.classList.add('begin');
        }

        if (src = el.getAttribute('data-src')) {
          el.removeAttribute('data-src');
          el.addEventListener('load', function () {
            setTimeout(begin, 17);

            this.updateExtents();
          }.bind(this));
          el.src = src;
        }
        else if (el.children.length) {
          forEach(el.children, function (child) {
            if (child.tagName == 'SOURCE') {
              var src = child.getAttribute('data-src');
              var type = child.getAttribute('data-type')
              if (el.canPlayType(type)) {
                el.src = src;
              }
            }
          }.bind(this));

          el.addEventListener('progress', function (e) {
            if (el.buffered.length > 0) {
              setTimeout(begin, 17);
              this.updateExtents();
            }
          }.bind(this));
        }

        el.classList.add('transition');
        el.classList.remove('hide');
      }.bind(this));
    },

    runScripts: function (scripts, callback) {
      var toLoad = [];

      function insert(url) {
        var s = document.createElement('script');
        s.onload = unqueue;
        s.src = url;

        document.body.appendChild(s);
      }

      function unqueue() {
        if (toLoad.length == 0) {
          callback && setTimeout(function () {
            callback();
          }, 0);
        }
        else {
          insert(toLoad.shift());
        }
      }

      scripts.forEach(function (script) {
        if (script.url) {
          toLoad.push(script.url);
        }
        if (script.local) {
          try {
            eval(script.local);
          } catch (e) {
            console.error('[Nav]', e);
          }
        }
      });

      if (toLoad.length == 0) callback && callback();
      else unqueue();
    },

  };

})();
