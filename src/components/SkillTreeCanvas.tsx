import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import {
  BRANCH_META,
  canRefundSkillNode,
  canUpgradeSkillNode,
  computeSkillTreeBonuses,
  getAvailableSp,
  getSpentSp,
  getTotalEarnedSp,
  isNodeAllocated,
  ORIGIN_NODE_ID,
  SKILL_NODE_MAP,
  SKILL_TREE_CANVAS_SIZE,
  SKILL_TREE_CENTER,
  SKILL_TREE_EDGES,
  SKILL_TREE_NODES,
  type SkillBranch,
  type SkillTreeNodeDef,
} from '../game/skillTree';
import type { GameSave } from '../game/types';

interface SkillTreeCanvasProps {
  save: GameSave;
  onUpgradeSkillNode: (nodeId: string) => void;
  onRefundSkillNode: (nodeId: string) => void;
  onResetSkillTree: () => void;
}

const BRANCH_ORDER: SkillBranch[] = ['sword', 'assassin', 'void', 'magic', 'alchemy', 'command'];

function nodeRadius(node: SkillTreeNodeDef): number {
  if (node.kind === 'origin') return 26;
  if (node.kind === 'keystone') return 24;
  if (node.kind === 'skill') return 20;
  if (node.kind === 'notable') return 17;
  return 12;
}

function nodeColor(node: SkillTreeNodeDef): string {
  if (node.branch === 'origin') return '#ffe570';
  return BRANCH_META[node.branch].color;
}

