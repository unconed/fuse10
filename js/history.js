(function () {
var classMarker = 'history-back';

Acko.History = function (nav) {
  this.nav = nav;

  this.depth = 0;
  this.x = 0;
  this.lastState = null;

  this.bind();
};

Acko.History.isSupported = function () {
  return window.history && window.history.pushState;
}

Acko.History.prototype = {

  bind: function () {

    this.insert();

    window.addEventListener('popstate', function (e) {
      this.pop(e.state);
    }.bind(this));

    Acko.Behaviors.push(function (el) {
      this.applyBehavior(el);
    }.bind(this));
  },

  pop: function (state) {
    // Ignore pops from other sites
    if (!state || (state.depth == this.depth)) return;

    // Ignore browser scroll pop
    this.nav.scroll.ignore(1);

    var reverse = state.x < this.x;

    this.x = state.x;
    this.depth = state.depth;

    var url = state.url;
    if (state.isError) {
      url = 'http://' + location.host +'/';
    }

    this.nav.navigateTo(url, reverse, state.scroll, false);
  },

  insert: function () {
    var state, title = document.title;
    if (state = history.state) {
      this.depth = state.depth || 0;
      this.x = state.x || 0;
      title = state.title;
    }

    var url = location.href;

    history.replaceState({
      url: url,
      depth: this.depth,
      x: this.x,
      scroll: this.nav && (this.nav.scroll.get().y || 0),
      title: title,

      // Set on 404/403/50x
      isError: Acko.History.isErrorPage,
    }, title, url);

  },

  push: function (url, title, scroll, reverse) {

    this.insert();
    Acko.History.isErrorPage = false;

    this.x += reverse ? -1 : 1;

    var state = {
      url: url,
      depth: ++this.depth,
      reverse: reverse,
      x: this.x,
      scroll: scroll,
      title: title,
      back: history.state && history.state.title || '',
    };

    history.pushState(state, title || "", url);
  },

  applyBehavior: function (el) {
    el = el || this.container;

    if (history.state && history.state.depth > 0) {
      var selector = history.state.reverse ? '.next' : '.prev';

      var links = el.querySelectorAll(selector + ' a:not(.' + classMarker + ')');
      var title = '';
      if (history.state.back) {
        title = history.state.back.replace(' — Acko.net', '');
        if (title == 'Hackery, Math & Design') {
          title = 'Home';
        }
      }

      forEach(links, function (el) {
        el.classList.add(classMarker);

        if (title != '') {
          var caption = el.querySelector('.caption span');
          caption.innerHTML = title;
        }

        el.addEventListener('click', function (e) {
          if (e.ctrlKey || e.metaKey || e.button !== 0) return;

          e.preventDefault();
          history.go(-1);
        }.bind(this));
      }.bind(this));
    }
  },

}

})();
