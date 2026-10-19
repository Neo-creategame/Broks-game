// ========================================
// ゲーム全体の設定・定数定義
// ========================================

// プレイヤー関連設定
export const PLAYER_CONFIG = {
  initialPosition: { x: 0, y: 15, z: 0 }, // 初期出現位置（上空スタート）
  height: 3.0,     // プレイヤーの高さ（当たり判定用）
  eyeHeight: 2.5,  // 目線の高さ（足元からの位置）
  radius: 0.4,     // AABB用の当たり判定半径
  speed: 0.20,     // 移動速度
  jumpPower: 0.23, // ジャンプ力
  gravity: 0.01    // プレイヤーにかかる重力
};

// ブロック物理・重力関連設定
export const BLOCK_CONFIG = {
  size: 2.0,            // ブロックの1辺のサイズ (2x2x2)
  halfSize: 1.0,        // ブロックの半分のサイズ（判定・計算用）
  gravity: 0.01,        // ブロック落下速度
  epsilon: 0.001,       // 接触判定の許容誤差
  initialAreaSize: 48,  // 初期配置エリアの範囲 (-48 ～ 48)
  recalcRadius: 6.01,   // 周囲の再計算チェック半径
  removalRadius: 8.01   // 破壊時の再計算伝播半径
};

// 色選択キー設定マップ
export const COLOR_MAP = {
  "Digit1": { color: 0x00ff00, name: "緑 (1キー)" },
  "Digit2": { color: 0xff0000, name: "赤 (2キー)" },
  "Digit3": { color: 0x0000ff, name: "青 (3キー)" },
  "Digit4": { color: 0xffffff, name: "白 (4キー)" },
  "Digit5": { color: 0x56256e, name: "紫 (5キー)" },
  "Digit6": { color: 0x00ffff, name: "水 (6キー)" },
  "Digit7": { color: 0x000000, name: "黒 (7キー)" },
  "Digit8": { color: 0xffff00, name: "黄 (8キー)" }
};

// 初期選択色（デフォルト: 緑）
export const DEFAULT_COLOR = 0x00ff00;
