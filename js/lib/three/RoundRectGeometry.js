THREE.RoundRectGeometry = function (width, height, radius, segments, flipY) {

	THREE.Geometry.call(this);

	this.width = width = width || 1;
	this.height = height = height || 1;
	this.radius = radius = radius || .25;
	this.segments = segments = Math.max(1, segments || 5);

	var width_half = width / 2;
	var height_half = height / 2;

	var normal = new THREE.Vector3(0, 0, 1);


  /*
         _______________________
        / !                   ! \
       / \!                   !/ \
      /---+-------------------+---\
      |   !1                 0!   |
  Y   |   !                   !   |
      |   !2                 3!   |
  ^   \---+-------------------+---/
  |    \ /!                   !\ /
  |     \_!___________________!_/

   ----> X

  */

  var signs = [
     1,  1,
    -1,  1,
    -1, -1,
     1, -1,
  ];

  // Output inner rectangular corners
  for (var i = 0; i < 4; ++i) {
    this.vertices.push(new THREE.Vector3((width_half - radius) * signs[i * 2], (height_half - radius) * signs[i * 2 + 1]));
  }

  // Output rounded corners
  var step = Math.PI / 2 / segments;
  for (var i = 0; i < 4; ++i) {
    var center = this.vertices[i];
    var x = center.x;
    var y = center.y;
    var angle = i * Math.PI / 2;
    for (var j = 0; j <= segments; ++j) {
      this.vertices.push(new THREE.Vector3(Math.cos(angle) * radius + x, Math.sin(angle) * radius + y));
      angle += step;
    }
  }

  var vertices = this.vertices;
  var faces = this.faces;
  var faceVertexUvs = this.faceVertexUvs;

  // Helpers for generating faces
  var iw = 1 / width;
  var ih = 1 / height;
  var flip = flipY ? -1 : 1;

  function face3(a, b, c) {
		var face = new THREE.Face3(a, b, c);
		face.normal.copy(normal);
		face.vertexNormals.push(normal.clone(), normal.clone(), normal.clone());

    a = vertices[a];
    b = vertices[b];
    c = vertices[c];

		faces.push(face);
		faceVertexUvs[0].push([
			new THREE.Vector2(a.x * iw + .5, flipY * a.y * ih + .5),
			new THREE.Vector2(b.x * iw + .5, flipY * b.y * ih + .5),
			new THREE.Vector2(c.x * iw + .5, flipY * c.y * ih + .5),
		]);
  }

  function face4(a, b, c, d) {
		var face = new THREE.Face4(a, b, c, d);
		face.normal.copy(normal);
		face.vertexNormals.push(normal.clone(), normal.clone(), normal.clone(), normal.clone());

    a = vertices[a];
    b = vertices[b];
    c = vertices[c];
    d = vertices[d];

		faces.push(face);
		faceVertexUvs[0].push([
			new THREE.Vector2(a.x * iw + .5, a.y * ih + .5),
			new THREE.Vector2(b.x * iw + .5, b.y * ih + .5),
			new THREE.Vector2(c.x * iw + .5, c.y * ih + .5),
			new THREE.Vector2(d.x * iw + .5, d.y * ih + .5),
		]);
  }

  // Middle region
  face4(0, 1, 2, 3);

  // Outer rectangles
  var quarter = segments + 1;
  var mod = quarter * 4;
  for (var i = 0; i < 4; ++i) {
    var o = (i + 1) * quarter;
    face4((i + 1) % 4, i, 4 + ((o - 1) % mod), 4 + (o % mod));
  }

  // Corners
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < segments; ++j) {
      face3(i, 4 + i * quarter + j, 4 + i * quarter + j + 1);
    }
  }

	this.computeCentroids();

};

THREE.RoundRectGeometry.prototype = Object.create(THREE.Geometry.prototype);
