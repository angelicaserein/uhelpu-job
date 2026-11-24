import { GameEntity } from "./GameEntity.js";
import { RectangleCollider } from "../../collision-system/CollideComponent.js";
import { ColliderType } from "../../collision-system/enumerator.js";
import { TerrainRenderer } from "../terrain/TerrainRenderer.js";

export class BasePlatform extends GameEntity {
  constructor(x, y, w, h, options = {}) {
    super(x, y);
    this.type = "platform";
    this.zIndex = -10;
    this.movementComponent = null;
    this.collider = new RectangleCollider(ColliderType.STATIC, w, h);

    this.isOneWay = options.isOneWay ?? false;
    this.isMovable = options.isMovable ?? false;
  }

  update(dt) {
    // Hook for moving platform behavior in subclasses.
    // 子类中移动平台行为的钉子方法。
  }

  draw(p) {
    TerrainRenderer.drawEntity(p, this, { platform: true });
  }
}
