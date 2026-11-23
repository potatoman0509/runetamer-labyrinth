import { useEffect, useRef } from 'react';
import { renderBattleScene } from '../engine/battleRenderer';
import { renderExpeditionScene } from '../engine/sceneRenderer';
import type { ExpeditionState } from '../game/expedition';
import type { BattleState, GameSave } from '../game/types';

interface GameCanvasProps {
  expedition: ExpeditionState;
  save: GameSave;
  battle: BattleState | null;
  selectedEnemyUid: string | null;
  onEnemyTap: (enemyUid: string) => void;
}

export function GameCanvas({
  expedition,
  save,
  battle,
  selectedEnemyUid,
  onEnemyTap,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<{ offset: number }>({ offset: 0 });
  const battleAnchorsRef = useRef<Map<string, { x: number; y: number; scale: number }>>(
    new Map(),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const targetW = Math.max(200, Math.floor(rect.width));
      const targetH = Math.max(140, Math.floor(rect.height));
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
          renderExpeditionScene(
            ctx,
            canvas.width,
            canvas.height,
            expedition,
            save,
            timeMs,
            scrollRef.current,
          );
        }
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [battle, expedition, save, selectedEnemyUid]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!battle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

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
