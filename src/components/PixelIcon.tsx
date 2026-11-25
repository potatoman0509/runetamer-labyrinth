import { useMemo } from 'react';
import { getSpriteDataUrl } from '../engine/pixelSprites';

interface PixelIconProps {
  spriteKey: string;
  size?: number;
  silhouette?: boolean;
  equipKey?: string;
  alt?: string;
}

export function PixelIcon({
  spriteKey,
  size = 32,
  silhouette = false,
  equipKey,
  alt = '',
}: PixelIconProps) {
  const src = useMemo(
    () => getSpriteDataUrl(spriteKey, 2, silhouette, equipKey),
    [spriteKey, silhouette, equipKey],
  );

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="pixel-img"
      draggable={false}
    />
  );
}
