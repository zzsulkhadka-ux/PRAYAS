/* =========================================================
   Prayas Studio — 3D scene
   Hero: a shattered core — a cluster of glowing crystal
   fragments in slow independent orbit, wrapped in bloom,
   with a layered ember particle field and a scroll-driven
   camera dolly. About: a smaller companion shard.
========================================================= */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

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
   A glowing "energy shell" wrapped around a shard — a
   back-face rim-light shell that reads beautifully once
   bloom is stacked on top of it.
--------------------------------------------------------- */
function makeGlowShell(scale, colorHex) {
  var geo = new THREE.IcosahedronGeometry(scale * 1.22, 1);
  var mat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(colorHex) } },
    vertexShader: [
      "varying vec3 vNormal;",
      "void main() {",
      "  vNormal = normalize(normalMatrix * normal);",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}",
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vNormal;",
      "uniform vec3 glowColor;",
      "void main() {",
      "  float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);",
      "  gl_FragColor = vec4(glowColor, 1.0) * clamp(intensity, 0.0, 1.0);",
      "}",
    ].join("\n"),
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

/* ---------------------------------------------------------
   Build a single faceted shard fragment: dark metal core +
   glowing red edge lines + additive glow shell.
--------------------------------------------------------- */
function makeShard(scale) {
  var group = new THREE.Group();

  var coreGeo = new THREE.IcosahedronGeometry(scale, 0);
  var coreMat = new THREE.MeshStandardMaterial({
    color: 0x141317,
    metalness: 0.88,
    roughness: 0.25,
    flatShading: true,
  });
  var core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  var edgeGeo = new THREE.EdgesGeometry(coreGeo);
  var edgeMat = new THREE.LineBasicMaterial({
    color: 0xff3b45,
    transparent: true,
    opacity: 0.9,
  });
  var edges = new THREE.LineSegments(edgeGeo, edgeMat);
  group.add(edges);

  group.add(makeGlowShell(scale, 0xb3121f));

  return group;
}

/* ---------------------------------------------------------
   A cluster of shard fragments, each drifting on its own
   tilted orbital plane around a shared centre — replaces
   the old single static shard with a "shattered core" that
   never repeats a pose.
--------------------------------------------------------- */
function makeFragmentCluster(count) {
  var cluster = new THREE.Group();
  var fragments = [];

  for (var i = 0; i < count; i++) {
    var scale = 0.32 + Math.random() * 0.62;
    var shard = makeShard(scale);

    // Random tilted orbit plane: pick an axis, derive two
    // perpendicular basis vectors to sweep the fragment around.
    var axis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    var arbitrary = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    var u = new THREE.Vector3().crossVectors(axis, arbitrary).normalize();
    var v = new THREE.Vector3().crossVectors(axis, u).normalize();

    var data = {
      mesh: shard,
      u: u,
      v: v,
      axis: axis,
      radius: 1.1 + Math.random() * 2.1,
      angle: Math.random() * Math.PI * 2,
      orbitSpeed: (0.06 + Math.random() * 0.1) * (Math.random() < 0.5 ? -1 : 1),
      bobAmp: 0.15 + Math.random() * 0.2,
      bobSpeed: 0.3 + Math.random() * 0.4,
      bobPhase: Math.random() * Math.PI * 2,
      spinX: (Math.random() - 0.5) * 0.6,
      spinY: (Math.random() - 0.5) * 0.6,
    };

    fragments.push(data);
    cluster.add(shard);
  }

  return { group: cluster, fragments: fragments };
}

function updateFragments(fragments, t, dt) {
  for (var i = 0; i < fragments.length; i++) {
    var f = fragments[i];
    f.angle += f.orbitSpeed * dt;
    var planar = new THREE.Vector3()
      .addScaledVector(f.u, Math.cos(f.angle) * f.radius)
      .addScaledVector(f.v, Math.sin(f.angle) * f.radius);
    var bob = Math.sin(t * f.bobSpeed + f.bobPhase) * f.bobAmp;
    f.mesh.position.copy(planar).addScaledVector(f.axis, bob);
    f.mesh.rotation.x += f.spinX * dt;
    f.mesh.rotation.y += f.spinY * dt;
  }
}

