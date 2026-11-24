import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { BackButton } from "../../components/BackButton.js";
import { FollowImage } from "../../components/FollowImage.js";
import { LevelInfo } from "../../components/LevelInfo.js";
import { Assets } from "../../../AssetsManager.js";
import { AudioManager } from "../../../AudioManager.js";
import { EventTypes } from "../../../event-system/EventTypes.js";
import { LevelProgress } from "../../../level-design/LevelProgress.js";

export class StaticPageLevelChoiceEasy extends PageBase {
  constructor(switcher, p, eventBus) {
    super(switcher);
    this.p = p;
    this.eventBus = eventBus;
    this.follower = null;
    this.levelInfo = null;
  }

  enter() {
    super.enter();

    const p = this.p;

    AudioManager.playBGM("levelChoice");

    const backBtn = new BackButton(p, () => this.switcher.showWorldSelect(p));
    this.addElement(backBtn);

    // easy 关卡按钮配置 - 上排 1-5，下排 6-10
    const topRowConfigs = [
      { num: 1, x: 0.125, w: 0.05, cls: "level1-button" },
      { num: 2, x: 0.3, w: 0.051, cls: "level2-button" },
      { num: 3, x: 0.477, w: 0.049, cls: "level3-button" },
      { num: 4, x: 0.654, w: 0.049, cls: "level4-button" },
      { num: 5, x: 0.828, w: 0.049, cls: "level5-button" },
    ];
    const bottomRowConfigs = [
      { num: 6, x: 0.143, w: 0.05, cls: "level6-button" },
      { num: 7, x: 0.328, w: 0.051, cls: "level7-button" },
      { num: 8, x: 0.504, w: 0.049, cls: "level8-button" },
      { num: 9, x: 0.669, w: 0.049, cls: "level9-button" },
      { num: 10, x: 0.832, w: 0.049, cls: "level10-button" },
    ];

    const topRowY = 0.441;
    const bottomRowY = 0.815;

    const levelBtns = [];
    for (const cfg of topRowConfigs) {
      const btn = new ButtonBase(
        p,
        " ",
        cfg.x * p.width,
        topRowY * p.height,
        () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, `easy_level${cfg.num}`);
        },
        cfg.cls,
      );
      btn.btn.style("width", cfg.w * p.width + "px");
      btn.btn.style("height", 0.048 * p.height + "px");
      btn.btn.mouseOver(() => this.levelInfo?.setActiveLevel(cfg.num));
      btn.btn.mouseOut(() => this.levelInfo?.setActiveLevel(null));
      this.addElement(btn);
      levelBtns.push({
        btn: btn.btn,
        callback: () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, `easy_level${cfg.num}`);
        },
      });
    }

    for (const cfg of bottomRowConfigs) {
      const btn = new ButtonBase(
        p,
        " ",
        cfg.x * p.width,
        bottomRowY * p.height,
        () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, `easy_level${cfg.num}`);
        },
        cfg.cls,
      );
      btn.btn.style("width", cfg.w * p.width + "px");
      btn.btn.style("height", 0.048 * p.height + "px");
      btn.btn.mouseOver(() => this.levelInfo?.setActiveLevel(cfg.num));
      btn.btn.mouseOut(() => this.levelInfo?.setActiveLevel(null));
      this.addElement(btn);
      levelBtns.push({
        btn: btn.btn,
        callback: () => {
          this.eventBus.publish(EventTypes.LOAD_LEVEL, `easy_level${cfg.num}`);
        },
      });
    }

    // Progress markers (drawn on canvas only; button layout is untouched).
    // 进度标记（只画在画布上，不改按钮布局）。
    const current = LevelProgress.getCurrent();
    this._markers = [
      ...topRowConfigs.map((c) => ({ c, y: topRowY })),
      ...bottomRowConfigs.map((c) => ({ c, y: bottomRowY })),
    ].map(({ c, y }) => {
      const id = `easy_level${c.num}`;
      const state = LevelProgress.isCompleted(id)
        ? "done"
        : id === current
          ? "current"
          : "locked";
      return {
        state,
        x: c.x * p.width,
        y: y * p.height,
        w: c.w * p.width,
        h: 0.048 * p.height,
      };
    });

    this.registerNavButtons(levelBtns, {
      layout: "grid",
      cols: 5,
      rows: 2,
      onEsc: () => this.switcher.showWorldSelect(p),
    });

    const followerX = p.width * 0.5;
    const followerY = p.height * 0.115;
    const followerR = 0.04 * p.width;
    const followerSize = 80;
    const followerMoveRadius = 0.033 * p.width;
    this.follower = new FollowImage(
      p,
      Assets.followerImg1,
      followerX,
      followerY,
      followerR,
      followerSize,
      Assets.followerCircleImg,
      followerSize,
      followerMoveRadius,
    );

    this.levelInfo = new LevelInfo(
      p,
      followerX,
      followerY + 15,
      followerR + 150,
      "easy_level",
    );
  }

  update() {
    if (this.follower) this.follower.update();
    if (this.levelInfo) this.levelInfo.update();
  }

  draw() {
    const p = this.p;
    if (Assets.bgImageLevelChoice) {
      p.image(Assets.bgImageLevelChoice, 0, 0, p.width, p.height);
    } else {
      p.background(200, 255, 200);
    }
    this._drawMarkers(p);
    if (this.levelInfo) this.levelInfo.draw();
    if (this.follower) this.follower.draw();
  }

  _drawMarkers(p) {
    if (!this._markers) return;
    const pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.08);
    p.push();
    for (const m of this._markers) {
      const cx = m.x + m.w / 2;
      const cy = m.y + m.h / 2;
      if (m.state === "current") {
        p.noFill();
        p.stroke(255, 220, 110, 120 + 135 * pulse);
        p.strokeWeight(3);
        p.rect(m.x - 4, m.y - 4, m.w + 8, m.h + 8, 8);
      } else if (m.state === "done") {
        const bx = m.x + m.w;
        const by = m.y;
        p.noStroke();
        p.fill(90, 190, 120);
        p.circle(bx, by, 20);
        p.stroke(255);
        p.strokeWeight(2.5);
        p.noFill();
        p.line(bx - 5, by, bx - 1, by + 4);
        p.line(bx - 1, by + 4, bx + 6, by - 4);
      } else {
        // locked: small padlock, still playable
        p.noStroke();
        p.fill(40, 40, 55, 150);
        p.rect(m.x, m.y, m.w, m.h, 6);
        p.fill(210, 210, 225);
        p.rect(cx - 6, cy - 2, 12, 9, 2);
        p.noFill();
        p.stroke(210, 210, 225);
        p.strokeWeight(2);
        p.arc(cx, cy - 2, 9, 11, p.PI, p.TWO_PI);
      }
    }
    p.pop();
  }
}
