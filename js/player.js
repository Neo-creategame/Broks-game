import { PLAYER_CONFIG } from './config.js';
import { scene, camera } from './scene.js';

// 1. プレイヤーオブジェクトの作成
export const player = new THREE.Object3D();
player.position.set(
  PLAYER_CONFIG.initialPosition.x,
  PLAYER_CONFIG.initialPosition.y,
  PLAYER_CONFIG.initialPosition.z
);
scene.add(player);

// カメラをプレイヤーの子要素に追加（目線の高さ設定）
camera.position.y = PLAYER_CONFIG.eyeHeight;
player.add(camera);

// プレイヤーの状態変数
export let velocityY = 0;
export let onGround = true;
export const keys = {};

// 視点回転用（Yaw: 左右回転, Pitch: 上下回転）
export let yaw = 0;
export let pitch = 0;

// キー入力イベントの登録
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  // スペースキーでジャンプ
  if (e.code === "Space" && onGround) {
    velocityY = PLAYER_CONFIG.jumpPower;
    onGround = false;
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// マウス移動による視点回転処理
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * 0.0025;
    pitch -= e.movementY * 0.0025;
    // 上下の回転角度制限（真上・真下を向きすぎないように制限）
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));

    player.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
});

/**
 * プレイヤーとブロック（AABB）の横衝突判定
 * @param {number} x - 判定用X座標
 * @param {number} z - 判定用Z座標
 * @param {number} pY - プレイヤーの足元Y座標
 * @param {Array<THREE.Mesh>} walls - ブロック配列
 * @returns {boolean} 衝突しているか
 */
export function isColliding(x, z, pY, walls) {
  const feet = pY;
  const head = pY + PLAYER_CONFIG.height;

  for (let wall of walls) {
    const wX = wall.position.x;
    const wY = wall.position.y;
    const wZ = wall.position.z;

    const minX = wX - 1.0 - PLAYER_CONFIG.radius;
    const maxX = wX + 1.0 + PLAYER_CONFIG.radius;
    const minZ = wZ - 1.0 - PLAYER_CONFIG.radius;
    const maxZ = wZ + 1.0 + PLAYER_CONFIG.radius;
    const minY = wY - 1.0;
    const maxY = wY + 1.0;

    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      if (feet < maxY && head > minY) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 毎フレーム呼ばれるプレイヤー移動＆物理演算処理
 * @param {Array<THREE.Mesh>} walls - ブロック配列
 * @param {number} prevY - 移動直前のプレイヤーY座標
 */
export function updatePlayer(walls, prevY) {
  // --- 移動ベクトルの計算 ---
  let moveX = 0;
  let moveZ = 0;

  if (keys["KeyW"]) {
    moveX += -Math.sin(yaw) * PLAYER_CONFIG.speed;
    moveZ += -Math.cos(yaw) * PLAYER_CONFIG.speed;
  }
  if (keys["KeyS"]) {
    moveX += Math.sin(yaw) * PLAYER_CONFIG.speed;
    moveZ += Math.cos(yaw) * PLAYER_CONFIG.speed;
  }
  if (keys["KeyA"]) {
    moveX += -Math.cos(yaw) * PLAYER_CONFIG.speed;
    moveZ += Math.sin(yaw) * PLAYER_CONFIG.speed;
  }
  if (keys["KeyD"]) {
    moveX += Math.cos(yaw) * PLAYER_CONFIG.speed;
    moveZ += -Math.sin(yaw) * PLAYER_CONFIG.speed;
  }

  // 横方向の衝突判定を行いつつ移動
  let nextX = player.position.x + moveX;
  let nextZ = player.position.z + moveZ;

  if (!isColliding(nextX, player.position.z, player.position.y, walls)) {
    player.position.x = nextX;
  }
  if (!isColliding(player.position.x, nextZ, player.position.y, walls)) {
    player.position.z = nextZ;
  }

  // --- 重力適用とY座標の更新 ---
  velocityY -= PLAYER_CONFIG.gravity;
  player.position.y += velocityY;

  // --- 頭上（天井）衝突判定 ---
  for (let wall of walls) {
    const minX = wall.position.x - 1.0 - PLAYER_CONFIG.radius;
    const maxX = wall.position.x + 1.0 + PLAYER_CONFIG.radius;
    const minZ = wall.position.z - 1.0 - PLAYER_CONFIG.radius;
    const maxZ = wall.position.z + 1.0 + PLAYER_CONFIG.radius;

    if (
      player.position.x > minX &&
      player.position.x < maxX &&
      player.position.z > minZ &&
      player.position.z < maxZ
    ) {
      const bottom = wall.position.y - 1.0;
      const headNow = player.position.y + PLAYER_CONFIG.height;
      const headPrev = prevY + PLAYER_CONFIG.height;

      if (headPrev <= bottom && headNow >= bottom && velocityY > 0) {
        player.position.y = bottom - PLAYER_CONFIG.height;
        velocityY = 0;
      }
    }
  }

  // --- 床・ブロックへの着地判定 ---
  let groundY = 0;
  let landed = false;

  for (let wall of walls) {
    const minX = wall.position.x - 1.0 - PLAYER_CONFIG.radius;
    const maxX = wall.position.x + 1.0 + PLAYER_CONFIG.radius;
    const minZ = wall.position.z - 1.0 - PLAYER_CONFIG.radius;
    const maxZ = wall.position.z + 1.0 + PLAYER_CONFIG.radius;

    if (
      player.position.x > minX &&
      player.position.x < maxX &&
      player.position.z > minZ &&
      player.position.z < maxZ
    ) {
      const top = wall.position.y + 1.0;
      const feetNow = player.position.y;

      if (
        velocityY <= 0 &&
        feetNow >= top - 0.25 &&
        feetNow <= top + 0.2 &&
        prevY >= wall.position.y + 0.9
      ) {
        groundY = Math.max(groundY, top);
        landed = true;
      }
    }
  }

  // 着地状態の適用
  if (landed) {
    player.position.y = groundY;
    velocityY = 0;
    onGround = true;
  } else if (player.position.y < 0) {
    player.position.y = 0;
    velocityY = 0;
    onGround = true;
  } else {
    onGround = false;
  }
}
