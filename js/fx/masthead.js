Acko.Effect.Masthead = function () {
  Acko.Effect.call(this);

  this.order = 0;
  this.group = null;

  this.renderer = 'css3d';

  this.showArrow = 1;
  this.showTitle = 1;
  this.arrowOpacity = 1;
  this.titleOpacity = 1;

  this.display = 'none';
  this.hovered = false;
}

Acko.Effect.Masthead.prototype = _.extend(new Acko.Effect(), {

  build: function (exports) {
    exports.masthead = this;

    var scene = exports.scene;

    var arrowElement = document.getElementById('arrow');
    var titleElement = document.getElementById('masthead');

    var titleClone1 = titleElement.cloneNode(true);
    var titleClone2 = titleElement.cloneNode(true);
    titleElement.parentNode.appendChild(titleClone1);
    titleElement.parentNode.appendChild(titleClone2);

    var arrowClone = arrowElement.cloneNode(true);
    arrowElement.parentNode.appendChild(arrowClone);

    titleClone1.className = 'shadow dead';
    titleClone2.className = 'shadow dead';
    arrowClone.className = 'shadow dead';

    var last = Time.clock();
    var count = 0;
    var play = titleElement.querySelector('#play');
    var playShadow1 = titleClone1.querySelector('#play');
    var playShadow2 = titleClone2.querySelector('#play');
    play.addEventListener('click', function (e) {
      e.preventDefault();
      exports.cameraController.runRide();
    });
    play.addEventListener('mouseover', function (e) {
      playShadow1.classList.add('hover');
      playShadow2.classList.add('hover');
      exports.tracks.blackhole = exports.time > 6.5 ? 1 : 0;

      var p = e.relatedTarget;
      var fromChild = false;
      while (p = p.parentNode) {
        if (p == play) {
          fromChild = true;
          break;
        }
      }

      if (e.target == play && !fromChild) {
        var now = Time.clock();
        if ((now - last) < 5) {
          count++;
          if (count == 4) this.hovered = true;
        }
        else {
          count = 0;
        }
        last = now;
      }
    }.bind(this));
    play.addEventListener('mouseout', function (e) {
      playShadow1.classList.remove('hover');
      playShadow2.classList.remove('hover');
      exports.tracks.blackhole = 0;
    });

    var title = this.title = new THREE.CSS3DObject(titleElement);
    var arrow = this.arrow = new THREE.CSS3DObject(arrowElement);

    var titleShadow1 = this.titleShadow1 = new THREE.CSS3DObject(titleClone1);
    var titleShadow2 = this.titleShadow2 = new THREE.CSS3DObject(titleClone2);
    var arrowShadow = this.arrowShadow = new THREE.CSS3DObject(arrowClone);

    scene.add(title);
    scene.add(titleShadow1);
    scene.add(titleShadow2);
    scene.add(arrow);
    scene.add(arrowShadow);

    arrow.position.x = -30;
    arrow.position.y = -120;
    arrow.position.z = 200;
    arrow.scale.set(.7, .672*.6, 1);

    arrow.rotation.z = -τ/4;

    arrowShadow.position.copy(arrow.position);
    arrowShadow.position.z += -3;
    arrowShadow.rotation.copy(arrow.rotation);
    arrowShadow.scale.copy(arrow.scale)

  },

  update: function (exports) {
    var ride = exports.ride ? 0 : 1;
    var time = .5-.5*Math.cos(Math.max(0, Math.min(1, (exports.time - 6.7) / .9))*π);
    var rotated = Math.max(0, Math.min(1, Math.cos(exports.cameraController.phi + .5) * 4 - 2.5));
    var lerp = Math.max(0, 1.0 - exports.cameraLerp*exports.cameraLerp * 4.0);

    this.titleOpacity = this.titleOpacity + (+this.showTitle - this.titleOpacity) * .1;
    this.arrowOpacity = this.arrowOpacity + (+this.showArrow - this.arrowOpacity) * .1;

    var opacity = Math.max(.004, lerp * rotated * time * ride);

    var titleOpacity = this.titleOpacity * opacity;
    var titleShadowOpacity = titleOpacity * titleOpacity;

    var arrowOpacity = this.arrowOpacity * opacity;
    var arrowShadowOpacity = arrowOpacity * arrowOpacity;

    if (titleOpacity != this.lastTitleOpacity) {
      this.title.element.style.opacity = titleOpacity;
      this.titleShadow1.element.style.opacity = titleShadowOpacity;
      this.titleShadow2.element.style.opacity = titleShadowOpacity;
    }
    if (arrowOpacity != this.lastArrowOpacity) {
      this.arrow.element.style.opacity = arrowOpacity;
      this.arrowShadow.element.style.opacity = arrowShadowOpacity;
    }

    this.lastTitleOpacity = titleOpacity;
    this.lastArrowOpacity = arrowOpacity;

    var display = 'block';
    if (this.display != display) {
      this.title.element.style.display = 'block';
      this.arrow.element.style.display = 'block';
      this.titleShadow1.element.style.display = 'block';
      this.titleShadow2.element.style.display = 'block';
      this.arrowShadow.element.style.display = 'block';
    }
    this.display = display;

    this.hovered && achievement && achievement('blkhl');
    this.hovered = false;
  },

  resize: function (exports) {

    var tiny = Math.min(1, exports.viewWidth / 900);

    var title = this.title;
    var arrow = this.arrow;

    var titleShadow1 = this.titleShadow1;
    var titleShadow2 = this.titleShadow2;
    var arrowShadow = this.arrowShadow;

    title.position.x = 0;
    title.position.y = 0;
    title.position.z = 0;

    title.rotation.x = -τ/8;
    title.rotation.y = -τ/4 * .42;
    title.eulerOrder = "YXZ";

    var sc = Math.min(1.3, (1 + 3 / tiny) * .25);
    title.scale.set(sc * .4, sc * .4, sc);

    title.updateMatrixWorld();

    var v = (_v(0, 0, -2.5)).applyMatrix4(title.matrix);

    title.position.x = 200 - (1 - tiny) * 90;
    title.position.y = -100 - (1 - tiny) * 200;
    title.position.z = 325;

    if (exports.tracks) {
      var bhc = exports.tracks.blackholeCenter;
      bhc.copy(title.position);
      bhc.x += 105;
      bhc.y -= 7.5;
    }

    titleShadow1.position.copy(title.position).add(v);
    titleShadow1.rotation.copy(title.rotation);
    titleShadow1.eulerOrder = title.eulerOrder;
    titleShadow1.scale.copy(title.scale);

    titleShadow2.position.copy(title.position).add(v).add(v);
    titleShadow2.rotation.copy(title.rotation);
    titleShadow2.eulerOrder = title.eulerOrder;
    titleShadow2.scale.copy(title.scale);

  },

});

Acko.Effects.push(new Acko.Effect.Masthead());