export function SkillTreeCanvas({
  save,
  onUpgradeSkillNode,
  onRefundSkillNode,
  onResetSkillTree,
}: SkillTreeCanvasProps) {
  const [selectedId, setSelectedId] = useState<string>('sw_entry');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState({ cx: SKILL_TREE_CENTER, cy: SKILL_TREE_CENTER, zoom: 1.45 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origCx: number;
    origCy: number;
    moved: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const availableSp = getAvailableSp(save);
  const totalSp = getTotalEarnedSp(save);
  const spentSp = getSpentSp(save);
  const bonuses = useMemo(() => computeSkillTreeBonuses(save), [save]);

  const query = searchQuery.trim().toLowerCase();
  const matchedNodeIds = useMemo(() => {
    if (!query) return new Set<string>();
    const set = new Set<string>();
    for (const n of SKILL_TREE_NODES) {
      const hay = `${n.name} ${n.desc} ${n.upside ?? ''} ${n.downside ?? ''}`.toLowerCase();
      if (hay.includes(query)) set.add(n.id);
    }
    return set;
  }, [query]);

  const selectedNode = SKILL_NODE_MAP[selectedId] ?? SKILL_NODE_MAP[ORIGIN_NODE_ID]!;
  const selectedLv =
    selectedNode.kind === 'origin' ? 1 : (save.heroSkillTree[selectedNode.id] ?? 0);
  const canUp = canUpgradeSkillNode(save, selectedNode.id);
  const canRef = canRefundSkillNode(save, selectedNode.id);

  // ViewBox centered on (view.cx, view.cy) with width/height = SKILL_TREE_CANVAS_SIZE / zoom
  const vbSize = SKILL_TREE_CANVAS_SIZE / view.zoom;
  const vbX = view.cx - vbSize / 2;
  const vbY = view.cy - vbSize / 2;

  const clampCenter = (cx: number, cy: number) => ({
    cx: Math.max(120, Math.min(SKILL_TREE_CANVAS_SIZE - 120, cx)),
    cy: Math.max(120, Math.min(SKILL_TREE_CANVAS_SIZE - 120, cy)),
  });

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origCx: view.cx,
      origCy: view.cy,
      moved: false,
    };
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || !svgRef.current) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      d.moved = true;
    }
    if (!d.moved) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = vbSize / Math.max(1, rect.width);
    const scaleY = vbSize / Math.max(1, rect.height);
    const next = clampCenter(d.origCx - dx * scaleX, d.origCy - dy * scaleY);
    setView((v) => ({ ...v, cx: next.cx, cy: next.cy }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setView((v) => ({ ...v, zoom: Math.max(0.82, Math.min(3.4, v.zoom * factor)) }));
  };

  const focusBranch = (branch: SkillBranch) => {
    const rad = (BRANCH_META[branch].angleDeg * Math.PI) / 180;
    const cx = SKILL_TREE_CENTER + Math.cos(rad) * 390;
    const cy = SKILL_TREE_CENTER + Math.sin(rad) * 390;
    setView({ cx, cy, zoom: 1.7 });
  };

  const zoomBy = (factor: number) => {
    setView((v) => ({ ...v, zoom: Math.max(0.82, Math.min(3.4, v.zoom * factor)) }));
  };

  const activeKeystoneNodes = useMemo(
    () =>
      bonuses.activeKeystones
        .map((kid) => SKILL_TREE_NODES.find((n) => n.keystoneId === kid))
        .filter((n): n is SkillTreeNodeDef => Boolean(n)),
    [bonuses.activeKeystones],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {/* Header Summary Card */}
      <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-pixel)', color: '#ffe570' }}>
              🌌 ルーン星座盤・全{SKILL_TREE_NODES.length}ノード
            </div>
            <div className="muted-text" style={{ fontSize: 9 }}>
              残りSP <strong style={{ color: '#82ff9e' }}>{availableSp}</strong> / 計{totalSp}・使用{spentSp}
            </div>
          </div>
          <button
            id="btn-reset-skilltree"
            type="button"
            className="rpg-btn sm danger"
            disabled={spentSp === 0}
            onClick={onResetSkillTree}
          >
            全リセット
          </button>
        </div>

        {/* Search + Zoom Controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            id="input-skilltree-search"
            type="text"
            className="skill-search-input"
            placeholder="検索: 会心・貫通・仲間・MF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            className="rpg-btn sm"
            style={{ padding: '3px 6px', fontSize: 10 }}
            onClick={() => zoomBy(1.25)}
            aria-label="拡大"
          >
            ＋
          </button>
          <button
            type="button"
            className="rpg-btn sm"
            style={{ padding: '3px 6px', fontSize: 10 }}
            onClick={() => zoomBy(0.8)}
            aria-label="縮小"
          >
            －
          </button>
          <button
            type="button"
            className="rpg-btn sm"
            style={{ padding: '3px 5px', fontSize: 9 }}
            onClick={() => setView({ cx: SKILL_TREE_CENTER, cy: SKILL_TREE_CENTER, zoom: 0.94 })}
          >
            全体
          </button>
        </div>

        {/* 6-Cluster Quick Jump Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 2 }}>
          {BRANCH_ORDER.map((b) => (
            <button
              key={b}
              type="button"
              className="rpg-btn sm"
              style={{
                padding: '3px 1px',
                fontSize: 8.5,
                borderColor: BRANCH_META[b].color,
                color: '#fff7e0',
              }}
              onClick={() => focusBranch(b)}
            >
              {BRANCH_META[b].shortLabel}
            </button>
          ))}
        </div>

        {/* Active Keystones Strip */}
        {activeKeystoneNodes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {activeKeystoneNodes.map((ks) => (
              <button
                key={ks.id}
                type="button"
                onClick={() => {
                  setSelectedId(ks.id);
                  setView({ cx: ks.x, cy: ks.y, zoom: 2.1 });
                }}
                style={{
                  fontSize: 8.5,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'rgba(130, 32, 48, 0.85)',
                  border: '1px solid #ff94a8',
                  color: '#ffe570',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-pixel)',
                }}
              >
                ◆ {ks.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Constellation SVG Canvas */}
      <div className="skill-constellation-box">
        <svg
          ref={svgRef}
          id="skill-tree-svg"
          viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
          className="skill-constellation-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Decorative Starfield Rings */}
          <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={130} fill="none" stroke="rgba(255,229,112,0.08)" strokeWidth={2} />
          <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={315} fill="none" stroke="rgba(255,229,112,0.08)" strokeWidth={2} strokeDasharray="8 8" />
          <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={540} fill="none" stroke="rgba(255,229,112,0.07)" strokeWidth={2} strokeDasharray="10 10" />
          <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={730} fill="none" stroke="rgba(255,148,168,0.08)" strokeWidth={3} />

          {/* Edges */}
          {SKILL_TREE_EDGES.map(([uId, vId]) => {
            const u = SKILL_NODE_MAP[uId]!;
            const v = SKILL_NODE_MAP[vId]!;
            const uAlloc = isNodeAllocated(save.heroSkillTree, uId);
            const vAlloc = isNodeAllocated(save.heroSkillTree, vId);
            const bothAlloc = uAlloc && vAlloc;
            const frontier = uAlloc !== vAlloc;
            return (
              <line
                key={`${uId}-${vId}`}
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                stroke={
                  bothAlloc
                    ? '#ffd966'
                    : frontier
                      ? 'rgba(130, 255, 158, 0.55)'
                      : 'rgba(138, 148, 180, 0.28)'
                }
                strokeWidth={bothAlloc ? 5 : frontier ? 3.5 : 2.2}
                strokeDasharray={frontier ? '7 5' : undefined}
              />
            );
          })}

          {/* Nodes */}
          {SKILL_TREE_NODES.map((node) => {
            const lv = node.kind === 'origin' ? 1 : (save.heroSkillTree[node.id] ?? 0);
            const allocated = lv > 0;
            const upgradeable = canUpgradeSkillNode(save, node.id);
            const isSelected = node.id === selectedNode.id;
            const isMatched = matchedNodeIds.has(node.id);
            const r = nodeRadius(node);
            const color = nodeColor(node);
            const fill = allocated
              ? color
              : upgradeable
                ? '#2d3f36'
                : '#1b1a28';
            const stroke = isSelected
              ? '#ffffff'
              : isMatched
                ? '#ffe570'
                : allocated
                  ? '#fff3c4'
                  : upgradeable
                    ? '#82ff9e'
                    : 'rgba(160, 170, 200, 0.45)';

            const onNodeClick = () => {
              if (dragRef.current?.moved) return;
              setSelectedId(node.id);
            };

            return (
              <g
                key={node.id}
                id={`node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={onNodeClick}
                style={{ cursor: 'pointer' }}
              >
                {isMatched && (
                  <circle r={r + 9} fill="none" stroke="#ffe570" strokeWidth={4} opacity={0.85} />
                )}
                {isSelected && (
                  <circle r={r + 6} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.9} />
                )}
                {node.kind === 'keystone' ? (
                  <polygon
                    points={`0,${-r} ${r},0 0,${r} ${-r},0`}
                    fill={allocated ? '#b82a45' : '#2b1622'}
                    stroke={allocated ? '#ffe570' : stroke}
                    strokeWidth={allocated ? 4 : 3}
                  />
                ) : node.kind === 'skill' ? (
                  <rect
                    x={-r * 0.82}
                    y={-r * 0.82}
                    width={r * 1.64}
                    height={r * 1.64}
                    rx={4}
                    transform="rotate(45)"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={3}
                  />
                ) : (
                  <circle
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={node.kind === 'notable' || node.kind === 'origin' ? 3.5 : 2.2}
                  />
                )}
                <text
                  y={4}
                  textAnchor="middle"
                  fill={allocated ? '#14101c' : '#e8e4f5'}
                  fontSize={node.kind === 'keystone' ? 14 : node.kind === 'minor' ? 10 : 12}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.kind === 'origin'
                    ? '✦'
                    : node.kind === 'keystone'
                      ? '◆'
                      : node.kind === 'skill'
                        ? '★'
                        : node.maxLevel > 1
                          ? `${lv}/${node.maxLevel}`
                          : allocated
                            ? '✓'
                            : '○'}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="skill-constellation-hint">
          ドラッグで移動・タップで選択{query ? `・一致${matchedNodeIds.size}件` : ''}
        </div>
      </div>

      {/* Selected Node Inspector */}
      <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span
              style={{
                fontSize: 8.5,
                padding: '1px 5px',
                borderRadius: 4,
                background:
                  selectedNode.kind === 'keystone'
                    ? '#b82a45'
                    : selectedNode.kind === 'skill'
                      ? '#3b6ea8'
                      : selectedNode.kind === 'notable'
                        ? '#a8741e'
                        : '#3e3854',
                color: '#fff',
                fontFamily: 'var(--font-pixel)',
                flexShrink: 0,
              }}
            >
              {selectedNode.kind === 'origin'
                ? '始原'
                : selectedNode.kind === 'keystone'
                  ? 'キーストーン'
                  : selectedNode.kind === 'skill'
                    ? '技解放'
                    : selectedNode.kind === 'notable'
                      ? '大ノード'
                      : 'パッシブ'}
            </span>
            <strong style={{ fontSize: 11.5, color: '#fff7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedNode.name}
            </strong>
          </div>
          <span style={{ fontSize: 10, color: '#ffe570', fontFamily: 'var(--font-pixel)', flexShrink: 0 }}>
            Lv.{selectedLv}/{selectedNode.maxLevel}
          </span>
        </div>

        {selectedNode.kind === 'keystone' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
            <div style={{ color: '#82ff9e' }}>▲ {selectedNode.upside}</div>
            <div style={{ color: '#ff8a9e' }}>▼ {selectedNode.downside}</div>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{selectedNode.desc}</div>
        )}

        {selectedNode.kind !== 'origin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, marginTop: 2 }}>
            <button
              id="btn-allocate-selected-node"
              type="button"
              className="rpg-btn sm primary"
              disabled={!canUp}
              onClick={() => onUpgradeSkillNode(selectedNode.id)}
            >
              {selectedLv >= selectedNode.maxLevel ? 'MAX' : `習得 SP1`}
            </button>
            <button
              id="btn-refund-selected-node"
              type="button"
              className="rpg-btn sm"
              disabled={!canRef}
              onClick={() => onRefundSkillNode(selectedNode.id)}
            >
              1pt返却
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
