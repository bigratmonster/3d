// Main three.js library
import * as THREE from 'three';
// Addons for three.js (fps monitor, camera controls, model loader)
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const BASE = import.meta.env.BASE_URL;

// Uncomment appendChild function call to get fps monitor
const stats = new Stats({ horizontal: false });
let statsVisible = true
document.body.appendChild(stats.dom);
toggleStats()

function toggleStats() {
  statsVisible = !statsVisible
  stats.domElement.style.display = statsVisible ? 'block' : 'none';
}


// Create the WEBGL renderer with proper sizing
const renderer = new THREE.WebGLRenderer({});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Add renderer to the webpage
document.body.appendChild(renderer.domElement);

// Create the 3D scene
const scene = new THREE.Scene();

// Create the camera (first value is the FOV)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 999999);

// Start the camera a quarter of the way around to get full bigrat profile
const initialAngle = Math.PI / 2;
const radius = 50;
camera.position.set(radius * Math.sin(initialAngle), 10, radius * Math.cos(initialAngle));
camera.lookAt(new THREE.Vector3(-20, 0, 0));

// Initialize the camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 500

function createPanel(model) {
  // Create dat.GUI
  const gui = new GUI();
  const guiOptions = {
    showStats: false,
    showTexture: true,
    showWireframe: false,
    showGrid: false
  };
  gui.close(); // Close the GUI initially

  // Add controls to the panel
  const statsController = gui.add(guiOptions, 'showStats').name('Show FPS');
  const textureController = gui.add(guiOptions, 'showTexture').name('Show Texture');
  const wireframeController = gui.add(guiOptions, 'showWireframe').name('Wireframe');
  const gridController = gui.add(guiOptions, 'showGrid').name('Show Grid');

  // Add Reset View button
  gui.add({
    reset: () => {
      // Reset camera position and angle
      camera.position.set(radius * Math.sin(initialAngle), 10, radius * Math.cos(initialAngle));
      camera.lookAt(new THREE.Vector3(-20, 0, 0));
      // Resume auto-spin
      isUserInteracting = false;
      clock = new THREE.Clock(); // Reset clock for spin
    }
  }, 'reset').name('Reset View');

  stats.dom.style.display = 'none';
  statsController.onChange((value) => {
    stats.dom.style.display = value ? '' : 'none';
  });

  // Helper to update texture and wireframe
  // Store original textures for toggling
  const originalTextures = new Map();
  model.traverse((child) => {
    if (child.isMesh && child.material && child.material.map) {
      originalTextures.set(child.uuid, child.material.map);
    }
  });

  function updateMaterial() {
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Toggle texture
        if (originalTextures.has(child.uuid)) {
          child.material.map = guiOptions.showTexture ? originalTextures.get(child.uuid) : null;
          child.material.needsUpdate = true;
        }
        // Toggle wireframe
        child.material.wireframe = guiOptions.showWireframe;
        child.material.needsUpdate = true;
      }
    });
  }

  textureController.onChange(() => {
    updateMaterial();
  });
  wireframeController.onChange(() => {
    updateMaterial();
  });
  gridController.onChange(() => {
    gridHelper.visible = guiOptions.showGrid;
  })

  // Initial update
  updateMaterial();
}

// Create a grid for the scene, uncomment for position / rotation debugging
const gridHelper = new THREE.GridHelper(1000, 50);
scene.add(gridHelper);
gridHelper.visible = false

// Scale modifier for the model
const ratScale = 75;

// Load GLTF model
const loader = new GLTFLoader();

// Provide a DRACOLoader instance to decode compressed mesh data
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(BASE + 'draco/');
loader.setDRACOLoader(dracoLoader);

const modelUrl = new URL('./assets/bigrat_model.glb', import.meta.url).href;

loader.load(
  modelUrl,
  (gltf) => {
    const model = gltf.scene;

    // Scale the model according to ratScale
    model.scale.set(ratScale, ratScale, ratScale);

    // The model is slightly off center and rotated, so this fixes that
    model.position.set(-20, 0, 0);
    model.rotation.z = -0.25;

    // Add the model to the scene
    scene.add(model);
    console.log('Bigrat loaded successfully!');

    // Create the control panel
    createPanel(model);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded...');
  },
  (error) => {
    console.error('Bigrat failed to load :(', error);
  }
);

// Create ambient lighting
const ambientLight = new THREE.AmbientLight(0x404040, 100);
scene.add(ambientLight);

// Add event listeners to detect user interaction
let isUserInteracting = false;
controls.addEventListener('start', () => {
  isUserInteracting = true;
});

// Main animation loop
let clock = new THREE.Clock();
function animate() {
  // Tell the browser you want to animate
  requestAnimationFrame(animate);

  // Initial rotation of camera around bigrat, stops when user interacts
  if (!isUserInteracting) {
    let delta = clock.getDelta();
    let angularSpeed = 0.5; // Radians per second
    let angle = initialAngle + angularSpeed * clock.getElapsedTime();

    camera.position.x = radius * Math.sin(angle);
    camera.position.z = radius * Math.cos(angle);
    camera.lookAt(new THREE.Vector3(-20, 0, 0));
  }

  // Update camera position based on user controls
  controls.update();

  // Render the scene
  renderer.render(scene, camera);

  // Update performance profiling
  stats.update();
}

animate();

// Handle window resizing
window.onresize = function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
