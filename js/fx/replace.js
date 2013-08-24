(function () {
// Replace images with 3D graphics in place

var attrReplace = 'data-replace';

var getOffset = function (el) {
  var top = 0, left = 0, width = el.offsetWidth, height = el.offsetHeight;

  do {
    top += el.offsetTop || 0;
    left += el.offsetLeft || 0;
    el = el.offsetParent;
  } while (el && !el.classList.contains('grid'));

  return { top: top, left: left, width: width, height: height };
};

Acko.Effect.Replace = function () {
  Acko.Effect.call(this);

  this.order = 0;
  this.group = null;

  this.marginTop = 0;
  this.camera = null;
  this.adopted = [];
  this.lastVisible = -1;
}

Acko.Effect.Replace.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.replace = this;

    this.camera = exports.camera;
    this.group = new THREE.Object3D();
    exports.scene.add(this.group);

    Acko.Behaviors.push(function (el) {
      this.applyBehavior(el);
    }.bind(this));
  },

  update: function (exports) {
    var visible = !exports.ride
               && (!exports.visualizer.playing
                 || exports.visualizer.slerpB > .99
                 || exports.visualizer.quietFrames < 0)
               && exports.cameraController.bound;

    function vis(o, v) {
      o.visible = v;
      o.children.forEach(function (o) {
        vis(o, v);
      });
    }

    if (this.lastVisible != visible) {
      this.lastVisible = visible;
      this.adopted.forEach(function (r) {
        vis(r.object, visible);
      })
    }
  },

  resize: function (exports) {
    this.marginLeft = -20; // camera is off by this amount deliberately
    this.marginTop = -exports.cameraScrollYOffset + exports.pageStart - exports.viewHeight / 2;

    this.refresh();
  },

  refresh: function () {
    this.adopted.forEach(function (rp) {
      this.layout(rp);
    }.bind(this));
  },

  layout: function (rp) {
    var o = getOffset(rp.element);
    var scale = Math.max(.001, Math.min(o.width / rp.width, o.height / rp.height));

    var p = rp.object.position;
    var r = rp.object.rotation;
    var s = rp.object.scale;

    p.set.apply(p, rp.position);
    r.set.apply(r, rp.rotation);
    s.set.apply(s, rp.scale);

    p.x += o.left - Math.min(window.innerWidth / 2, 480) + Math.round(o.width / 2) + this.marginLeft;
    p.y -= o.top + Math.round(o.height / 2) + this.marginTop;

    rp.offset = o;

    s.multiplyScalar(scale);
  },

  replace: function (element, replace) {
    replace.element = element;

    element.style.visibility = 'hidden';
    element.onload = function () {
      this.layout(replace);
    }.bind(this);

    this.layout(replace);

    this.adopted.push(replace);
    this.group.add(replace.object);
  },

  reset: function () {
    this.adopted.forEach(function (r) {
      this.group.remove(r.object);
    }.bind(this));
    this.adopted = [];
  },

  applyBehavior: function (el) {
    forEach(el.querySelectorAll('img[' + attrReplace + ']'), function (el) {
//      try {
        var replace = eval(el.getAttribute(attrReplace));
        el.removeAttribute(attrReplace);

        var attr;

        replace.position = (attr = el.getAttribute('data-position')) ? eval(attr) : [0, 0, 0];
        replace.rotation = (attr = el.getAttribute('data-rotation')) ? eval(attr) : [0, 0, 0];
        replace.scale    = (attr = el.getAttribute('data-scale'))    ? eval(attr) : [1, 1, 1];

        this.replace(el, replace);
//      } catch (e) { console.warn('Error replacing object', el, e); };
    }.bind(this));
  },

});

var replace = new Acko.Effect.Replace();
Acko.Effects.push(replace);

})();
