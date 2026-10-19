import { BLOCK_CONFIG, DEFAULT_COLOR, COLOR_MAP } from './config.js';
import { scene } from './scene.js';
import { player } from './player.js';

// フィールド上の全ブロックを保持する配列
export const walls = [];

// 共通ジオメトリ
export const boxGeometry = new THREE.BoxGeometry(
  BLOCK_CONFIG.size,
  BLOCK_CONFIG.size,
  BLOCK_CONFIG.size
);

// 現在選択中のブロックカラー（動的に変化）
export let currentHexColor = DEFAULT_COLOR;

/**
 * 選択カラーを変更する関数
 * @param {number} color 
 */
export function setCurrentHexColor(color) {
  currentHexColor = color;
}

/**
 * 初期ブロック群の自動配置
 */
export function initBlocks() {
  const areaSize = BLOCK_CONFIG.initialAreaSize;
  for (let y = 1.0; y <= 1.0; y += 2) { // 1段配置
    for (let x = -areaSize; x <= areaSize; x += 2) {
      for (let z = -areaSize; z <= areaSize; z += 2) {
        // プレイヤーの初期位置直下を避けて生成
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;

        const initialMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const box = new THREE.Mesh(boxGeometry, initialMaterial);

        box.castShadow = true;
        box.receiveShadow = true;
        box.position.set(x, y, z);

        scene.add(box);
        walls.push(box);
      }
    }
  }
}

/**
 * ブロックの新規設置
 */
export function createWall(x, y, z) {
  // プレイヤーの身体と重なる位置への設置を防止
  const playerRadius = 0.4; // PLAYER_CONFIG.radius
  const playerHeight = 3.0; // PLAYER_CONFIG.height

  if (
    Math.abs(x - player.position.x) < 1.0 + playerRadius &&
    Math.abs(z - player.position.z) < 1.0 + playerRadius &&
    player.position.y < y + 1.0 &&
    player.position.y + playerHeight > y - 1.0
  ) {
    return;
  }

  const boxMaterial = new THREE.MeshStandardMaterial({
    color: currentHexColor
  });

  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;

  // 物理ステートの初期化
  box.userData.velocityY = 0;
  box.userData.sideHeld = false;
  box.userData.isFalling = false;

  scene.add(box);
  walls.push(box);

  // 設置時の安定・落下判定
  const supportY = getBoxGroundY(box, box.position.y - BLOCK_CONFIG.gravity);

  if (supportY !== null) {
    box.position.y = supportY + 1.0;
  } else if (hasStableSupport(box)) {
    box.userData.sideHeld = true;
  } else {
    box.userData.isFalling = true;
    box.userData.velocityY = -BLOCK_CONFIG.gravity;
  }
}

/**
 * 下方向に支える地面・ブロックの最高高度(Y)を取得
 */
export function getBoxGroundY(box, nextY) {
  const currentBottom = box.position.y - 1.0;
  const nextBottom = nextY - 1.0;
  let supportY = null;

  // 地面 (y = 0)
  if (currentBottom >= -BLOCK_CONFIG.epsilon && nextBottom <= BLOCK_CONFIG.epsilon) {
    supportY = 0;
  }

  const boxMinX = box.position.x - 1.0;
  const boxMaxX = box.position.x + 1.0;
  const boxMinZ = box.position.z - 1.0;
  const boxMaxZ = box.position.z + 1.0;

  for (let other of walls) {
    if (other === box) continue;

    const overlapX =
      boxMaxX > other.position.x - 1.0 &&
      boxMinX < other.position.x + 1.0;

    const overlapZ =
      boxMaxZ > other.position.z - 1.0 &&
      boxMinZ < other.position.z + 1.0;

    if (!overlapX || !overlapZ) continue;

    const otherTop = other.position.y + 1.0;

    if (
      currentBottom >= otherTop - BLOCK_CONFIG.epsilon &&
      nextBottom <= otherTop + BLOCK_CONFIG.epsilon
    ) {
      if (supportY === null || otherTop > supportY) {
        supportY = otherTop;
      }
    }
  }

  return supportY;
}

/**
 * 安定した支えの経路があるかを再帰的に判定
 */
export function hasStableSupport(box, visited = new Set()) {
  if (visited.has(box)) return false;
  visited.add(box);

  const supportY = getBoxGroundY(box, box.position.y - BLOCK_CONFIG.gravity);
  if (supportY !== null) return true;

  for (let other of walls) {
    if (other === box) continue;
    if (other.userData.isFalling) continue;

    const dx = Math.abs(other.position.x - box.position.x);
    const dz = Math.abs(other.position.z - box.position.z);

    const boxMinY = box.position.y - 1.0;
    const boxMaxY = box.position.y + 1.0;
    const otherMinY = other.position.y - 1.0;
    const otherMaxY = other.position.y + 1.0;

    const verticalOverlap =
      boxMaxY > otherMinY + BLOCK_CONFIG.epsilon &&
      boxMinY < otherMaxY - BLOCK_CONFIG.epsilon;

    if (!verticalOverlap) continue;

    const sideTouch =
      (Math.abs(dx - 2) <= BLOCK_CONFIG.epsilon && dz < 2 - BLOCK_CONFIG.epsilon) ||
      (Math.abs(dz - 2) <= BLOCK_CONFIG.epsilon && dx < 2 - BLOCK_CONFIG.epsilon);

    if (sideTouch && hasStableSupport(other, visited)) {
      return true;
    }
  }
  return false;
}

