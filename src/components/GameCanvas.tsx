import { useEffect, useRef } from 'react';
import { renderBattleScene } from '../engine/battleRenderer';
import { renderDungeonMap, TILE_PIXEL_SIZE } from '../engine/mapRenderer';
import type { BattleState, DungeonMap } from '../game/types';

interface GameCanvasProps {
  map: DungeonMap;
  battle: BattleState | null;
  targetTile: { x: number; y: number } | null;
  heroFacingLeft: boolean;
  selectedEnemyUid: string | null;
  onMapTap: (tileX: number, tileY: number) => void;
  onEnemyTap: (enemyUid: string) => void;
}

export function GameCanvas({
  map,
  battle,
  targetTile,
  heroFacingLeft,
  selectedEnemyUid,
  onMapTap,
  onEnemyTap,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<{ x: number; y: number }>({
    x: map.playerX * TILE_PIXEL_SIZE,
    y: map.playerY * TILE_PIXEL_SIZE,
  });
  const lastCamRef = useRef<{ camX: number; camY: number }>({ camX: 0, camY: 0 });
  const battleAnchorsRef = useRef<Map<string, { x: number; y: number; scale: number }>>(
    new Map(),
  );

  const lastMapKeyRef = useRef<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const targetW = Math.max(280, Math.floor(rect.width));
      const targetH = Math.max(180, Math.floor(rect.height));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const frame = (timeMs: number) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const mapKey = `${map.biome}_${map.floor}`;
        if (lastMapKeyRef.current !== mapKey) {
          lastMapKeyRef.current = mapKey;
          cameraRef.current.x =
            map.playerX * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2 - canvas.width / 2;
          cameraRef.current.y =
            map.playerY * TILE_PIXEL_SIZE + TILE_PIXEL_SIZE / 2 - canvas.height / 2;
        }
        if (battle) {
          battleAnchorsRef.current = renderBattleScene(
            ctx,
            canvas.width,
            canvas.height,
            battle,
            timeMs,
            selectedEnemyUid,
          );
        } else {
          lastCamRef.current = renderDungeonMap(ctx, canvas.width, canvas.height, {
            map,
            timeMs,
            targetTile,
            heroFacingLeft,
            cameraRef: cameraRef.current,
          });
        }
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [map, battle, targetTile, heroFacingLeft, selectedEnemyUid]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (battle) {
      // Hit test enemies for manual target selection
      for (const enemy of battle.enemies) {
        if (enemy.hp <= 0) continue;
        const pos = battleAnchorsRef.current.get(enemy.uid);
        if (!pos) continue;
        const radius = pos.scale * 10;
        if (Math.hypot(cx - pos.x, cy - pos.y) <= radius) {
          onEnemyTap(enemy.uid);
          return;
        }
      }
      return;
    }

    const tileX = Math.floor((cx + lastCamRef.current.camX) / TILE_PIXEL_SIZE);
    const tileY = Math.floor((cy + lastCamRef.current.camY) / TILE_PIXEL_SIZE);
    if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
      onMapTap(tileX, tileY);
    }
  };

  return (
    <canvas
      id="game-stage-canvas"
      ref={canvasRef}
      className="stage-canvas"
      onPointerDown={handlePointerDown}
    />
  );
}
