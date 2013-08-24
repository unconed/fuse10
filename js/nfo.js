var colorize = function () { return navigator.userAgent.match(/Chrome/); }

var bar = function () {
  var greebles = "◤◢◣◥", out = "";
  var j = 0;
  for (var i = 0; i < 80; ++i) {
    j = Math.floor(j + Math.random() * 3.2 + 1) % 4;
    out += greebles[j];
  }

  if (colorize()) {
    console.log("%c" + out, "background: -webkit-linear-gradient(rgb(81,162,189), rgb(68,105,133)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 1px 1px 0px rgba(0,0,0, .2);");
  }
  else {
    console.log(out);
  }
}

var flair = function () {
  var lines = [
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▇█▍▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▃▇███▆▁▁▁▃▇████▍▁▁██▍▁▁▃▇█████████▇▃▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂██▁▁▁██▍▁██▍▁▁▁▁▁▁▁██▍▄██▁▁▁▅▃▁▁▁▁▁██▍▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▄██▁▁▁▁██▍▁██▂▁▁▁▁▁▁▂██▁▁██▍▁▁██▂▁▁▁▂██▍▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂▄▆██▁▁▁▁▁▁██▍▁▁██████████▁▁▁▁██▍▁▁███████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁",
    "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁██▍▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁unconed▁▁▁▁▁▁▁",
  ];
  var blank = "                                                                                ";

  bar();

  if (colorize()) {
    lines.forEach(function (line) {
      var args = [];
      line = line.replace(/▁+/g, function (v) {
        args.push('color: white;');
        args.push('color: rgb(68,105,133); background: -webkit-linear-gradient(rgb(99,199,231), rgb(68,105,133)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 3px 3px 0px rgba(0,0,0, .2), 0px 0px 20px rgba(128,190,220, 1.0);');
        return "%c" + "▕" + v.substring(1) + "%c";
      })
      args.unshift(line);
      console.log.apply(console, args);
    });
  }
  else {
    lines.forEach(function (line, i) {
      console.log(line);
    });
  }

  bar();

  var greets = [
    "",
    "         Greetz to mrdoob, iq, alteredqualia, p01, pyalot, flexi23,",
    "                   aerotwist, kuvos, romancortes, jerome_etienne",
    "                   and a basket of puppies for pouet.",
    "",
  ];

  greets.forEach(function (line, i) {
    line += blank.substring(line.length);
    if (colorize()) {
      if (i < 3) {
        console.log('%c' + line.substring(0, 19) + "%c" + line.substring(19), "color: rgb(83,128,162)", "color: rgb(81,163,189); font-weight: bold;");
      }
      else {
        console.log('%c' + line, "color: rgb(83,128,162)");
      }
    }
    else
      console.log(line);
  });

  bar();

  console.log("THREE.js " + THREE.REVISION);

  setTimeout(function () {
    bar();
    if (colorize()) {
      var code = "background-color: #eee; padding: 2px";
      var plain = "";
      console.log("\nWelcome. Poke around %cgl.effects%c and %ccss3d.effects%c to see how things work. Maybe try to %cachieve%c something?", code, plain, code, plain, code, plain);
    }
    else {
      console.log("\nWelcome. Poke around `gl.effects` and `css3d.effects` to see how things work. Maybe try to `achieve` something?");
    }
  }, 1000);
}

flair();
