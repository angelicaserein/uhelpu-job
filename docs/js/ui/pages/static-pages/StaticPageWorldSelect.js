import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { BackButton } from "../../components/BackButton.js";
import { Assets } from "../../../AssetsManager.js";
import { t, i18n } from "../../../i18n/index.js";
import "../../../i18n/i18nUserLevel.js";
import { AudioManager } from "../../../AudioManager.js";
import { EventTypes } from "../../../event-system/EventTypes.js";

export class StaticPageWorldSelect extends PageBase {
  constructor(switcher, p, eventBus) {
    super(switcher);
    this.p = p;
    this.eventBus = eventBus;
  }

  enter() {
    super.enter();

    const p = this.p;

    AudioManager.playBGM("levelChoice");

    const backBtn = new BackButton(p, () => this.switcher.showMainMenu(p));
    this.addElement(backBtn);

    // 世界按钮配置（主区域难度入口）
    const worlds = [
      {
        cls: "world-button world-button-2 world-mode-button",
        label: t("world_easy"),
        action: () => this.switcher.showLevelChoiceEasy(p),
      },
      {
        cls: "world-button world-button-2 world-mode-button",
        label: t("world_difficult"),
        action: () => this.switcher.showLevelChoiceHard(p),
      },
      {
        cls: "world-button world-button-2 world-mode-button",
        label: t("world_special"),
        action: () => this.switcher.showLevelChoiceSpecial(p),
      },
      {
        cls: "world-button world-button-2 world-mode-button",
        label: t("user_level_button_label"),
        action: () =>
          this.eventBus.publish(EventTypes.LOAD_LEVEL, {
            levelType: "emptyEditor",
          }),
      },
    ];

    // 2x2 grid layout for world buttons
    const cardSize = 0.3 * p.height; // Square card size
    const cardGap = 0.04 * p.height; // Gap between cards
    const gridTotalSize = cardSize * 2 + cardGap; // Width and height of 2x2 grid
    const gridStartX = (p.width - gridTotalSize) / 2;
    const gridStartY = 0.22 * p.height; // Start from 22% down the screen

    const worldBtns = [];
    for (const [index, w] of worlds.entries()) {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const btnX = gridStartX + col * (cardSize + cardGap);
      const btnY = gridStartY + row * (cardSize + cardGap);

      const btn = new ButtonBase(
        p,
        w.label,
        btnX,
        btnY,
        () => {
          w.action();
        },
        w.cls,
      );
      btn.btn.style("width", cardSize + "px");
      btn.btn.style("height", cardSize + "px");
      this.addElement(btn);
      worldBtns.push({
        btn: btn.btn,
        callback: () => w.action(),
      });
    }

    // 注册键盘导航（仅 BackButton + 主区域 2x2 世界按钮）
    this.registerNavButtons(
      [
        {
          btn: backBtn.btn,
          callback: () => this.switcher.showMainMenu(p),
        },
        ...worldBtns,
      ],
      {
        layout: "spatial",
        onEsc: () => this.switcher.showMainMenu(p),
      },
    );
  }

  update() {}

  draw() {
    const p = this.p;
    p.background(30, 15, 50);
    if (Assets.bgImageWorldSelect) {
      p.image(Assets.bgImageWorldSelect, 0, 0, p.width, p.height);
    }
  }
}
