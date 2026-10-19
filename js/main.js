import { COLOR_MAP } from './config.js';
import { scene, camera, renderer, floor } from './scene.js';
import { player, updatePlayer } from './player.js';
import { 
  walls, 
  initBlocks, 
  createWall, 
  updateBoxGravity, 
  wakeBoxesAfterRemoval, 
  setCurrentHexColor 
} from './blocks.js';

// 1. 初期ブロック群の自動配置
initBlocks();

// 2. レイキャスター（視線判定用）の作成
const raycaster = new THREE.Raycaster();

// 3. UIエレメントの取得
const fpsSpan = document.getElementById("fps-value");
const colorSpan = document.getElementById("color-name");

// 4. マウスクリックでポインターロック（視線操作モード）開始
document.addEventListener("click", () => {
  if (document.pointerLockElement !== document.body) {
    document.body.requestPointerLock();
  }
});

// コンテキストメニュー（右クリック時の標準メニュー）を無効化
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 5. キー入力による色切り替え処理
document.addEventListener("keydown", (e) => {
  if (COLOR_MAP[e.code]) {
    const selected = COLOR_MAP[e.code];
    setCurrentHexColor(selected.color);

    if (colorSpan) {
      colorSpan.innerText = selected.name;
      colorSpan.style.color = "#" + selected.color.toString(16).padStart(6, '0');
    }
  }
});

// 6. マウスクリック操作（左クリック: 設置 / 右クリック: 破壊）
document.addEventListener("mousedown", (event) => {
  if (document.pointerLockElement !== document.body) return;
  if (event.button !== 0 && event.button !== 2) return;

  // カメラの正面方向ベクトルを取得
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  raycaster.set(
    camera.getWorldPosition(new THREE.Vector3()),
    dir
  );

  // 床および全ブロックとの交差判定
  const intersects = raycaster.intersectObjects([floor, ...walls]);
  if (intersects.length <= 0) return;

  const hit = intersects[0];

  // ===== 左クリック（ボタン0）：ブロック設置 =====
  if (event.button === 0) {
    if (hit.object === floor) {
      const x = Math.round(hit.point.x / 2) * 2;
      const z = Math.round(hit.point.z / 2) * 2;
      createWall(x, 1.0, z);
    } else {
      const normal = hit.face.normal.clone();
      normal.transformDirection(hit.object.matrixWorld);
      const pos = hit.object.position.clone();
      pos.add(normal.multiplyScalar(2));

      createWall(
        Math.round(pos.x / 2) * 2,
        Math.round((pos.y - 1) / 2) * 2 + 1,
        Math.round(pos.z / 2) * 2
      );
    }
  }
  // ===== 右クリック（ボタン2）：ブロック破壊 =====
  else if (event.button === 2) {
    if (hit.object !== floor) {
      const removedBox = hit.object;

      scene.remove(removedBox);

      const index = walls.indexOf(removedBox);
      if (index > -1) {
        walls.splice(index, 1);
      }

      // 破壊されたブロックの周囲の重力・安定状態を再計算
      wakeBoxesAfterRemoval(removedBox);
    }
  }
});

// 7. FPS計測用変数
let lastTime = performance.now();
let frameCount = 0;

// 8. メインゲームループ
function animate() {
  // FPS計測
  frameCount++;
  const time = performance.now();
  if (time >= lastTime + 1000) {
    if (fpsSpan) fpsSpan.innerText = frameCount;
    frameCount = 0;
    lastTime = time;
  }

  requestAnimationFrame(animate);

  const prevY = player.position.y;

  // ブロックの物理・重力更新
  updateBoxGravity();

  // プレイヤーの移動・ジャンプ・衝突判定更新
  updatePlayer(walls, prevY);

  // レンダリング実行
  renderer.render(scene, camera);
}

// アニメーションループ開始
animate();