/**
 * 対象ブロックの落下・固定判定を更新
 */
export function wakeBox(box) {
  const supportY = getBoxGroundY(box, box.position.y - BLOCK_CONFIG.gravity);

  if (supportY !== null) {
    box.position.y = supportY + 1.0;
    box.userData.velocityY = 0;
    box.userData.isFalling = false;
    box.userData.sideHeld = false;
    box.userData.lastRecalcY = box.position.y;
    return;
  }

  if (hasStableSupport(box)) {
    box.userData.sideHeld = true;
    box.userData.velocityY = 0;
    box.userData.isFalling = false;
    box.userData.lastRecalcY = box.position.y;
    return;
  }

  box.userData.sideHeld = false;
  box.userData.isFalling = true;
  box.userData.velocityY = -BLOCK_CONFIG.gravity;
  box.userData.lastRecalcY = box.position.y;
}

/**
 * 周囲のブロックを再計算対象にする
 */
export function recalculateNearbyBoxes(centerBox, radius = BLOCK_CONFIG.recalcRadius) {
  for (let box of walls) {
    if (box === centerBox) continue;

    const dx = box.position.x - centerBox.position.x;
    const dz = box.position.z - centerBox.position.z;

    if (Math.abs(dx) > radius || Math.abs(dz) > radius) continue;
    if (box.userData.isFalling) continue;

    wakeBox(box);
  }
}

/**
 * ブロック破壊時の連鎖的再計算処理
 */
export function wakeBoxesAfterRemoval(removed) {
  const queue = [removed];
  const checked = new Set();
  const radius = BLOCK_CONFIG.removalRadius;

  while (queue.length > 0) {
    const center = queue.shift();
    if (checked.has(center)) continue;
    checked.add(center);

    for (let box of walls) {
      if (checked.has(box)) continue;

      const dx = box.position.x - center.position.x;
      const dz = box.position.z - center.position.z;
      if (Math.abs(dx) > radius || Math.abs(dz) > radius) continue;

      const dy = Math.abs(box.position.y - center.position.y);
      if (dy > radius) continue;

      const wasFalling = box.userData.isFalling === true;
      const oldY = box.position.y;
      const oldVelocity = box.userData.velocityY || 0;
      const oldSideHeld = box.userData.sideHeld === true;

      if (!wasFalling) {
        wakeBox(box);
      }

      const changed =
        oldY !== box.position.y ||
        oldVelocity !== (box.userData.velocityY || 0) ||
        oldSideHeld !== (box.userData.sideHeld === true) ||
        wasFalling !== (box.userData.isFalling === true);

      if (changed) {
        queue.push(box);
      }
    }
  }
}

/**
 * 落下中のブロック動作時の周辺再計算
 */
export function recalculateAroundFallingBox(box) {
  if (!box.userData.isFalling) return;

  const lastY = box.userData.lastRecalcY;
  if (lastY === undefined) {
    box.userData.lastRecalcY = box.position.y;
    return;
  }

  if (Math.abs(box.position.y - lastY) < 0.25) return;

  box.userData.lastRecalcY = box.position.y;
  recalculateNearbyBoxes(box, BLOCK_CONFIG.recalcRadius);
}

/**
 * 全ブロックの重力・物理フレーム更新
 */
export function updateBoxGravity() {
  for (let box of walls) {
    if (box.userData.velocityY === undefined) box.userData.velocityY = 0;
    if (box.userData.isFalling === undefined) box.userData.isFalling = false;

    if (box.userData.sideHeld && !box.userData.isFalling) {
      if (hasStableSupport(box)) {
        box.userData.velocityY = 0;
        continue;
      }
      box.userData.sideHeld = false;
      box.userData.isFalling = true;
      box.userData.velocityY = -BLOCK_CONFIG.gravity;
    }

    if (box.userData.velocityY === 0 && !box.userData.isFalling) continue;

    if (box.userData.isFalling) {
      box.userData.velocityY -= BLOCK_CONFIG.gravity;
    }

    const nextY = box.position.y + box.userData.velocityY;
    const groundY = getBoxGroundY(box, nextY);

    if (groundY !== null) {
      box.position.y = groundY + 1.0;
      box.userData.velocityY = 0;
      box.userData.isFalling = false;
      box.userData.sideHeld = false;

      recalculateNearbyBoxes(box, BLOCK_CONFIG.recalcRadius);
    } else {
      box.position.y = nextY;
      box.userData.isFalling = true;

      recalculateAroundFallingBox(box);
    }
  }
}
