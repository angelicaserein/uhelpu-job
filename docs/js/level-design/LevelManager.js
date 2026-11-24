import { TerrainRenderer } from "../game-entity-model/terrain/TerrainRenderer.js";
import { LEVEL_REGISTRY } from "../level-registry.js";
import { setGamePaused, isGamePaused } from "../game-runtime/GamePauseState.js";
import { EventTypes } from "../event-system/EventTypes.js";
import { Assets } from "../AssetsManager.js";
import { t } from "../i18n/index.js";
import { CheckpointSystem } from "./CheckpointSystem.js";
import { TeleportPointSystem } from "./TeleportPointSystem.js";

export class LevelManager {
  constructor(p, eventBus) {
    this.p = p;
    this.eventBus = eventBus;
    // Build level map from the central registry — single source of truth.
    this.levelMap = Object.fromEntries(
      Object.entries(LEVEL_REGISTRY).map(([id, { LevelClass }]) => [
        id,
        LevelClass,
      ]),
    );
    this.level = null;
    this.currentLevelIndex = null;
    this.cameraNudgeX = 0;
    this.maxCameraNudgeX = 60;
    this.cameraNudgeLerp = 0.02;
    this.bgParallaxFactor = 1.8;
    this.levelTitleOverlay = {
      active: false,
      startedAtMs: 0,
      totalDurationMs: 3500,
      fadeStartMs: 1800,
      titleKey: "",
    };

    // 存档点系统
    this._checkpointSystem = new CheckpointSystem(() => this.level);

    // 传送点系统
    this._teleportPointSystem = new TeleportPointSystem(() => this.level);
    this._pendingDeathReload = null;

    // Portal transition effect
    this.portalTransition = null;

    // Level-clear animation state (null when inactive)
    // 通关动画状态（未播放时为 null）
    this.winAnim = null;
  }

  isWinAnimationActive() {
    return !!this.winAnim;
  }

  /**
   * Freeze the game and play the level-clear animation, then call onDone.
   * 冻结游戏并播放通关动画，结束后调用 onDone。
   */
  startWinAnimation(onDone, p = this.p) {
    if (this.winAnim) return;
    this.setPaused(true);

    // entities is iterable but not necessarily an Array
    // entities 可迭代，但不一定是数组
    const portal = Array.from(this.level?.entities || []).find(
      (e) => e.type === "portal",
    );
    const player = this.level?.getPlayer?.();
    const src = portal || player;
    const w = src?.collider?.w ?? 0;
    const h = src?.collider?.h ?? 0;

    const sparks = Array.from({ length: 36 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.55,
      size: 3 + Math.random() * 5,
      hue: Math.random() < 0.5 ? [255, 215, 120] : [190, 225, 255],
    }));

