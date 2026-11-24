/**
 * TimerConfig.js
 * Timer configuration table - determines which levels have timers enabled | 计时器配置表 - 决定哪些关卡启用计时
 *
 * Usage: Read this config in LevelTimerManager, can be modified at runtime via enableTimerForLevel() | 使用方式：在 LevelTimerManager 中读取此配置，可在运行时通过 enableTimerForLevel() 函数修改
 */

export const TIMER_CONFIG = {
  // ── Easy difficulty (Timer enabled) | 简单难度（启用计时） ────────────────────────────────────
  easy_level1: { enabled: true },
  easy_level2: { enabled: true },
  easy_level3: { enabled: true },
  easy_level4: { enabled: true },
  easy_level5: { enabled: true },
  easy_level6: { enabled: true },
  easy_level7: { enabled: true },
  easy_level8: { enabled: true },
  easy_level9: { enabled: true },
  easy_level10: { enabled: true },

  // ── Hard difficulty (Timer enabled) | 困难难度（启用计时） ────────────────────────────────────
  hard_level1: { enabled: true },
  hard_level2: { enabled: true },
  hard_level3: { enabled: true },
  hard_level4: { enabled: true },
  hard_level5: { enabled: true },
  hard_level6: { enabled: true },
  hard_level7: { enabled: true },
  hard_level8: { enabled: true },
  hard_level9: { enabled: true },
  hard_level10: { enabled: true },
};

/**
 * Enable or disable timer for a level at runtime | 运行时启用或禁用某个关卡的计时器
 * @param {string} levelId - Level ID | 关卡ID
 * @param {boolean} enabled - Whether to enable | 是否启用
 */
export function enableTimerForLevel(levelId, enabled) {
  TIMER_CONFIG[levelId] = { enabled };
  console.log(`[TimerConfig] Timer for level "${levelId}" set to: ${enabled}`);
}
