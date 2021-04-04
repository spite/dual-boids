import {
  WebGLRenderer,
  PerspectiveCamera,
  Vector3,
  Scene,
  MeshNormalMaterial,
  IcosahedronBufferGeometry,
  RawShaderMaterial,
  Mesh,
  Matrix4,
  Quaternion,
  PlaneBufferGeometry,
  Vector2,
  Raycaster,
  MeshBasicMaterial,
} from "./js/three.module.js";
import { shader as vertexShader } from "./vs.js";
import { shader as fragmentShader } from "./fs.js";

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xffffff, 1);

const max = renderer.capabilities.maxVertexUniforms;
const NUM = Math.min(300, max - 13); // 12 is 3xmat4 + 1

const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  1,
  10000
);
camera.position.z = 200;

camera.target = new Vector3();

const scene = new Scene();
camera.lookAt(scene.position);

const spherePositions = [];
const sphereScales = [];
const spheres = [];

const g = new IcosahedronBufferGeometry(0.5, 3);
const material = new RawShaderMaterial({
  uniforms: {
    theme: { value: 0 },
    positions: { value: null },
    scales: { value: null },
  },
  vertexShader: vertexShader.replace(
    "#define SPHERES 200",
    `#define SPHERES ${NUM}`
  ),
  fragmentShader,
});

function addSphere(position, scale) {
  const mesh = new Mesh(g.clone(), material);
  mesh.position.copy(position);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.set(
    Math.random() * 2 * Math.PI,
    Math.random() * 2 * Math.PI,
    Math.random() * 2 * Math.PI
  );
  scene.add(mesh);

  spherePositions.push(mesh.position.clone());
  sphereScales.push(scale * scale);

  return mesh;
}

const targetMarker = new Mesh(
  new IcosahedronBufferGeometry(10, 2),
  new MeshNormalMaterial()
);
scene.add(targetMarker);
targetMarker.visible = false;

const repulsionMarker = new Mesh(
  new IcosahedronBufferGeometry(5, 4),
  new MeshBasicMaterial({ color: 0 })
);
scene.add(repulsionMarker);

const plane = new Mesh(
  new PlaneBufferGeometry(1000, 1000),
  new MeshNormalMaterial()
);
scene.add(plane);
plane.visible = false;

const position = new Vector3();

for (let j = 0; j < NUM; j++) {
  const r = 50;
  const phi = Math.random() * 2 * Math.PI;
  const theta = Math.random() * Math.PI;
  position.set(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(theta)
  );

  const s = 5 + Math.random() * 20;

  const m = addSphere(position, s);
  m.__phi = phi;
  m.__theta = theta;
  m.__r = r;
  m.__scale = s;
  m.__scaleFactor = 1 - (s - 5) / 25;
  m.__speed = new Vector3(0, 0, 0);
  m.__rotAxis = new Vector3(
    0.5 - Math.random(),
    0.5 - Math.random(),
    0.5 - Math.random()
  );
  m.__rotAxis.normalize();
  m.__angle = 2 * Math.PI * Math.random();
  m.__rotSpeed = 0.01 + 0.02 * Math.random();
  spheres.push(m);
}

for (var j = 0; j < spheres.length; j++) {
  spheres[j].material.uniforms.positions.value = spherePositions;
  spheres[j].material.uniforms.scales.value = sphereScales;
}

const raycaster = new Raycaster();
const mouse = new Vector2();
let isOver = false;
renderer.domElement.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  isOver = true;
});

renderer.domElement.addEventListener("click", (e) => {
  material.uniforms.theme.value = 1 - material.uniforms.theme.value;
  renderer.setClearColor(material.uniforms.theme.value === 0 ? 0xffffff : 0);
  repulsionMarker.material.color.setHex(
    material.uniforms.theme.value === 1 ? 0xffffff : 0
  );
});

const targetPosition = new Vector3();
const spheresCenter = new Vector3(0, 0, 0);
const tmpVector = new Vector3();
const repulsion = new Vector3(0, 0, 0);
const repulsionPoint = new Vector3();
const prevRepulsionPoint = new Vector3();
const dir = new Vector3(0, 0, 0);
let velocity = 0.05;
const r = 300;