    this.winAnim = {
      startedAtMs: p?.millis ? p.millis() : performance.now(),
      durationMs: 2300,
      // world-space centre; converted to screen each frame (camera nudge)
      worldX: src ? src.x + w / 2 : null,
      worldY: src ? src.y + h / 2 : null,
      sparks,
      onDone,
    };
  }

  drawWinAnimation(p = this.p, nudgeX = 0) {
    const a = this.winAnim;
    if (!a) return false;

    const nowMs = p?.millis ? p.millis() : performance.now();
    const elapsed = nowMs - a.startedAtMs;
    const total = a.durationMs;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const easeOut = (v) => 1 - Math.pow(1 - v, 3);

    // screen-space origin (scene is Y-flipped)
    const cx = a.worldX != null ? a.worldX - nudgeX : p.width / 2;
    const cy = a.worldY != null ? p.height - a.worldY : p.height / 2;
    const maxR = Math.hypot(
      Math.max(cx, p.width - cx),
      Math.max(cy, p.height - cy),
    );

    p.push();
    p.resetMatrix();
    p.noStroke();

    // Phase 1 (0–900ms): glowing rings + sparks burst out of the portal
    const burstT = clamp01(elapsed / 900);
    for (let i = 0; i < 3; i++) {
      const rt = clamp01(burstT * 1.4 - i * 0.22);
      if (rt <= 0) continue;
      p.noFill();
      p.stroke(255, 230, 150, 230 * (1 - rt));
      p.strokeWeight(5 - i);
      const r = easeOut(rt) * 170;
      p.circle(cx, cy, r * 2);
    }
    p.noStroke();
    for (const s of a.sparks) {
      const d = easeOut(clamp01(elapsed / 1400)) * s.speed * 420;
      const alpha = 255 * (1 - clamp01(elapsed / 1500));
      p.fill(s.hue[0], s.hue[1], s.hue[2], alpha);
      p.rect(
        cx + Math.cos(s.angle) * d - s.size / 2,
        cy + Math.sin(s.angle) * d - s.size / 2,
        s.size,
        s.size,
      );
    }

    // Phase 2 (400–1500ms): white iris expands from the portal
    const irisT = clamp01((elapsed - 400) / 1100);
    if (irisT > 0) {
      // Soft, semi-transparent pinkish wash instead of a pure-white flash.
      // 柔和的半透明粉色，而不是纯白闪屏，避免刺眼。
      p.fill(255, 225, 245, 120);
      p.circle(cx, cy, easeOut(irisT) * maxR * 2);
    }

    // Phase 3 (1000–2300ms): banner text on the white screen
    const textT = clamp01((elapsed - 1000) / 500);
    if (textT > 0) {
      const scale = 0.8 + 0.2 * easeOut(textT);
      p.textAlign(p.CENTER, p.CENTER);
      if (Assets.customFont) p.textFont(Assets.customFont);
      p.textStyle(p.BOLD);
      const size = Math.max(40, Math.floor(p.width * 0.055)) * scale;
      p.textSize(size);
      p.fill(200, 80, 180, 70 * textT);
      p.text(t("level_clear_banner"), p.width / 2 + 3, p.height / 2 + 3);
      p.fill(190, 70, 170, 255 * textT);
      p.text(t("level_clear_banner"), p.width / 2, p.height / 2);
    }

    p.pop();

    if (elapsed >= total) {
      const done = a.onDone;
      this.winAnim = null;
      if (typeof done === "function") done();
      return true;
    }
    return false;
  }

  startLevelTitleOverlay(levelIndex, p = this.p) {
    let prefix = "level";
    let num = String(levelIndex || "");

    if (num.startsWith("easy_level")) {
      prefix = "easy_level";
      num = num.replace("easy_level", "");
    } else if (num.startsWith("hard_level")) {
      prefix = "hard_level";
      num = num.replace("hard_level", "");
    } else if (num.startsWith("special_level")) {
      prefix = "special_level";
      num = num.replace("special_level", "");
    } else {
      num = num.replace("level", "");
    }

    const key = prefix + num + "_title";
    this.levelTitleOverlay.active = true;
    this.levelTitleOverlay.startedAtMs = p?.millis
      ? p.millis()
      : performance.now();
    this.levelTitleOverlay.titleKey = key;
  }

  drawLevelTitleOverlay(p = this.p) {
    const overlay = this.levelTitleOverlay;
    if (!overlay.active || !overlay.titleKey) return;

    const nowMs = p?.millis ? p.millis() : performance.now();
    const elapsed = nowMs - overlay.startedAtMs;
    if (elapsed >= overlay.totalDurationMs) {
      overlay.active = false;
      return;
    }

    let alphaRate = 1;
    if (elapsed > overlay.fadeStartMs) {
      const fadeDuration = Math.max(
        1,
        overlay.totalDurationMs - overlay.fadeStartMs,
      );
      alphaRate = 1 - (elapsed - overlay.fadeStartMs) / fadeDuration;
    }
    alphaRate = Math.max(0, Math.min(1, alphaRate));

    const centerY = p.height * 0.28;
    const bandH = Math.max(46, p.height * 0.072);
    const coreBandW = p.width * 0.54;
    const sideFadeOuterW = p.width * 0.3;
    const sideFadeInnerExtendW = p.width * 0.08;
    const sideFadeW = sideFadeOuterW + sideFadeInnerExtendW;
    const bandY = centerY - bandH * 0.5;
    const coreBandX = (p.width - coreBandW) * 0.5;
    const leftOuterX = coreBandX - sideFadeOuterW;
    const rightOuterX = coreBandX + coreBandW + sideFadeOuterW - 1;

    p.push();
    p.resetMatrix();
    p.noStroke();

    // Keep top/bottom edges crisp; only keep left/right side gradients.
    for (let i = 0; i < sideFadeW; i++) {
      const t = i / Math.max(1, sideFadeW - 1);
      const a = (1 - t) * 108 * alphaRate;
      p.fill(255, 255, 255, a);

      // Keep outer edges fixed; grow only inward.
      p.rect(leftOuterX + i, bandY, 1, bandH, 0);
      p.rect(rightOuterX - i, bandY, 1, bandH, 0);
    }

    const titleText = t(overlay.titleKey);
    p.fill(255, 255, 255, 248 * alphaRate);
    p.textAlign(p.CENTER, p.CENTER);
    if (Assets.customFont) {
      p.textFont(Assets.customFont);
    }
    p.textStyle(p.BOLD);
    p.textSize(Math.max(26, Math.floor(p.width * 0.03)));
    p.text(titleText, p.width * 0.5, centerY);

    p.pop();
  }

  updateCameraNudge() {
    if (!this.level || typeof this.level.getPlayer !== "function") {
      this.cameraNudgeX = 0;
      return;
    }

    const player = this.level.getPlayer();
    const velX = player?.movementComponent?.velX ?? 0;
    if (Math.abs(velX) <= 0.06) {
      // 松开移动键后保持当前位置，不回弹到中心
      return;
    }

    const moveSpeed =
      player?.controllerManager?.currentControlComponent?.moveSpeed ?? 4;
    const speedRatio = Math.min(1, Math.abs(velX) / Math.max(0.001, moveSpeed));
    const targetNudge = Math.sign(velX) * this.maxCameraNudgeX * speedRatio;

    this.cameraNudgeX +=
      (targetNudge - this.cameraNudgeX) * this.cameraNudgeLerp;
  }

  loadLevel(levelIndex, p = this.p, eventBus = this.eventBus, options = {}) {
    console.log(
      "[LevelManager.loadLevel] Attempting to load levelIndex:",
      levelIndex,
    );
    if (!this.level) {
      const LevelClass = this.levelMap[levelIndex];
      if (!LevelClass) {
        console.error(
          "[LevelManager.loadLevel] ERROR: LevelClass not found for levelIndex:",
          levelIndex,
        );
        console.error(
          "[LevelManager.loadLevel] Available keys in levelMap:",
          Object.keys(this.levelMap),
        );
        return;
      }
      console.log(
        "[LevelManager.loadLevel] Found LevelClass:",
        LevelClass.name,
      );
      this.level = new LevelClass(p, eventBus);
      this.level.__levelIndex = levelIndex;
      this.level.__editorPersistenceKey = levelIndex;
      this.currentLevelIndex = levelIndex;
      this._pendingDeathReload = null;
      this._checkpointSystem.resetLevelState();
      console.log(
        "[LevelManager.loadLevel] Set currentLevelIndex to:",
        this.currentLevelIndex,
      );
      this._restoreStartCheckpoint(options.startCheckpoint);
      this.cameraNudgeX = 0;
      this.startLevelTitleOverlay(levelIndex, p);
      this._teleportPointSystem.registerTeleportPoints(this.level.entities);
      this._teleportPointSystem.restoreTeleportPointsFromSnapshot(
        options.startTeleportPoints,
      );
      console.log("[LevelManager.loadLevel] Loaded level:", levelIndex);
    } else {
      console.warn(
        "[LevelManager.loadLevel] Level already exists, ignoring load request for:",
        levelIndex,
      );
    }
  }
  unloadLevel(p = this.p, eventBus = this.eventBus) {
    if (this.level) {
      this.level.clearLevel(p, eventBus);
      this.level = null;
      this.winAnim = null;
      this._pendingDeathReload = null;
      this._checkpointSystem.resetLevelState();
      this.cameraNudgeX = 0;
      // 卸载关卡后强制清空画布，防止残留
      if (p && typeof p.clear === "function") {
        p.clear();
      } else if (p && typeof p.background === "function") {
        p.background(255);
      }
      console.log("unload level");
    }
  }

  /**
   * Load a pre-instantiated level instance (e.g., user-created levels from JSON).
   * @param {BaseLevel} levelInstance - An instance of a level (typically UserLevel)
   * @param {p5} p - The p5 instance
   */
  loadLevelInstance(levelInstance, p = this.p, options = {}) {
    if (!this.level) {
      this.level = levelInstance;
      this.level.__editorPersistenceKey = this.level.levelId || "user_level";
      this.currentLevelIndex = this.level.levelId || "user_level";
      this._pendingDeathReload = null;
      this._checkpointSystem.resetLevelState();
      this.cameraNudgeX = 0;
      this.startLevelTitleOverlay(this.currentLevelIndex, p);
      this._teleportPointSystem.registerTeleportPoints(this.level.entities);
      this._teleportPointSystem.restoreTeleportPointsFromSnapshot(
        options.startTeleportPoints,
      );
      // Restore from checkpoint if provided (same as loadLevel)
      this._restoreStartCheckpoint(options.startCheckpoint);
      console.log(
        "[LevelManager.loadLevelInstance] Loaded user level:",
        this.currentLevelIndex,
      );
    } else {
      console.warn(
        "[LevelManager.loadLevelInstance] Level already exists, ignoring load request",
      );
    }
  }

  _restoreStartCheckpoint(startCheckpoint) {
    if (!this.level || !startCheckpoint) {
      return;
    }

    const checkpoint =
      this._checkpointSystem.resolveCheckpointFromSnapshot(startCheckpoint);
    const player = this.level.getPlayer?.();
    if (!checkpoint || !player) {
      return;
    }

    checkpoint.activated = true;
    this._checkpointSystem.recordCheckpointActivation(checkpoint);
    player.x = checkpoint.x;
    player.y = checkpoint.y;

    if (player.movementComponent) {
      player.movementComponent.velX = 0;
      player.movementComponent.velY = 0;
    }

    if (player.controllerManager) {
      player.controllerManager.resetInputState();
    }
  }
  update(p = this.p, eventBus = this.eventBus) {
    if (!this.level) {
      return;
    }

    // 追踪checkpoint激活状态
    this._trackCheckpointActivations();

    // Only pause completely during EXIT phase
    let shouldPause = false;
    if (
      this.portalTransition &&
      this.portalTransition.isActive &&
      this.portalTransition.mode === "exit"
    ) {
      shouldPause = true; // Entire 1500ms is paused
    }

    if (!isGamePaused() && !shouldPause) {
      this.level.updatePhysics && this.level.updatePhysics(p);
      this.level.updateCollision && this.level.updateCollision(p, eventBus);
      this.checkDeadPlayerOutOfBounds(p, eventBus);
    }

    if (!this.level) return;

    // Render game (with flipY and camera nudge)
    const editorActive = this.level?._mapEditor?.active;
    if (!editorActive) {
      this.updateCameraNudge();
    } else {
      this.cameraNudgeX = 0;
    }

    const renderNudgeX = Math.round(this.cameraNudgeX);
    this.flipY(p);
    this.level.clearCanvas &&
      this.level.clearCanvas(p, renderNudgeX, this.bgParallaxFactor);

    TerrainRenderer.prepare(this.level.entities);
    p.push();
    p.translate(-renderNudgeX, 0);
    this.level.draw && this.level.draw(p);
    p.pop();

    this.drawLevelTitleOverlay(p);
    // After the level-clear callback runs, the level may be unloaded/replaced.
    // 通关动画回调执行后关卡可能已被卸载/替换，所以放在最后。
    if (this.winAnim) this.drawWinAnimation(p, renderNudgeX);
    // NOTE: vignette overlay is drawn in AppCoordinator (after resetMatrix)
  }

  /**
   * 追踪checkpoint的激活状态
   */
  _trackCheckpointActivations() {
    if (!this.level) return;

    for (const entity of this.level.entities) {
      if (entity.type === "checkpoint" && entity.activated) {
        this._checkpointSystem.recordCheckpointActivation(entity);
      }
    }
  }

  consumePendingDeathReload() {
    const pendingDeathReload = this._pendingDeathReload;
    this._pendingDeathReload = null;
    return pendingDeathReload;
  }

  setPaused(paused) {
    setGamePaused(!!paused);

    if (this.level && this.level.recordSystem) {
      if (
        paused &&
        typeof this.level.recordSystem.pauseForGamePause === "function"
      ) {
        this.level.recordSystem.pauseForGamePause();
      }
      if (
        !paused &&
        typeof this.level.recordSystem.resumeFromGamePause === "function"
      ) {
        this.level.recordSystem.resumeFromGamePause();
      }
    }

    if (!paused || !this.level) return;

    for (const entity of this.level.entities || []) {
      if (
        entity.controllerManager &&
        typeof entity.controllerManager.resetInputState === "function"
      ) {
        entity.controllerManager.resetInputState();
      }
    }

    if (
      this.level.recordSystem &&
      typeof this.level.recordSystem.resetInputState === "function"
    ) {
      this.level.recordSystem.resetInputState();
    }
    if (
      this.level.recordSystem &&
      this.level.recordSystem.clip &&
      typeof this.level.recordSystem.clip.resetInputState === "function"
    ) {
      this.level.recordSystem.clip.resetInputState();
    }
  }
  flipY(p = this.p) {
    p.translate(0, p.height);
    p.scale(1, -1);
  }

  // 检查死亡的玩家是否超出画面边界
  checkDeadPlayerOutOfBounds(p = this.p, eventBus = this.eventBus) {
    if (!this.level) return;

    // 获取玩家引用
    let player = null;
    for (const entity of this.level.entities) {
      if (entity.type === "player") {
        player = entity;
        break;
      }
    }

    if (player && player.deathState && player.deathState.isDead) {
      const viewBounds =
        this.level && typeof this.level.getViewBounds === "function"
          ? this.level.getViewBounds(p)
          : { minX: 0, maxX: p.width, minY: 0, maxY: p.height };

      // 检查玩家是否超出画面（任何方向超出都算）
      if (
        player.x > viewBounds.maxX ||
        player.x + player.collider.w < viewBounds.minX ||
        player.y > viewBounds.maxY ||
        player.y + player.collider.h < viewBounds.minY
      ) {
        const startCheckpoint =
          this._checkpointSystem.getLastActivatedCheckpointSnapshot();
        const startTeleportPoints =
          this._teleportPointSystem.getActivatedTeleportPointsSnapshot();

        if (startCheckpoint) {
          if (!this._pendingDeathReload) {
            this._pendingDeathReload = {
              levelIndex: this.currentLevelIndex,
              startCheckpoint,
              startTeleportPoints,
              preserveTimer: true,
            };
          }
          return;
        }

        if (!isGamePaused()) {
          this.setPaused(true);
          eventBus?.publish(EventTypes.AUTO_RESULT, "autoResult0");
        }
      }
    }
  }
}
