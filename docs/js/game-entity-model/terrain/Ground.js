import { GameEntity } from "../base/GameEntity.js";
import { RectangleCollider } from "../../collision-system/CollideComponent.js";
import {
  ColliderShape,
  ColliderType,
} from "../../collision-system/enumerator.js";
import { TerrainRenderer } from "./TerrainRenderer.js";

export class Ground extends GameEntity {
  constructor(x, y, w, h, isPlatform = false) {
    super(x, y);
    this.type = "ground";
    this.zIndex = -10;
    this.movementComponent = null;
    this.collider = new RectangleCollider(ColliderType.STATIC, w, h);
    this.isPlatform = isPlatform;
  }

  draw(p) {
    // Extend ground visually so the tile remains visible when the camera pans slightly
    // 地面做可视延申，镜头轻微拉动时仍显示贴图而不是空白边缘
    const overdrawX =
      !this.isPlatform && this.collider.w >= p.width - 2 ? 96 : 0;
    TerrainRenderer.drawEntity(p, this, {
      platform: this.isPlatform,
      overdrawX,
    });
  }
}
