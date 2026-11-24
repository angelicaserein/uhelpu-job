import { GameEntity } from "../base/GameEntity.js";
import { RectangleCollider } from "../../collision-system/CollideComponent.js";
import {
  ColliderShape,
  ColliderType,
} from "../../collision-system/enumerator.js";
import { TerrainRenderer } from "./TerrainRenderer.js";

export class Wall extends GameEntity {
  constructor(x, y, w, h) {
    super(x, y);
    this.type = "wall";
    this.zIndex = -10;
    this.movementComponent = null;
    this.collider = new RectangleCollider(ColliderType.STATIC, w, h);
  }

  draw(p) {
    TerrainRenderer.drawEntity(p, this);
  }
}
