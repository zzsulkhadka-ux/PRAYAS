/* =========================================================
   Prayas Studio — 3D scene
   Hero: drifting ember particles + a fractured, glowing shard
   About: a smaller companion shard, rotating quietly
========================================================= */
import * as THREE from "three";

var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------
   Shared: a soft radial sprite used for the ember particles
--------------------------------------------------------- */
function makeEmberTexture() {
  var size = 128;
  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext("2d");
  var gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255,200,150,1)");
  gradient.addColorStop(0.25, "rgba(255,120,60,0.9)");
  gradient.addColorStop(0.6, "rgba(179,18,31,0.35)");
  gradient.addColorStop(1, "rgba(179,18,31,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  var texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/* ---------------------------------------------------------
   Build a low-poly "shard" mesh: a dark faceted core with
   glowing red-bright edges, echoing the blade in the logo.
--------------------------------------------------------- */
function makeShard(scale) {
  var group = new THREE.Group();

  var coreGeo = new THREE.IcosahedronGeometry(scale, 0);
  var coreMat = new THREE.MeshStandardMaterial({
    color: 0x141317,
    metalness: 0.85,
    roughness: 0.28,
    flatShading: true,
  });
  var core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  var edgeGeo = new THREE.EdgesGeometry(coreGeo);
  var edgeMat = new THREE.LineBasicMaterial({
    color: 0xe8283a,
    transparent: true,
    opacity: 0.85,
  });
  var edges = new THREE.LineSegments(edgeGeo, edgeMat);
  group.add(edges);

  return group;
}

/* ===========================================================
   HERO SCENE
=========================================================== */
(function initHero() {
  var canvas = document.getElementById("scene-canvas");
  if (!canvas) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Lighting: cool ambient fill + hot red/ember key lights
  scene.add(new THREE.AmbientLight(0x2a2a30, 1.1));

  var redLight = new THREE.PointLight(0xb3121f, 22, 20, 2);
  redLight.position.set(-3, 1.5, 3);
  scene.add(redLight);

  var emberLight = new THREE.PointLight(0xff6a2b, 14, 18, 2);
  emberLight.position.set(3, -1.5, 2);
  scene.add(emberLight);

  // Central fractured shard
  var shard = makeShard(1.5);
  shard.position.set(1.6, 0, 0);
  scene.add(shard);

  // Ember particle field
  var COUNT = window.innerWidth < 700 ? 260 : 550;
  var positions = new Float32Array(COUNT * 3);
  var speeds = new Float32Array(COUNT);
  var drift = new Float32Array(COUNT);

  for (var i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    speeds[i] = 0.15 + Math.random() * 0.35;
    drift[i] = Math.random() * Math.PI * 2;
  }

  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  var particleMat = new THREE.PointsMaterial({
    size: 0.09,
    map: makeEmberTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Mouse parallax target
  var mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    var dt = clock.getDelta();

    // Rotate + gently bob the shard
    shard.rotation.y += dt * 0.25;
    shard.rotation.x = Math.sin(t * 0.3) * 0.15;
    shard.position.y = Math.sin(t * 0.5) * 0.15;

    // Flicker the light intensities slightly, like embers
    redLight.intensity = 20 + Math.sin(t * 3.1) * 3;
    emberLight.intensity = 12 + Math.cos(t * 2.3) * 3;

    // Rising, drifting embers with wraparound
    var pos = particleGeo.attributes.position.array;
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += speeds[i] * dt;
      pos[i * 3 + 0] += Math.sin(t + drift[i]) * 0.0015;
      if (pos[i * 3 + 1] > 4.6) {
        pos[i * 3 + 1] = -4.6;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Subtle camera parallax toward cursor
    camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.03;
    camera.lookAt(0.4, 0, 0);

    renderer.render(scene, camera);
  }

  if (prefersReduced) {
    // Render a single static-ish frame instead of a continuous loop
    renderer.render(scene, camera);
  } else {
    animate();
  }
})();

/* ===========================================================
   ABOUT SECTION SCENE — a quieter companion shard
=========================================================== */
(function initAbout() {
  var canvas = document.getElementById("about-canvas");
  if (!canvas || prefersReduced) return;

  var wrapper = canvas.parentElement;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0x2a2a30, 1.2));
  var light = new THREE.PointLight(0xb3121f, 20, 16, 2);
  light.position.set(-2, 1, 3);
  scene.add(light);

  var shard = makeShard(1.3);
  scene.add(shard);

  function fitToWrapper() {
    var size = wrapper.clientWidth || 320;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  fitToWrapper();
  window.addEventListener("resize", fitToWrapper);

  // Only animate while the shard is actually visible on screen
  var isVisible = false;
  var io = new IntersectionObserver(
    function (entries) {
      isVisible = entries[0].isIntersecting;
    },
    { threshold: 0.1 }
  );
  io.observe(wrapper);

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!isVisible) return;
    var dt = clock.getDelta();
    shard.rotation.y += dt * 0.3;
    shard.rotation.x += dt * 0.12;
    renderer.render(scene, camera);
  }
  animate();
})();
