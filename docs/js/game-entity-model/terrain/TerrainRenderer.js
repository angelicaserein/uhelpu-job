import { Assets } from "../../AssetsManager.js";

/**
 * 地形统一绘制：Ground / Wall / Platform 共用的无缝金属板贴图。
 *
 * 1. 内部填充贴图按「世界坐标」对齐平铺，相邻地形的纹理自动接上，没有一格一格的边框。
 * 2. 外轮廓只画在「露在外面」的边上：Ground 与 Wall 相接的部分不画轮廓，
 *    连成一整块。Platform（可站立的悬空平台）始终画完整轮廓，保证看得出来。
 * 3. 要换风格：替换 assets/images/tiles/metal_fill.png（需上下左右都能首尾相接，
 *    不带边框），轮廓颜色在下面的 COLORS 里改。
 *
 * 坐标约定：世界坐标 y 轴向上；实体 (x, y) 是左下角，(w, h) 是尺寸。
 */

const OUTLINE = 5; // 深色外轮廓粗细 (px)
const BEVEL = 2; // 轮廓内侧的浅色高光线 (px)
const PLATFORM_CAP = 4; // 平台顶部浅色盖边 (px)
const EPS = 0.5;

const COLORS = {
  outline: [44, 26, 54],
  bevel: [176, 128, 168],
  platformCap: [206, 184, 232],
  fallback: [140, 108, 140],
};

// 参与合并的地形（Ground 与 Wall）以及它们露在外面的边
let _signature = null;
let _edges = new Map(); // entity -> { top, bottom, left, right } 每项是世界坐标区间 [[a,b],...]

function isMergeable(e) {
  return (
    (e.type === "ground" || e.type === "wall") &&
    !e.isPlatform &&
    e.collider &&
    Number.isFinite(e.collider.w) &&
    Number.isFinite(e.collider.h)
  );
}

function rect(e) {
  return {
    x1: e.x,
    y1: e.y,
    x2: e.x + e.collider.w,
    y2: e.y + e.collider.h,
  };
}

// 从 [lo, hi] 中减去一组区间，返回剩余区间
function subtract(lo, hi, covers) {
  const sorted = covers
    .filter(([a, b]) => b > lo && a < hi)
    .sort((m, n) => m[0] - n[0]);
  const out = [];
  let cur = lo;
  for (const [a, b] of sorted) {
    if (a > cur) out.push([cur, Math.min(a, hi)]);
    cur = Math.max(cur, b);
    if (cur >= hi) break;
  }
  if (cur < hi) out.push([cur, hi]);
  return out.filter(([a, b]) => b - a > 0.01);
}

function computeEdges(list) {
  const rects = list.map(rect);
  const result = new Map();
  for (let i = 0; i < list.length; i++) {
    const r = rects[i];
    const cov = { top: [], bottom: [], left: [], right: [] };
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const n = rects[j];
      const ox = [Math.max(r.x1, n.x1), Math.min(r.x2, n.x2)];
      const oy = [Math.max(r.y1, n.y1), Math.min(r.y2, n.y2)];
      if (n.y2 >= r.y2 + EPS && n.y1 <= r.y2 + EPS && ox[1] > ox[0])
        cov.top.push(ox);
      if (n.y1 <= r.y1 - EPS && n.y2 >= r.y1 - EPS && ox[1] > ox[0])
        cov.bottom.push(ox);
      if (n.x1 <= r.x1 - EPS && n.x2 >= r.x1 - EPS && oy[1] > oy[0])
        cov.left.push(oy);
      if (n.x2 >= r.x2 + EPS && n.x1 <= r.x2 + EPS && oy[1] > oy[0])
        cov.right.push(oy);
    }
    result.set(list[i], {
      top: subtract(r.x1, r.x2, cov.top),
      bottom: subtract(r.x1, r.x2, cov.bottom),
      left: subtract(r.y1, r.y2, cov.left),
      right: subtract(r.y1, r.y2, cov.right),
    });
  }
  return result;
}