/* ===========================================================
   HERO SCENE
=========================================================== */
(function initHero() {
  var canvas = document.getElementById("scene-canvas");
  if (!canvas) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Lighting: cool ambient fill + hot red/ember key lights
  scene.add(new THREE.AmbientLight(0x2a2a30, 1.0));

  var redLight = new THREE.PointLight(0xb3121f, 24, 22, 2);
  redLight.position.set(-3, 1.5, 3);
  scene.add(redLight);

  var emberLight = new THREE.PointLight(0xff6a2b, 15, 20, 2);
  emberLight.position.set(3, -1.5, 2);
  scene.add(emberLight);

  var rimLight = new THREE.PointLight(0xffffff, 6, 14, 2);
  rimLight.position.set(0, 2.5, -3);
  scene.add(rimLight);

  // Shattered core: a cluster of orbiting glowing fragments
  var clusterHome = new THREE.Vector3(1.7, 0, 0);
  var built = makeFragmentCluster(window.innerWidth < 700 ? 6 : 9);
  var cluster = built.group;
  cluster.position.copy(clusterHome);
  scene.add(cluster);

  // Ember particle field — two depth layers for parallax
  function makeParticleLayer(count, spread, size, speedMin, speedMax) {
    var positions = new Float32Array(count * 3);
    var speeds = new Float32Array(count);
    var drift = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * spread.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
      speeds[i] = speedMin + Math.random() * (speedMax - speedMin);
      drift[i] = Math.random() * Math.PI * 2;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
      size: size,
      map: makeEmberTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity: 0.9,
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);
    return { points: points, geo: geo, speeds: speeds, drift: drift, count: count, limit: spread.y / 2 };
  }

  var narrow = window.innerWidth < 700;
  var nearLayer = makeParticleLayer(
    narrow ? 180 : 380,
    { x: 15, y: 10, z: 6 },
    0.1,
    0.18,
    0.5
  );
  var farLayer = makeParticleLayer(
    narrow ? 120 : 260,
    { x: 20, y: 12, z: 14 },
    0.05,
    0.06,
    0.16
  );

  // Post-processing: bloom makes the glow shells + edges pop
  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85, // strength
    0.55, // radius
    0.15  // threshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // Mouse parallax target
  var mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  var heroEl = document.querySelector(".hero");
  function scrollFraction() {
    // 0 at top of the page, 1 once scrolled a full viewport height —
    // drives the camera dolly-in as the hero scrolls out of view.
    var heroHeight = heroEl ? heroEl.offsetHeight : window.innerHeight;
    return Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  }

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    var dt = Math.min(clock.getDelta(), 0.05);
    var scrollT = scrollFraction();

    // Orbit + spin every fragment on its own tilted plane
    updateFragments(built.fragments, t, dt);

    // Slow overall cluster tumble, plus a scroll-driven spin-up
    cluster.rotation.y += dt * (0.12 + scrollT * 0.35);
    cluster.rotation.x = Math.sin(t * 0.2) * 0.1;
    cluster.position.y = Math.sin(t * 0.4) * 0.12;
    cluster.position.x = THREE.MathUtils.lerp(clusterHome.x, 0.5, scrollT);
    cluster.position.z = THREE.MathUtils.lerp(0, -1.6, scrollT);

    // Flicker the light intensities slightly, like embers
    redLight.intensity = 22 + Math.sin(t * 3.1) * 4;
    emberLight.intensity = 13 + Math.cos(t * 2.3) * 4;
    bloomPass.strength = 0.85 + scrollT * 0.35 + Math.sin(t * 4.0) * 0.03;

    // Rising, drifting embers with wraparound, two depth layers
    [nearLayer, farLayer].forEach(function (layer) {
      var pos = layer.geo.attributes.position.array;
      for (var i = 0; i < layer.count; i++) {
        pos[i * 3 + 1] += layer.speeds[i] * dt;
        pos[i * 3 + 0] += Math.sin(t + layer.drift[i]) * 0.0016;
        if (pos[i * 3 + 1] > layer.limit) pos[i * 3 + 1] = -layer.limit;
      }
      layer.geo.attributes.position.needsUpdate = true;
    });
    farLayer.points.rotation.y += dt * 0.01;

    // Cinematic dolly: camera pulls in and lowers slightly as you scroll
    var targetZ = THREE.MathUtils.lerp(7.5, 4.6, scrollT);
    var targetY = THREE.MathUtils.lerp(0, -0.4, scrollT) - mouse.y * 0.4;
    var targetX = mouse.x * 0.6;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.z += (targetZ - camera.position.z) * 0.04;
    camera.lookAt(cluster.position.x - 0.3, 0, cluster.position.z);

    composer.render();
  }

  if (prefersReduced) {
    updateFragments(built.fragments, 0, 0);
    composer.render();
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene.add(new THREE.AmbientLight(0x2a2a30, 1.1));
  var light = new THREE.PointLight(0xb3121f, 22, 18, 2);
  light.position.set(-2, 1, 3);
  scene.add(light);
  var rim = new THREE.PointLight(0xffffff, 5, 12, 2);
  rim.position.set(1, 1.5, -2);
  scene.add(rim);

  var shard = makeShard(1.35);
  scene.add(shard);

  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloomPass = new UnrealBloomPass(new THREE.Vector2(320, 320), 0.9, 0.6, 0.15);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  function fitToWrapper() {
    var size = wrapper.clientWidth || 320;
    renderer.setSize(size, size, false);
    composer.setSize(size, size);
    bloomPass.setSize(size, size);
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
    var t = clock.getElapsedTime();
    var dt = Math.min(clock.getDelta(), 0.05);
    shard.rotation.y += dt * 0.32;
    shard.rotation.x += dt * 0.1;
    shard.position.x = Math.sin(t * 0.4) * 0.28;
    shard.position.y = Math.cos(t * 0.28) * 0.16;
    composer.render();
  }
  animate();
})();
