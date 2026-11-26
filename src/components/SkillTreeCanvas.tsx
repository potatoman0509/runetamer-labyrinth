import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
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

type ListFilter = 'available' | 'keystone' | 'allocated' | 'all' | SkillBranch;

function nodeRadius(node: SkillTreeNodeDef): number {
  if (node.kind === 'origin') return 30;
  if (node.kind === 'keystone') return 30;
  if (node.kind === 'skill') return 25;
  if (node.kind === 'notable') return 22;
  return 16;
}

function nodeColor(node: SkillTreeNodeDef): string {
  if (node.branch === 'origin') return '#ffe570';
  return BRANCH_META[node.branch].color;
}

function kindLabel(kind: SkillTreeNodeDef['kind']): string {
  if (kind === 'origin') return '始原';
  if (kind === 'keystone') return 'キーストーン';
  if (kind === 'skill') return '技解放';
  if (kind === 'notable') return '大ノード';
  return 'パッシブ';
}

function kindBg(kind: SkillTreeNodeDef['kind']): string {
  if (kind === 'keystone') return '#b82a45';
  if (kind === 'skill') return '#3b6ea8';
  if (kind === 'notable') return '#a8741e';
  return '#3e3854';
}

export function SkillTreeCanvas({
  save,
  onUpgradeSkillNode,
  onRefundSkillNode,
  onResetSkillTree,
}: SkillTreeCanvasProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [listFilter, setListFilter] = useState<ListFilter>('available');
  const [selectedId, setSelectedId] = useState<string>('sw_entry');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState({ cx: SKILL_TREE_CENTER, cy: SKILL_TREE_CENTER, zoom: 2.35 });

  // Multi-touch pointer tracking for 1-finger pan + 2-finger pinch zoom
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'pan' | 'pinch';
    startX: number;
    startY: number;
    origCx: number;
    origCy: number;
    origZoom: number;
    startDist: number;
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

  const upgradeableCount = useMemo(
    () => SKILL_TREE_NODES.filter((n) => canUpgradeSkillNode(save, n.id)).length,
    [save],
  );

  const activeKeystoneNodes = useMemo(
    () =>
      bonuses.activeKeystones
        .map((kid) => SKILL_TREE_NODES.find((n) => n.keystoneId === kid))
        .filter((n): n is SkillTreeNodeDef => Boolean(n)),
    [bonuses.activeKeystones],
  );

  const filteredListNodes = useMemo(() => {
    return SKILL_TREE_NODES.filter((n) => {
      if (n.kind === 'origin') return false;
      if (query && !matchedNodeIds.has(n.id)) return false;
      if (listFilter === 'available') return canUpgradeSkillNode(save, n.id);
      if (listFilter === 'keystone') return n.kind === 'keystone';
      if (listFilter === 'allocated') return (save.heroSkillTree[n.id] ?? 0) > 0;
      if (listFilter === 'all') return true;
      return n.branch === listFilter;
    }).sort((a, b) => {
      const aUp = canUpgradeSkillNode(save, a.id) ? 1 : 0;
      const bUp = canUpgradeSkillNode(save, b.id) ? 1 : 0;
      if (aUp !== bUp) return bUp - aUp;
      const kindRank = { keystone: 4, skill: 3, notable: 2, minor: 1, origin: 0 };
      return kindRank[b.kind] - kindRank[a.kind];
    });
  }, [listFilter, matchedNodeIds, query, save]);

  const selectedNode = SKILL_NODE_MAP[selectedId] ?? SKILL_NODE_MAP[ORIGIN_NODE_ID]!;
  const selectedLv =
    selectedNode.kind === 'origin' ? 1 : (save.heroSkillTree[selectedNode.id] ?? 0);
  const canUp = canUpgradeSkillNode(save, selectedNode.id);
  const canRef = canRefundSkillNode(save, selectedNode.id);

  const vbSize = SKILL_TREE_CANVAS_SIZE / view.zoom;
  const vbX = view.cx - vbSize / 2;
  const vbY = view.cy - vbSize / 2;

  const clampCenter = (cx: number, cy: number) => ({
    cx: Math.max(90, Math.min(SKILL_TREE_CANVAS_SIZE - 90, cx)),
    cy: Math.max(90, Math.min(SKILL_TREE_CANVAS_SIZE - 90, cy)),
  });

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startX: pts[0]!.x,
        startY: pts[0]!.y,
        origCx: view.cx,
        origCy: view.cy,
        origZoom: view.zoom,
        startDist: 0,
        moved: false,
      };
    } else if (pts.length >= 2) {
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      gestureRef.current = {
        mode: 'pinch',
        startX: (pts[0]!.x + pts[1]!.x) / 2,
        startY: (pts[0]!.y + pts[1]!.y) / 2,
        origCx: view.cx,
        origCy: view.cy,
        origZoom: view.zoom,
        startDist: Math.max(10, dist),
        moved: true,
      };
    }
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (!g || !svgRef.current) return;

    const pts = Array.from(pointersRef.current.values());
    if (g.mode === 'pinch' && pts.length >= 2) {
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      const nextZoom = Math.max(0.9, Math.min(4.2, g.origZoom * (dist / g.startDist)));
      setView((v) => ({ ...v, zoom: nextZoom }));
      return;
    }

    if (g.mode === 'pan' && pts.length === 1) {
      const dx = pts[0]!.x - g.startX;
      const dy = pts[0]!.y - g.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        g.moved = true;
      }
      if (!g.moved) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scale = vbSize / Math.max(1, Math.min(rect.width, rect.height));
      const next = clampCenter(g.origCx - dx * scale, g.origCy - dy * scale);
      setView((v) => ({ ...v, cx: next.cx, cy: next.cy }));
    }
  };

  const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
    }
  };

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 0.85;
    setView((v) => ({ ...v, zoom: Math.max(0.9, Math.min(4.2, v.zoom * factor)) }));
  };

  const focusBranch = (branch: SkillBranch) => {
    const rad = (BRANCH_META[branch].angleDeg * Math.PI) / 180;
    setView({
      cx: SKILL_TREE_CENTER + Math.cos(rad) * 340,
      cy: SKILL_TREE_CENTER + Math.sin(rad) * 340,
      zoom: 2.35,
    });
  };

  const focusNodeOnBoard = (node: SkillTreeNodeDef) => {
    setSelectedId(node.id);
    setView({ cx: node.x, cy: node.y, zoom: 2.8 });
    setViewMode('board');
    setModalOpen(true);
  };

  const zoomBy = (factor: number) => {
    setView((v) => ({ ...v, zoom: Math.max(0.9, Math.min(4.2, v.zoom * factor)) }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {/* Compact Launcher Card in Party > Skill Tab */}
      <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-pixel)', color: '#ffe570' }}>
              🌌 ルーン星座盤・全{SKILL_TREE_NODES.length}ノード
            </div>
            <div className="muted-text" style={{ fontSize: 9.5 }}>
              残りSP <strong style={{ color: '#82ff9e', fontSize: 11 }}>{availableSp}</strong> / 計{totalSp}・習得可能 {upgradeableCount}箇所
            </div>
          </div>
          <button
            id="btn-reset-skilltree-inline"
            type="button"
            className="rpg-btn sm danger"
            disabled={spentSp === 0}
            onClick={onResetSkillTree}
          >
            全リセット
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
          <button
            id="btn-open-skilltree-fullscreen"
            type="button"
            className="rpg-btn primary"
            style={{ fontSize: 10.5, padding: '8px 6px' }}
            onClick={() => {
              setViewMode('board');
              setModalOpen(true);
            }}
          >
            🌌 星座盤を全画面で開く
          </button>
          <button
            id="btn-open-skilltree-list"
            type="button"
            className="rpg-btn emerald"
            style={{ fontSize: 10.5, padding: '8px 6px' }}
            onClick={() => {
              setViewMode('list');
              setModalOpen(true);
            }}
          >
            📋 ノード一覧で選ぶ
          </button>
        </div>

        {activeKeystoneNodes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {activeKeystoneNodes.map((ks) => (
              <button
                key={ks.id}
                type="button"
                onClick={() => focusNodeOnBoard(ks)}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
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

      {/* Full-Screen Constellation & Node List Modal (Portaled to document.body for true 100% viewport height) */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="skilltree-fullscreen-modal"
            className="skilltree-fullscreen-modal"
            role="dialog"
            aria-modal="true"
            aria-label="ルーン星座盤スキルツリー"
          >
          {/* Top Modal Toolbar */}
          <div className="skilltree-fs-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontFamily: 'var(--font-pixel)', color: '#ffe570' }}>
                  🌌 星座盤
                </span>
                <span style={{ fontSize: 10, color: '#82ff9e', marginLeft: 6, fontFamily: 'var(--font-pixel)' }}>
                  SP {availableSp}/{totalSp}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <button
                  id="btn-skilltree-mode-board"
                  type="button"
                  className={`rpg-btn sm ${viewMode === 'board' ? 'primary' : ''}`}
                  style={{ fontSize: 9.5, padding: '3px 6px' }}
                  onClick={() => setViewMode('board')}
                >
                  🌌 盤面
                </button>
                <button
                  id="btn-skilltree-mode-list"
                  type="button"
                  className={`rpg-btn sm ${viewMode === 'list' ? 'primary' : ''}`}
                  style={{ fontSize: 9.5, padding: '3px 6px' }}
                  onClick={() => setViewMode('list')}
                >
                  📋 一覧
                </button>
                <button
                  id="btn-reset-skilltree"
                  type="button"
                  className="rpg-btn sm danger"
                  style={{ fontSize: 9.5, padding: '3px 5px' }}
                  disabled={spentSp === 0}
                  onClick={onResetSkillTree}
                >
                  リセット
                </button>
                <button
                  id="btn-close-skilltree-fullscreen"
                  type="button"
                  className="rpg-btn sm"
                  style={{ fontSize: 9.5, padding: '3px 6px' }}
                  onClick={() => setModalOpen(false)}
                >
                  閉じる
                </button>
              </div>
            </div>

            {/* Search + Zoom / Filter Strip */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                id="input-skilltree-search"
                type="text"
                className="skill-search-input"
                placeholder="検索: 会心・貫通・仲間・MF・シールド..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {viewMode === 'board' && (
                <>
                  <button
                    type="button"
                    className="rpg-btn sm"
                    style={{ padding: '3px 7px', fontSize: 11 }}
                    onClick={() => zoomBy(1.3)}
                    aria-label="拡大"
                  >
                    ＋
                  </button>
                  <button
                    type="button"
                    className="rpg-btn sm"
                    style={{ padding: '3px 7px', fontSize: 11 }}
                    onClick={() => zoomBy(0.77)}
                    aria-label="縮小"
                  >
                    －
                  </button>
                  <button
                    type="button"
                    className="rpg-btn sm"
                    style={{ padding: '3px 5px', fontSize: 9 }}
                    onClick={() => setView({ cx: SKILL_TREE_CENTER, cy: SKILL_TREE_CENTER, zoom: 2.35 })}
                  >
                    中央
                  </button>
                  <button
                    type="button"
                    className="rpg-btn sm"
                    style={{ padding: '3px 5px', fontSize: 9 }}
                    onClick={() => setView({ cx: SKILL_TREE_CENTER, cy: SKILL_TREE_CENTER, zoom: 0.96 })}
                  >
                    全体
                  </button>
                </>
              )}
            </div>

            {/* 6-Cluster Quick Jump (Board) OR Category Tabs (List) */}
            {viewMode === 'board' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 2 }}>
                {BRANCH_ORDER.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className="rpg-btn sm"
                    style={{
                      padding: '3px 1px',
                      fontSize: 9,
                      borderColor: BRANCH_META[b].color,
                      color: '#fff7e0',
                    }}
                    onClick={() => focusBranch(b)}
                  >
                    {BRANCH_META[b].shortLabel}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
                  {(
                    [
                      ['available', `習得可 ${upgradeableCount}`],
                      ['keystone', '◆キーストーン'],
                      ['allocated', `習得済 ${Object.keys(save.heroSkillTree).length}`],
                      ['all', '全て'],
                    ] as Array<[ListFilter, string]>
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`rpg-btn sm ${listFilter === key ? 'primary' : ''}`}
                      style={{ padding: '3px 2px', fontSize: 8.5 }}
                      onClick={() => setListFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 2 }}>
                  {BRANCH_ORDER.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`rpg-btn sm ${listFilter === b ? 'primary' : ''}`}
                      style={{
                        padding: '3px 1px',
                        fontSize: 8.5,
                        borderColor: BRANCH_META[b].color,
                      }}
                      onClick={() => setListFilter(b)}
                    >
                      {BRANCH_META[b].shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Area: Full-Screen Constellation Board OR Scrollable Node List */}
          {viewMode === 'board' ? (
            <>
              <div className="skilltree-fs-canvas-wrap">
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
                  <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={130} fill="none" stroke="rgba(255,229,112,0.09)" strokeWidth={2} />
                  <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={315} fill="none" stroke="rgba(255,229,112,0.09)" strokeWidth={2} strokeDasharray="8 8" />
                  <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={540} fill="none" stroke="rgba(255,229,112,0.08)" strokeWidth={2} strokeDasharray="10 10" />
                  <circle cx={SKILL_TREE_CENTER} cy={SKILL_TREE_CENTER} r={730} fill="none" stroke="rgba(255,148,168,0.1)" strokeWidth={3} />

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
                              ? 'rgba(130, 255, 158, 0.72)'
                              : 'rgba(148, 160, 195, 0.34)'
                        }
                        strokeWidth={bothAlloc ? 6 : frontier ? 4.5 : 2.6}
                        strokeDasharray={frontier ? '8 5' : undefined}
                      />
                    );
                  })}

                  {SKILL_TREE_NODES.map((node) => {
                    const lv = node.kind === 'origin' ? 1 : (save.heroSkillTree[node.id] ?? 0);
                    const allocated = lv > 0;
                    const upgradeable = canUpgradeSkillNode(save, node.id);
                    const isSelected = node.id === selectedNode.id;
                    const isMatched = matchedNodeIds.has(node.id);
                    const r = nodeRadius(node);
                    const color = nodeColor(node);
                    const fill = allocated ? color : upgradeable ? '#284535' : '#1b1a28';
                    const stroke = isSelected
                      ? '#ffffff'
                      : isMatched
                        ? '#ffe570'
                        : allocated
                          ? '#fff3c4'
                          : upgradeable
                            ? '#82ff9e'
                            : 'rgba(170, 180, 215, 0.5)';

                    const showLabel =
                      view.zoom >= 1.9 ||
                      node.kind === 'keystone' ||
                      node.kind === 'skill' ||
                      isSelected ||
                      isMatched;

                    const onNodeClick = () => {
                      if (gestureRef.current?.moved) return;
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
                        {/* Large invisible thumb-friendly hit target */}
                        <circle r={r + 18} fill="transparent" />

                        {isMatched && (
                          <circle r={r + 11} fill="none" stroke="#ffe570" strokeWidth={5} opacity={0.9} />
                        )}
                        {isSelected && (
                          <circle r={r + 7} fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.95} />
                        )}
                        {node.kind === 'keystone' ? (
                          <polygon
                            points={`0,${-r} ${r},0 0,${r} ${-r},0`}
                            fill={allocated ? '#b82a45' : '#2b1622'}
                            stroke={allocated ? '#ffe570' : stroke}
                            strokeWidth={allocated ? 4.5 : 3.5}
                          />
                        ) : node.kind === 'skill' ? (
                          <rect
                            x={-r * 0.82}
                            y={-r * 0.82}
                            width={r * 1.64}
                            height={r * 1.64}
                            rx={5}
                            transform="rotate(45)"
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={3.5}
                          />
                        ) : (
                          <circle
                            r={r}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={node.kind === 'notable' || node.kind === 'origin' ? 4 : 2.8}
                          />
                        )}
                        <text
                          y={5}
                          textAnchor="middle"
                          fill={allocated ? '#14101c' : '#f0ecfc'}
                          fontSize={node.kind === 'keystone' ? 16 : node.kind === 'minor' ? 12 : 14}
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
                        {showLabel && (
                          <text
                            y={r + 14}
                            textAnchor="middle"
                            fill={isSelected ? '#ffe570' : '#f0ecfc'}
                            fontSize={node.kind === 'keystone' ? 13 : 11}
                            fontWeight={700}
                            stroke="#0a0912"
                            strokeWidth={3}
                            paintOrder="stroke"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {node.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div className="skill-constellation-hint">
                  1本指ドラッグ移動・2本指ピンチ拡大{query ? `・一致${matchedNodeIds.size}件` : ''}
                </div>
              </div>

              {/* Bottom Selected Node Inspector */}
              <div className="skilltree-fs-inspector">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: kindBg(selectedNode.kind),
                        color: '#fff',
                        fontFamily: 'var(--font-pixel)',
                        flexShrink: 0,
                      }}
                    >
                      {kindLabel(selectedNode.kind)}
                    </span>
                    <strong style={{ fontSize: 12, color: '#fff7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedNode.name}
                    </strong>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#ffe570', fontFamily: 'var(--font-pixel)', flexShrink: 0 }}>
                    Lv.{selectedLv}/{selectedNode.maxLevel}
                  </span>
                </div>

                {selectedNode.kind === 'keystone' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5 }}>
                    <div style={{ color: '#82ff9e' }}>▲ {selectedNode.upside}</div>
                    <div style={{ color: '#ff8a9e' }}>▼ {selectedNode.downside}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{selectedNode.desc}</div>
                )}

                {selectedNode.kind !== 'origin' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 3 }}>
                    <button
                      id="btn-allocate-selected-node"
                      type="button"
                      className="rpg-btn primary"
                      style={{ padding: '7px 6px', fontSize: 11 }}
                      disabled={!canUp}
                      onClick={() => onUpgradeSkillNode(selectedNode.id)}
                    >
                      {selectedLv >= selectedNode.maxLevel ? 'MAX' : '習得 SP1'}
                    </button>
                    <button
                      id="btn-refund-selected-node"
                      type="button"
                      className="rpg-btn"
                      style={{ padding: '7px 6px', fontSize: 11 }}
                      disabled={!canRef}
                      onClick={() => onRefundSkillNode(selectedNode.id)}
                    >
                      1pt返却
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Card-Based Scrollable Node List View */
            <div className="skilltree-fs-list">
              {filteredListNodes.length === 0 ? (
                <div className="rpg-card muted-text" style={{ textAlign: 'center', padding: 14 }}>
                  該当するノードがありません
                </div>
              ) : (
                filteredListNodes.map((node) => {
                  const lv = save.heroSkillTree[node.id] ?? 0;
                  const up = canUpgradeSkillNode(save, node.id);
                  const ref = canRefundSkillNode(save, node.id);
                  const brColor = nodeColor(node);
                  return (
                    <div
                      key={node.id}
                      className={lv > 0 ? 'rpg-card-gold' : 'rpg-card'}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        borderLeft: `3px solid ${brColor}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 8.5,
                              padding: '1px 4px',
                              borderRadius: 3,
                              background: kindBg(node.kind),
                              color: '#fff',
                              fontFamily: 'var(--font-pixel)',
                              flexShrink: 0,
                            }}
                          >
                            {kindLabel(node.kind)}
                          </span>
                          <strong style={{ fontSize: 11.5, color: '#fff7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.name}
                          </strong>
                        </div>
                        <span style={{ fontSize: 10, color: '#ffe570', fontFamily: 'var(--font-pixel)', flexShrink: 0 }}>
                          Lv.{lv}/{node.maxLevel}
                        </span>
                      </div>

                      {node.kind === 'keystone' ? (
                        <div style={{ fontSize: 9.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ color: '#82ff9e' }}>▲ {node.upside}</span>
                          <span style={{ color: '#ff8a9e' }}>▼ {node.downside}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{node.desc}</div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 4 }}>
                        <button
                          id={`btn-list-alloc-${node.id}`}
                          type="button"
                          className={`rpg-btn sm ${up ? 'primary' : ''}`}
                          disabled={!up}
                          onClick={() => onUpgradeSkillNode(node.id)}
                        >
                          {lv >= node.maxLevel ? 'MAX' : up ? '習得 SP1' : '未接続'}
                        </button>
                        <button
                          type="button"
                          className="rpg-btn sm"
                          disabled={!ref}
                          onClick={() => onRefundSkillNode(node.id)}
                        >
                          1pt返却
                        </button>
                        <button
                          type="button"
                          className="rpg-btn sm"
                          onClick={() => focusNodeOnBoard(node)}
                        >
                          📍盤面
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>,
          document.body,
        )}
    </div>
  );
}
