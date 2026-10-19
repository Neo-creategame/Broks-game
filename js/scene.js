// ========================================
// Three.js シーン・カメラ・レンダラー・環境構築
// ========================================

// 1. シーン作成
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 空色

// 2. カメラ作成
export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// 3. レンダラー作成
export const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. ライティング設定
// 平行光源（太陽光・影生成）
export const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(20, 40, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 512;
directionalLight.shadow.mapSize.height = 512;
scene.add(directionalLight);

// 環境光（全体を薄く照らす）
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// 5. チェック柄の地面（Floor）作成
function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  
  // Canvasを使って2色チェック柄のテクスチャを生成
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const tileSize = 64;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#000000";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  const floorTexture = new THREE.CanvasTexture(canvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(5, 5);
  floorTexture.magFilter = THREE.NearestFilter;

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    side: THREE.DoubleSide
  });

  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.receiveShadow = true;
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.01;

  scene.add(floorMesh);
  return floorMesh;
}

export const floor = createFloor();

// 6. ウィンドウリサイズ時のカメラ・レンダラー追従設定
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
