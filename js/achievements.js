/* It looks so easy */
var achievements = { nope: 'Nothing here' };

var hasAchievement = function (id) {
  var a = getStorage('achievements');
  return a[id];
}

var getAchievement = function (id) {
  return achievements[id];
}

var achievement = (function () {
  var delay = 1500;

  setTimeout(function () {
    delay = 300;
  }, delay);

  return function (id) {
    var a = getStorage('achievements');
    var achievement;
    if (!a[id] && (achievement = getAchievement(id))) {
      a[id] = id;

      setStorage('achievements', a);
      growl({
        type: 'achievement',
        text: 'Achievement Unlocked<br><strong>'+ achievement + '</strong>',
        center: true,
        delay: delay,
      });
    }
  };
})();