export const TerrainRenderer = {
  /**
   * 每帧在绘制前调用一次。只有地形的数量或位置变化时才会重新计算（编辑器里增删/移动方块也能即时更新）。
   * @param {Iterable} entities - 当前关卡的全部实体
   */
  prepare(entities) {
    if (!entities) return;
    const list = [];
    for (const e of entities) if (isMergeable(e)) list.push(e);

    let sig = list.length;
    for (const e of list) {
      sig =
        (sig * 31 +
          Math.round(e.x * 4) * 7 +
          Math.round(e.y * 4) * 13 +
          Math.round(e.collider.w * 4) * 17 +
          Math.round(e.collider.h * 4) * 19) %
        2147483647;
    }
    if (sig === _signature && _edges.size === list.length) return;
    _signature = sig;
    _edges = computeEdges(list);
  },

  /**
   * 绘制一个地形实体。
   * @param {object} p
   * @param {object} entity
   * @param {object} [opts]
   * @param {boolean} [opts.platform]   平台：不合并、始终画完整轮廓并带浅色盖边
   * @param {number}  [opts.overdrawX]  左右各多画多少像素（整屏宽地面用）
   */
  drawEntity(p, entity, opts = {}) {
    const platform = !!opts.platform;
    const overdraw = opts.overdrawX || 0;
    const w = entity.collider.w;
    const h = entity.collider.h;
    const tile = Assets.tileImage_metalFill;

    const drawX = Math.round(entity.x - overdraw);
    const drawW = Math.round(w + overdraw * 2);
    const rh = Math.round(h);

    if (!tile) {
      p.fill(...COLORS.fallback);
      p.noStroke();
      p.rect(drawX, entity.y, drawW, h);
      return;
    }

    // 露在外面的边；平台、未参与合并的实体：四条边全部露出
    const merged = !platform ? _edges.get(entity) : null;
    const x1 = entity.x;
    const x2 = entity.x + w;
    const y1 = entity.y;
    const y2 = entity.y + h;
    const edges = merged || {
      top: [[x1, x2]],
      bottom: [[x1, x2]],
      left: [[y1, y2]],
      right: [[y1, y2]],
    };

    p.push();
    p.translate(drawX, Math.round(entity.y + h));
    p.scale(1, -1); // 局部坐标：原点在实体左上角，y 向下

    // ---- 1. 内部填充：按世界坐标对齐平铺 ----
    const tw = tile.width;
    const th = tile.height;
    const worldTopD = -Math.round(entity.y + h); // y 向下的世界坐标
    for (
      let wy = Math.floor(worldTopD / th) * th;
      wy < worldTopD + rh;
      wy += th
    ) {
      const y0 = Math.max(wy, worldTopD);
      const y1d = Math.min(wy + th, worldTopD + rh);
      if (y1d <= y0) continue;
      for (let wx = Math.floor(drawX / tw) * tw; wx < drawX + drawW; wx += tw) {
        const x0 = Math.max(wx, drawX);
        const x1d = Math.min(wx + tw, drawX + drawW);
        if (x1d <= x0) continue;
        p.image(
          tile,
          x0 - drawX,
          y0 - worldTopD,
          x1d - x0,
          y1d - y0,
          x0 - wx,
          y0 - wy,
          x1d - x0,
          y1d - y0,
        );
      }
    }

    // ---- 2. 外轮廓：只画露在外面的边 ----
    p.noStroke();
    const band = (lx, ly, lw, lh, color) => {
      p.fill(...color);
      p.rect(lx, ly, lw, lh);
    };
    const edgeBands = (isTop, isBottom, isLeft, isRight, a, b) => {
      // a,b：局部坐标下的区间
      const len = b - a;
      if (len <= 0) return;
      if (isTop) {
        band(a, 0, len, OUTLINE, COLORS.outline);
        band(a, OUTLINE, len, BEVEL, COLORS.bevel);
      } else if (isBottom) {
        band(a, rh - OUTLINE, len, OUTLINE, COLORS.outline);
        band(a, rh - OUTLINE - BEVEL, len, BEVEL, COLORS.bevel);
      } else if (isLeft) {
        band(0, a, OUTLINE, len, COLORS.outline);
        band(OUTLINE, a, BEVEL, len, COLORS.bevel);
      } else if (isRight) {
        band(drawW - OUTLINE, a, OUTLINE, len, COLORS.outline);
        band(drawW - OUTLINE - BEVEL, a, BEVEL, len, COLORS.bevel);
      }
    };

    for (const [a, b] of edges.top) {
      let la = a - drawX - 0;
      let lb = b - drawX;
      if (overdraw && a <= x1 + EPS) la = 0;
      if (overdraw && b >= x2 - EPS) lb = drawW;
      edgeBands(true, false, false, false, Math.round(la), Math.round(lb));
      if (platform) {
        band(
          Math.round(la),
          OUTLINE + BEVEL,
          Math.round(lb) - Math.round(la),
          PLATFORM_CAP,
          COLORS.platformCap,
        );
      }
    }
    for (const [a, b] of edges.bottom) {
      let la = a - drawX;
      let lb = b - drawX;
      if (overdraw && a <= x1 + EPS) la = 0;
      if (overdraw && b >= x2 - EPS) lb = drawW;
      edgeBands(false, true, false, false, Math.round(la), Math.round(lb));
    }
    if (!overdraw) {
      for (const [a, b] of edges.left) {
        edgeBands(
          false,
          false,
          true,
          false,
          Math.round(y2 - b),
          Math.round(y2 - a),
        );
      }
      for (const [a, b] of edges.right) {
        edgeBands(
          false,
          false,
          false,
          true,
          Math.round(y2 - b),
          Math.round(y2 - a),
        );
      }
    }

    p.pop();
  },
};
