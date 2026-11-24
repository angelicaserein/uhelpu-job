import { PageBase } from "../PageBase.js";
import { Assets } from "../../../AssetsManager.js";
import { EventTypes } from "../../../event-system/EventTypes.js";
import { i18n } from "../../../i18n/index.js";

function makePanel(glyph, name, hint) {
  return (
    `<div class="lang-card">` +
    `<div class="lang-card-glyph">${glyph}</div>` +
    `<div class="lang-card-name">${name}</div>` +
    `<div class="lang-card-hint">${hint}</div>` +
    `</div>`
  );
}

export class LanguageChoice extends PageBase {
  constructor(switcher, p) {
    super(switcher);
    this.p = p;
  }

  _getPageCopy() {
    return {
      enLabel: "ENGLISH",
      zhLabel: "中 文",
      enSelectHint: "Click to select",
      zhSelectHint: "点击选择",
      footerHint:
        "You can change the language anytime in Settings.<br>你可以随时在设置里调整语言。",
      title: "Select Language",
      titleZh: "请选择语言",
    };
  }

  // 首次：选完语言直接进第一关；之后再来：去选关卡页面
  _enterFirstLevel() {
    const KEY = "kinoko_first_level_entered";
    const bus = this.switcher.eventBus;
    if (localStorage.getItem(KEY) || !bus) {
      this.switcher.showLevelChoiceEasy(this.p);
      return;
    }
    localStorage.setItem(KEY, "1");
    bus.publish(EventTypes.LOAD_LEVEL, "easy_level1");
  }

  enter() {
    super.enter();

    const p = this.p;
    const copy = this._getPageCopy();

    // 检查 localStorage 中是否有保存的语言
    const savedLang = localStorage.getItem("kinoko_lang");

    if (savedLang) {
      // 已保存语言，直接进入游戏，跳过语言选择
      console.log("[LanguageChoice] Found saved language, skipping to game");
      i18n.setLang(savedLang);
      this._enterFirstLevel();
      return;
    }

    // 没有保存数据，显示语言选择

    // 左侧：英语
    const enPanel = p.createDiv(makePanel("Aa", "English", copy.enSelectHint));
    enPanel.addClass("language-panel lang-panel-left");
    enPanel.mouseClicked(() => {
      i18n.setLang("en");
      this._enterFirstLevel();
    });
    this.addElement(enPanel);

    // 右侧：中文
    const zhPanel = p.createDiv(makePanel("文", "中文", copy.zhSelectHint));
    zhPanel.addClass("language-panel lang-panel-right");
    zhPanel.mouseClicked(() => {
      i18n.setLang("zh");
      this._enterFirstLevel();
    });
    this.addElement(zhPanel);

    // 注册键盘导航（支持 Left/Right 箭键选择语言）
    this.registerNavButtons(
      [
        {
          btn: enPanel,
          callback: () => {
            i18n.setLang("en");
            this._enterFirstLevel();
          },
        },
        {
          btn: zhPanel,
          callback: () => {
            i18n.setLang("zh");
            this._enterFirstLevel();
          },
        },
      ],
      {
        layout: "horizontal",
        onEsc: () => this.switcher.showMainMenu(p),
      },
    );

    // 标题
    const title = p.createDiv(
      `<div class="lang-title-en">${copy.title}</div>` +
        `<div class="lang-title-zh">${copy.titleZh}</div>`,
    );
    title.addClass("lang-title");
    this.addElement(title);

    // 底部小提示
    const hint = p.createDiv(copy.footerHint);
    hint.addClass("lang-footer");
    this.addElement(hint);
  }

  draw() {
    const p = this.p;
    if (Assets.bgImageLanguageChoice) {
      p.image(Assets.bgImageLanguageChoice, 0, 0, p.width, p.height);
    } else {
      p.background(20, 10, 40);
    }
    // 压暗背景，让前景内容更突出
    p.push();
    p.resetMatrix();
    p.noStroke();
    p.fill(18, 8, 30, 205);
    p.rect(0, 0, p.width, p.height);
    p.pop();
  }
}
