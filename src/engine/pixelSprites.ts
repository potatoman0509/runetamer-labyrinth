import {
  ANIM_FRAME_COUNT,
  getHdSpriteCanvas,
  getHdSpriteDataUrl,
} from './hdSprites';

export { ANIM_FRAME_COUNT };

export function getSpriteCanvas(
  key: string,
  scale = 2,
  flipX = false,
  silhouette = false,
  frameIndex = 0,
  equipKey?: string,
): HTMLCanvasElement {
  return getHdSpriteCanvas(key, scale, flipX, silhouette, frameIndex, equipKey);
}

export function getSpriteDataUrl(
  key: string,
  scale = 2,
  silhouette = false,
  equipKey?: string,
): string {
  return getHdSpriteDataUrl(key, scale, silhouette, equipKey);
}
