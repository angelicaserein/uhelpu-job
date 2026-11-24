/**
 * @fileoverview Linear level order + persistent player progress.
 * 线性关卡顺序 + 玩家进度存档（localStorage）。
 *
 * To reorder / drop levels, only edit LEVEL_ORDER below.
 * 想调整关卡顺序或去掉某些关卡，只需修改下面的 LEVEL_ORDER。
 */

const range10 = (prefix) =>
  Array.from({ length: 10 }, (_, i) => `${prefix}_level${i + 1}`);

/**
 * Play order — exactly 10 levels (matches the 10-slot level-select background).
 * Currently the easy set as a placeholder; swap in the redesigned levels here.
 * hard_/special_ level files are kept in the registry but are not in the sequence.
 * 游玩顺序——正好 10 关（对应选关背景的 10 个位置）。目前先用 easy 这套占位，
 * 重做好的关卡替换到这里即可。hard_/special_ 文件保留在注册表中，但不在序列里。
 */
export const LEVEL_ORDER = range10("easy");

const STORAGE_KEY = "uhelpu_level_progress_v1";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      completed: Array.isArray(data.completed) ? data.completed : [],
    };
  } catch {
    return { completed: [] };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — progress just won't persist
  }
}

export const LevelProgress = {
  /** @returns {number} index in LEVEL_ORDER, or -1 for non-linear levels */
  indexOf(levelId) {
    return LEVEL_ORDER.indexOf(levelId);
  },

  /** @returns {string|null} next level id, or null if last / not in order */
  getNext(levelId) {
    const i = LEVEL_ORDER.indexOf(levelId);
    return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
  },

  isCompleted(levelId) {
    return load().completed.includes(levelId);
  },

  markCompleted(levelId) {
    if (LEVEL_ORDER.indexOf(levelId) < 0) return;
    const state = load();
    if (!state.completed.includes(levelId)) {
      state.completed.push(levelId);
      save(state);
    }
  },

  /** First level not yet completed (the one the player is "on"). null = all done. */
  getCurrent() {
    const { completed } = load();
    return LEVEL_ORDER.find((id) => !completed.includes(id)) ?? null;
  },

  /** A level is unlocked if it is completed or is the current one. */
  isUnlocked(levelId) {
    return this.isCompleted(levelId) || this.getCurrent() === levelId;
  },

  getCompletedCount() {
    const { completed } = load();
    return LEVEL_ORDER.filter((id) => completed.includes(id)).length;
  },

  reset() {
    save({ completed: [] });
  },
};
