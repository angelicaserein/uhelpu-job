import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { t } from "../../../i18n/index.js";
import { Assets } from "../../../AssetsManager.js";
import { AudioManager } from "../../../AudioManager.js";
import { EventTypes } from "../../../event-system/EventTypes.js";
import { LevelProgress } from "../../../level-design/LevelProgress.js";

export class StaticPageWinEasy extends PageBase {
  constructor(levelIndex, switcher, p, eventBus) {
    super(switcher);
    this.levelIndex = levelIndex;
    this.p = p;
    this.eventBus = eventBus;

    console.log("[WinEasy] Constructor - levelIndex:", this.levelIndex);

    const nextLevelId = LevelProgress.getNext(this.levelIndex);

    const btnW = 180;
    const btnH = 46;
    const btnGap = 14;

    // 计算横排按钮的布局
    const totalBtnWidth = btnW * 3 + btnGap * 2;
    const btnStartX = p.width / 2 - totalBtnWidth / 2;
    // 按钮位置向下移动到屏幕下方，为排行榜腾出中间空间
    const btnY = (p.height * 3) / 4;

    // 存储按钮引用以用于键盘导航
    this._winButtons = [];

    // 下一关按钮（左边）
    if (nextLevelId) {
      const nextBtn = new ButtonBase(
        p,
        t("btn_next_level"),
        btnStartX,
        btnY,
        () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, nextLevelId);
        },
        "win-action-button",
      );
      nextBtn.btn.style("width", btnW + "px");
      nextBtn.btn.style("height", btnH + "px");
      this.addElement(nextBtn);
      this._winButtons.push({
        btn: nextBtn.btn,
        callback: () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, nextLevelId);
        },
      });
    }

    // 重试按钮（中间）
    const restartBtn = new ButtonBase(
      p,
      t("btn_restart"),
      btnStartX + btnW + btnGap,
      btnY,
      () => {
        console.log(
          "[WinEasy] Restart - publishing LOAD_LEVEL with levelIndex:",
          this.levelIndex,
        );
        this.eventBus.publish(EventTypes.LOAD_LEVEL, this.levelIndex);
      },
      "win-action-button",
    );
    restartBtn.btn.style("width", btnW + "px");
    restartBtn.btn.style("height", btnH + "px");
    this.addElement(restartBtn);
    this._winButtons.push({
      btn: restartBtn.btn,
      callback: () => {
        console.log(
          "[WinEasy] Restart (via keyboard) - publishing LOAD_LEVEL with levelIndex:",
          this.levelIndex,
        );
        this.eventBus.publish(EventTypes.LOAD_LEVEL, this.levelIndex);
      },
    });

    // 返回菜单按钮（右边）
    const backBtn = new ButtonBase(
      p,
      t("btn_back_menu"),
      btnStartX + (btnW + btnGap) * 2,
      btnY,
      () => {
        this.switcher.staticSwitcher.showMainMenu(p);
      },
      "win-action-button",
    );
    backBtn.btn.style("width", btnW + "px");
    backBtn.btn.style("height", btnH + "px");
    this.addElement(backBtn);
    this._winButtons.push({
      btn: backBtn.btn,
      callback: () => {
        this.switcher.staticSwitcher.showMainMenu(p);
      },
    });

    // decorative star particles
    this._stars = [];
    for (let i = 0; i < 60; i++) {
      this._stars.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(2, 6),
        speedY: p.random(-0.6, -2.0),
        speedX: p.random(-0.4, 0.4),
        alpha: p.random(160, 255),
        hue: p.random(280, 320),
      });
    }
  }

  enter() {
    super.enter();

    AudioManager.playSFX("gameWin");

    // 底部提示条
    const hintBar = this.p.createDiv(
      `<div class="win-hint-text">${t("win_press_space_or_enter")}</div>`,
    );
    hintBar.addClass("win-hint-bar");
    this.addElement(hintBar);

    // 注册键盘导航（横排排列）
    if (this._winButtons.length > 0) {
      this.registerNavButtons(this._winButtons, {
        layout: "horizontal",
        onEsc: () => this.switcher.staticSwitcher.showMainMenu(this.p),
      });
    }
  }

  draw() {
    const p = this.p;

    // pink-to-purple gradient background
    for (let y = 0; y < p.height; y++) {
      const t = y / p.height;
      const r = p.lerp(255, 100, t);
      const g = p.lerp(150, 40, t);
      const b = p.lerp(200, 180, t);
      p.stroke(r, g, b);
      p.line(0, y, p.width, y);
    }
    p.noStroke();

    // drift stars upward
    for (const s of this._stars) {
      s.x += s.speedX;
      s.y += s.speedY;
      if (s.y < -10) {
        s.y = p.height + 5;
        s.x = p.random(p.width);
      }
      p.fill(255, 180, 220, s.alpha);
      p.rect(s.x, s.y, s.size, s.size);
    }

    // title glow
    p.textAlign(p.CENTER, p.CENTER);
    if (Assets.customFont) p.textFont(Assets.customFont);

    const titleY = p.height / 6;
    p.fill(200, 80, 180, 60);
    p.textSize(78);
    p.text(t("result_win"), p.width / 2 + 3, titleY + 3);

    p.fill(255, 200, 240);
    p.textSize(76);
    p.text(t("result_win"), p.width / 2, titleY);

    // sub-label
    p.fill(255, 200, 240, 200);
    p.textSize(20);
    const orderIdx = LevelProgress.indexOf(this.levelIndex);
    const match = this.levelIndex.match(/\d+/);
    const levelNum =
      orderIdx >= 0 ? orderIdx + 1 : match ? parseInt(match[0], 10) : "?";
    p.text(`- Level ${levelNum} -`, p.width / 2, titleY + 52);

    // 显示本次通关用时
    this._drawResultTime(p);
  }

  /**
   * 显示本次通关用时（来自 LevelTimerManager 写入的 window.finalScore）
   * @private
   */
  _drawResultTime(p) {
    const score = window.finalScore;
    if (typeof score !== "number" || !Number.isFinite(score)) return;

    if (Assets.customFont) p.textFont(Assets.customFont);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(28);
    p.fill(255, 220, 120, 255);
    p.text(`${t("current_score")}${score.toFixed(2)}s`, p.width / 2, p.height / 2);
  }
}
