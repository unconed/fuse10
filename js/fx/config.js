// Config panel
Acko.Effect.Config = function () {
  Acko.Effect.call(this);

  this.order = Infinity;
  this.group = null;
  this.opacity = 0;

  this.renderer = 'webgl';

  this.skip = 0;
  this.last = null;
}

Acko.Effect.Config.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {

    var bg = '<div class="bg"></div>';

    var status = '<div class="status"><span class="box"></span><span class="resolution"></span></div>';

    var style = "<div class=\"style\"><label>Style<select><option value=\"normal\">Normal</option><option value=\"ssao\">SSAO</option><option value=\"ega\">EGA</option></select></label></div>";

    var fps = "<div class=\"fps\"><label>Stats<input type=\"checkbox\"></label></div>";

    var icon = '<div class="gear"><span class="icon-gear"><span></span><span></span><span></span><span></span><span></span></span></div>';

    var achievements = '<div class="achievements"></div>';

    var div = this.div = document.createElement('div');
    div.className = 'config collapsed';
    div.style.opacity = 0;
    document.body.appendChild(div);

    div.innerHTML = bg + achievements + status + style + fps + icon;

    this.resolution = div.querySelector('.resolution');
    this.select = div.querySelector('.style select');
    this.fps = div.querySelector('.fps input');
    this.gear = div.querySelector('.gear');
    this.achievements = div.querySelector('.achievements');

    this.gl = exports.parent;
    this.compose = exports.compose;

    var c = getStorage('config');
    this.apply(c, true);

    this.bind();
  },

  apply: function (c, form) {
    var cm = this.compose;
    if (c.style) {
      switch (c.style) {
        case 'normal':
          cm.ssao = false;
          cm.eightbit = false;
          break;
        case 'ssao':
          cm.ssao = true;
          cm.eightbit = false;
          break;
        case 'ega':
          cm.ssao = false;
          cm.eightbit = true;
          break;
        default:
      }
    }

    stats.domElement.style.display = c.fps ? 'block' : 'none';

    if (form) {
      this.select.selectedIndex = {'normal':0,'ssao':1,'ega':2}[c.style];
      this.fps.checked = !!c.fps;
    }

    this.gl.resize(true);
  },

  bind: function () {

    this.select.addEventListener('change', function () {
      var value = this.select.options[this.select.selectedIndex].value;

      var c = getStorage('config');
      c.style = value;
      setStorage('config', c);

      this.apply(c);
      this.select.blur();
    }.bind(this));

    this.fps.addEventListener('change', function () {
      var value = this.fps.checked;

      var c = getStorage('config');
      c.fps = value;
      setStorage('config', c);

      this.apply(c);
      this.fps.blur();
    }.bind(this));

    this.gear.addEventListener('click', function () {
      var cl = this.div.classList;
      var op = cl.contains('collapsed') ? 'remove' : 'add';
      cl[op]('collapsed');
    }.bind(this));
  },

  tick: function (exports) {
    exports.updateStats = this.fps.checked;
  },

  update: function (exports) {
    if (exports.time < 8) {
      var time = .5-.5*Math.cos(Math.max(0, Math.min(1, (exports.time - 6.7) / .9))*π);
      this.div.style.opacity = time;
    }

    if (!(this.skip % 30)) {
      if (this.last != localStorage.achievements) {
        this.last = localStorage.achievements;

        var html = [];

        var a = getStorage('achievements'), k;
        for (k in a) {
          var v = a[k], title;
          if (getAchievement(k) && (title = getAchievement(v))) {
            html.push([k, '<span style="background-image: url(/achievements/' + v + '.png)" title="'+ title + '"></span>']);
          }
        }

        while (html.length < 8) {
          html.push([' ', '<span></span>']);
        }

        html.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
        html = html.map(function (o) { return o[1] }).join('');
        this.achievements.innerHTML = html;
      }
    }
    this.skip++;
  },

  resize: function (exports) {
    var resolution = exports.width + ' × ' + exports.height;
    var aa = exports.compose.msaa ? ('MSAA×' + exports.compose.msaa)
                                  : (exports.compose.fxaa ? 'FXAA' : 'No AA');

    this.resolution.innerHTML = resolution + ' <span>' + aa + '</span>';
  },

});

Acko.Effects.push(new Acko.Effect.Config());