function render() {
  renderer.setAnimationLoop(render);

  raycaster.setFromCamera(mouse, camera);
  // repulsionMarker.visible = isOver;
  const intersects = raycaster.intersectObject(plane);
  if (intersects.length) {
    prevRepulsionPoint.copy(repulsionPoint);
    repulsionPoint.copy(intersects[0].point);
    tmpVector.copy(prevRepulsionPoint).lerp(repulsionPoint, 0.5);
    repulsionMarker.position.copy(tmpVector);
    tmpVector.sub(prevRepulsionPoint);
    repulsionMarker.lookAt(prevRepulsionPoint);
    const l = tmpVector.length();
    repulsionMarker.scale.x = 1 - 0.1 * l;
    repulsionMarker.scale.y = 1 - 0.1 * l;
    repulsionMarker.scale.z = 1 + 0.25 * l;
  }

  var t = performance.now();

  const phi = Math.cos(t * 1.1) * Math.sin(t * 0.8) * 2 * Math.PI;
  const theta = Math.cos(t * 1.2) * Math.sin(t * 0.85) * Math.PI;
  var target = new Vector3(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(theta)
  );
  targetMarker.position.copy(target);
  targetPosition.copy(targetMarker.position);

  camera.target.set(0, 0, 0);
  for (var j = 0; j < spheres.length; j++) {
    spheres[j].rotateOnAxis(spheres[j].__rotAxis, spheres[j].__rotSpeed);

    repulsion.set(0, 0, 0);
    dir.set(0, 0, 0);

    tmpVector.copy(targetPosition);
    tmpVector.sub(spheres[j].position);
    tmpVector.normalize();
    dir.add(tmpVector);

    tmpVector.copy(target);
    tmpVector.sub(spheres[j].position);
    tmpVector.normalize();
    dir.add(tmpVector);

    tmpVector.copy(spheresCenter);
    tmpVector.sub(spheres[j].position);
    tmpVector.normalize();
    dir.add(tmpVector);

    dir.normalize();

    for (var i = j; i < spheres.length; i++) {
      tmpVector.copy(spheres[j].position);
      tmpVector.sub(spheres[i].position);
      var d = tmpVector.length();
      d -= 0.5 * spheres[j].__scale;
      d -= 0.5 * spheres[i].__scale;
      if (d < 0) {
        repulsion.add(tmpVector);
      }
    }
    repulsion.normalize();
    repulsion.multiplyScalar(2);
    dir.add(repulsion);

    if (isOver) {
      tmpVector.copy(spheres[j].position).sub(repulsionPoint);
      repulsion
        .copy(tmpVector)
        .normalize()
        .multiplyScalar(5000 / tmpVector.length() ** 2);
      dir.add(repulsion);
    }

    const speed = 0.2 + 1.8 * (0.5 + 0.5 * Math.sin(performance.now()));
    velocity = speed * (2 * (0.8 + 0.2 * spheres[j].__scaleFactor));

    dir.multiplyScalar(velocity);
    tmpVector.copy(dir).sub(spheres[j].__speed).multiplyScalar(0.01);
    spheres[j].__speed.add(tmpVector);

    spheres[j].position.add(spheres[j].__speed);
  }

  for (let j = 0; j < spheres.length; j++) {
    spherePositions[j].copy(spheres[j].position);
    spheresCenter.add(spheres[j].position);
  }
  spheresCenter.divideScalar(spheres.length);

  targetMarker.position.copy(targetPosition);

  camera.position.copy(spheresCenter);
  const a = t * 0.0001;
  camera.position.x += 300 * Math.cos(a);
  camera.position.z += 300 * Math.sin(a);
  camera.lookAt(spheresCenter);

  plane.position.copy(spheresCenter);
  plane.lookAt(camera.position);

  renderer.render(scene, camera);

  isOver = false;
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", onWindowResize);

onWindowResize();
render();
