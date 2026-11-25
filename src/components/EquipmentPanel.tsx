import { useMemo, useState } from 'react';
import {
  calculateItemScore,
  getEnhanceCost,
  getRerollCost,
  getSalvageValue,
  MAX_ENHANCE_LEVEL,
  RARITY_META,
  SET_MAP,
  SLOT_LABELS,
} from '../game/data/equipment';
import { getSpecies } from '../game/data/monsters';
import { computeUnitStats } from '../game/stats';
import type {
  ActiveShrineBuffs,
  AutoLootMode,
  AutoSellThreshold,
  EquipmentItem,
  EquipSlot,
  GameSave,
} from '../game/types';
import { PixelIcon } from './PixelIcon';

interface EquipmentPanelProps {
  save: GameSave;
  shrineBuffs: ActiveShrineBuffs;
  initialItemId?: string | null;
  onEquip: (unitId: string, itemId: string) => void;
  onUnequip: (unitId: string, slot: EquipSlot) => void;
  onAutoEquipUnit: (unitId: string) => void;
  onToggleLock: (itemId: string) => void;
  onSellItem: (itemId: string) => void;
  onSalvageItem: (itemId: string) => void;
  onEnhanceItem: (itemId: string) => void;
  onRerollAffix: (itemId: string, affixIndex: number) => void;
  onBulkProcess: (maxRarity: 'uncommon' | 'rare', mode: AutoLootMode) => void;
  onChangeAutoSell: (threshold: AutoSellThreshold) => void;
  onToggleAutoLootMode: () => void;
}

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'relic', 'rune'];

const AUTO_SELL_OPTIONS: { value: AutoSellThreshold; label: string }[] = [
  { value: 'none', label: 'OFF' },
  { value: 'common', label: 'C以下' },
  { value: 'uncommon', label: 'UC以下' },
  { value: 'rare', label: 'R以下' },
  { value: 'epic', label: 'E以下' },
];

export function EquipmentPanel({
  save,
  shrineBuffs,
  initialItemId,
  onEquip,
  onUnequip,
  onAutoEquipUnit,
  onToggleLock,
  onSellItem,
  onSalvageItem,
  onEnhanceItem,
  onRerollAffix,
  onBulkProcess,
  onChangeAutoSell,
  onToggleAutoLootMode,
}: EquipmentPanelProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(save.partyIds[0] ?? 'hero');
  const [slotFilter, setSlotFilter] = useState<EquipSlot | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId ?? null);
  const [selectedAffixIdx, setSelectedAffixIdx] = useState<number | null>(null);

  const activeUnitId = save.roster[selectedUnitId] ? selectedUnitId : 'hero';
  const unit = save.roster[activeUnitId]!;

  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );

  const equippedOwnerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of Object.values(save.roster)) {
      for (const s of SLOTS) {
        const id = u.equipped[s];
        if (id) map.set(id, u.id);
      }
    }
    return map;
  }, [save.roster]);

  const unitStats = useMemo(
    () => computeUnitStats(unit, save, shrineBuffs, invMap),
    [unit, save, shrineBuffs, invMap],
  );

  const filteredItems = useMemo(() => {
    return save.inventory
      .filter((it) => slotFilter === 'all' || it.slot === slotFilter)
      .sort((a, b) => calculateItemScore(b) - calculateItemScore(a));
  }, [save.inventory, slotFilter]);

  const selectedItem: EquipmentItem | null =
    (selectedItemId ? invMap.get(selectedItemId) : null) ?? filteredItems[0] ?? null;

  const validAffixIdx =
    selectedItem &&
    selectedAffixIdx !== null &&
    selectedAffixIdx >= 0 &&
    selectedAffixIdx < selectedItem.affixes.length
      ? selectedAffixIdx
      : null;

  const currentInSlot: EquipmentItem | null = selectedItem
    ? unit.equipped[selectedItem.slot]
      ? invMap.get(unit.equipped[selectedItem.slot]!) ?? null
      : null
    : null;

  const scoreDiff =
    selectedItem && currentInSlot && selectedItem.id !== currentInSlot.id
      ? calculateItemScore(selectedItem) - calculateItemScore(currentInSlot)
      : selectedItem && !currentInSlot
        ? calculateItemScore(selectedItem)
        : 0;

  const ownerOfSelected = selectedItem ? equippedOwnerMap.get(selectedItem.id) : undefined;
  const isEquippedBySelectedUnit = ownerOfSelected === unit.id;

  const previewStats = useMemo(() => {
    if (!selectedItem || isEquippedBySelectedUnit) return null;
    const simulatedUnit = {
      ...unit,
      equipped: { ...unit.equipped, [selectedItem.slot]: selectedItem.id },
    };
    const simulatedSave = {
      ...save,
      roster: { ...save.roster, [unit.id]: simulatedUnit },
    };
    return computeUnitStats(simulatedUnit, simulatedSave, shrineBuffs, invMap);
  }, [selectedItem, isEquippedBySelectedUnit, unit, save, shrineBuffs, invMap]);

  const statDiffs = useMemo(() => {
    if (!previewStats) return [];
    const pairs: { label: string; diff: number; suffix?: string }[] = [
      { label: 'HP', diff: previewStats.maxHp - unitStats.maxHp },
      { label: 'ATK', diff: previewStats.atk - unitStats.atk },
      { label: 'MAG', diff: previewStats.mag - unitStats.mag },
      { label: 'DEF', diff: previewStats.def - unitStats.def },
      { label: 'SPD', diff: previewStats.spd - unitStats.spd },
      { label: '会心', diff: previewStats.critRate - unitStats.critRate, suffix: '%' },
      { label: 'MF', diff: previewStats.magicFind - unitStats.magicFind, suffix: '%' },
    ];
    return pairs.filter((p) => p.diff !== 0);
  }, [previewStats, unitStats]);

  const enhanceCost = selectedItem ? getEnhanceCost(selectedItem) : null;
  const rerollCost = selectedItem ? getRerollCost(selectedItem) : null;
  const salvageStones = selectedItem ? getSalvageValue(selectedItem) : 0;

  const cycleAutoSell = () => {
    const idx = AUTO_SELL_OPTIONS.findIndex((o) => o.value === save.settings.autoSell);
    const next = AUTO_SELL_OPTIONS[(idx + 1) % AUTO_SELL_OPTIONS.length]!;
    onChangeAutoSell(next.value);
  };

  const autoModeLabel = save.settings.autoLootMode === 'salvage' ? '自動分解' : '自動売却';
  const autoThresholdLabel =
    AUTO_SELL_OPTIONS.find((o) => o.value === save.settings.autoSell)?.label ?? 'OFF';
  const bagNearFull = save.inventory.length >= 125;

  return (
    <div className="panel-body" style={{ gap: 5 }}>
      {/* Current Gold, Diamond (Forge Stones), & Bag Capacity Bar */}
      <div
        id="gear-currency-bar"
        className="rpg-card-gold"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 7px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 9.5,
            color: bagNearFull ? '#ff8a8a' : '#fff3c7',
            flexShrink: 0,
          }}
        >
          🎒{save.inventory.length}/140{bagNearFull ? '!' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span
            id="gear-diamond-count"
            className="gold-pill"
            style={{ color: '#8ae8ff', borderColor: 'rgba(138, 232, 255, 0.45)', fontSize: 10.5 }}
          >
            💎{save.forgeStones.toLocaleString()}
          </span>
          <span id="gear-gold-count" className="gold-pill" style={{ fontSize: 10.5 }}>
            {save.gold.toLocaleString()}G
          </span>
        </div>
      </div>

      {/* Party Member Selector */}
      <div className="unit-pill-row">
        {save.partyIds.map((pid) => {
          const u = save.roster[pid];
          if (!u) return null;
          const sp = getSpecies(u.speciesId);
          const st = computeUnitStats(u, save, shrineBuffs, invMap);
          return (
            <button
              key={pid}
              type="button"
              className={`unit-pill ${pid === activeUnitId ? 'selected' : ''}`}
              onClick={() => setSelectedUnitId(pid)}
            >
              <PixelIcon spriteKey={sp.spriteKey} size={22} />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sp.name}
              </span>
              <span style={{ fontSize: 8.5, color: 'var(--accent-amber)', fontFamily: 'var(--font-pixel)' }}>
                戦力{st.powerScore}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Unit Stats + 1-Tap Auto-Optimal Equip + Active Set Badges + 4 Equipped Slots */}
      <div className="rpg-card" style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 7px', fontSize: 10, minWidth: 0 }}>
            <span>ATK <strong>{unitStats.atk}</strong></span>
            <span>MAG <strong>{unitStats.mag}</strong></span>
            <span>DEF <strong>{unitStats.def}</strong></span>
            <span>HP <strong>{unitStats.maxHp}</strong></span>
            <span>会心 <strong>{unitStats.critRate}%</strong></span>
            {unitStats.armorPenPct > 0 && (
              <span style={{ color: '#c48aff' }}>貫通 <strong>{unitStats.armorPenPct}%</strong></span>
            )}
            <span style={{ color: 'var(--accent-amber)' }}>MF <strong>+{unitStats.magicFind}%</strong></span>
          </div>
          <button
            id="btn-auto-equip"
            type="button"
            className="rpg-btn sm primary"
            style={{ flexShrink: 0, fontSize: 9.5, padding: '3px 6px' }}
            onClick={() => onAutoEquipUnit(unit.id)}
          >
            ★最適装備
          </button>
        </div>

        {/* Active Equipment Sets */}
        {unitStats.activeSets.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {unitStats.activeSets.map((as) => {
              const sdef = SET_MAP[as.setId];
              const active = as.count >= 2;
              return (
                <span
                  key={as.setId}
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-pixel)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: active ? 'rgba(20, 18, 28, 0.85)' : 'rgba(20, 18, 28, 0.45)',
                    border: `1px solid ${active ? sdef.color : 'var(--border-subtle)'}`,
                    color: active ? sdef.color : 'var(--text-dim)',
                  }}
                >
                  {sdef.name} {as.count}/4{as.count >= 4 ? ' ★全発動' : as.count >= 2 ? ' ★発動' : ''}
                </span>
              );
            })}
          </div>
        )}

        <div className="slot-grid">
          {SLOTS.map((slot) => {
            const eqId = unit.equipped[slot];
            const eqItem = eqId ? invMap.get(eqId) : undefined;
            const rm = eqItem ? RARITY_META[eqItem.rarity] : null;
            return (
              <button
                key={slot}
                type="button"
                className={`slot-box ${eqItem && selectedItem?.id === eqItem.id ? 'selected' : ''}`}
                style={rm ? { borderColor: rm.border } : undefined}
                onClick={() => {
                  setSlotFilter(slot);
                  if (eqItem) {
                    setSelectedItemId(eqItem.id);
                    setSelectedAffixIdx(null);
                  }
                }}
              >
                {eqItem ? (
                  <PixelIcon spriteKey={eqItem.iconKey} size={18} />
                ) : (
                  <span style={{ width: 18, textAlign: 'center', color: 'var(--text-dim)', fontSize: 10 }}>
                    空
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>
                    {SLOT_LABELS[slot]}
                    {eqItem && eqItem.enhanceLevel > 0 ? ` +${eqItem.enhanceLevel}` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: rm ? rm.color : 'var(--text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {eqItem ? eqItem.name : '未装備'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Item Detail, Blacksmithing (+20 Enhance & 1-Slot Reroll) & Actions */}
      {selectedItem && (
        <div
          className="rpg-card"
          style={{
            borderColor: RARITY_META[selectedItem.rarity].border,
            background: RARITY_META[selectedItem.rarity].bg,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <PixelIcon spriteKey={selectedItem.iconKey} size={24} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: RARITY_META[selectedItem.rarity].color,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedItem.locked ? '🔒' : ''}
                {selectedItem.name}
                {selectedItem.enhanceLevel > 0 && (
                  <span style={{ color: '#ffe570' }}> +{selectedItem.enhanceLevel}</span>
                )}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {SLOT_LABELS[selectedItem.slot]} iLv.{selectedItem.itemLevel} T{selectedItem.worldTier} 評価
                {calculateItemScore(selectedItem)}
                {!isEquippedBySelectedUnit && scoreDiff !== 0 && (
                  <span className={scoreDiff > 0 ? 'stat-diff-pos' : 'stat-diff-neg'}>
                    {' '}
                    {scoreDiff > 0 ? `▲+${scoreDiff}` : `▼${scoreDiff}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isEquippedBySelectedUnit && statDiffs.length > 0 && (
            <div
              id="gear-stat-diffs"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2px 6px',
                fontSize: 9.5,
                padding: '2px 5px',
                borderRadius: 4,
                background: 'rgba(10, 9, 18, 0.55)',
              }}
            >
              {statDiffs.map((d) => (
                <span key={d.label} className={d.diff > 0 ? 'stat-diff-pos' : 'stat-diff-neg'}>
                  {d.label} {d.diff > 0 ? `+${d.diff}` : d.diff}
                  {d.suffix ?? ''}
                </span>
              ))}
            </div>
          )}

          {/* Set Info */}
          {selectedItem.setId && (
            <div
              style={{
                fontSize: 9.5,
                color: SET_MAP[selectedItem.setId].color,
                background: 'rgba(15, 13, 22, 0.65)',
                padding: '2px 6px',
                borderRadius: 4,
                lineHeight: 1.3,
              }}
            >
              <strong>【{SET_MAP[selectedItem.setId].name}】</strong> 2:{SET_MAP[selectedItem.setId].bonus2Desc} / 4:{SET_MAP[selectedItem.setId].bonus4Desc}
            </div>
          )}

          {/* Base stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 7px', fontSize: 10 }}>
            {selectedItem.baseStats.atk && <span>攻撃+{selectedItem.baseStats.atk}</span>}
            {selectedItem.baseStats.mag && <span>魔力+{selectedItem.baseStats.mag}</span>}
            {selectedItem.baseStats.def && <span>防御+{selectedItem.baseStats.def}</span>}
            {selectedItem.baseStats.hp && <span>HP+{selectedItem.baseStats.hp}</span>}
            {selectedItem.baseStats.spd && <span>素早さ+{selectedItem.baseStats.spd}</span>}
          </div>

          {/* Random Affixes */}
          {selectedItem.affixes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {selectedItem.affixes.map((af, idx) => {
                const isPicked = validAffixIdx === idx;
                return (
                  <button
                    key={`${af.stat}_${idx}`}
                    type="button"
                    onClick={() => setSelectedAffixIdx(isPicked ? null : idx)}
                    style={{
                      fontSize: 9.5,
                      background: isPicked ? '#543b1e' : 'rgba(15, 13, 22, 0.72)',
                      border: isPicked
                        ? '1px solid #ffe570'
                        : af.masterworked
                          ? '1px solid rgba(255, 214, 92, 0.55)'
                          : '1px solid rgba(255,255,255,0.12)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      color: af.masterworked ? '#ffe570' : '#d9f2ff',
                      cursor: 'pointer',
                    }}
                  >
                    {af.masterworked ? '★' : ''}
                    {af.label}+{af.value}
                    {af.isPercent ? '%' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {/* Unique Effect */}
          {selectedItem.uniqueDesc && (
            <div
              style={{
                fontSize: 10,
                color: '#ffe570',
                background: 'rgba(20, 16, 26, 0.72)',
                borderLeft: '2px solid #ffe570',
                padding: '2px 6px',
                borderRadius: 3,
              }}
            >
              ★固有：{selectedItem.uniqueDesc}
            </div>
          )}

          {/* Blacksmithing Row: Enhance (+1..+20) & 1-Slot Reroll */}
          <div style={{ display: 'flex', gap: 4, minWidth: 0 }}>
            {selectedItem.enhanceLevel < MAX_ENHANCE_LEVEL && enhanceCost ? (
              <button
                id="btn-enhance-selected"
                type="button"
                className={`rpg-btn sm ${enhanceCost.isBreakthrough ? 'primary' : 'emerald'}`}
                style={{ flex: 1 }}
                disabled={save.forgeStones < enhanceCost.stones || save.gold < enhanceCost.gold}
                onClick={() => onEnhanceItem(selectedItem.id)}
              >
                {enhanceCost.isBreakthrough
                  ? `★突破+${selectedItem.enhanceLevel + 1}`
                  : `🔨強化+${selectedItem.enhanceLevel + 1}`}{' '}
                💎{enhanceCost.stones} {enhanceCost.gold}G
              </button>
            ) : (
              <button type="button" className="rpg-btn sm" style={{ flex: 1 }} disabled>
                ★強化MAX +{MAX_ENHANCE_LEVEL}
              </button>
            )}

            {selectedItem.affixes.length > 0 && rerollCost && (
              <button
                id="btn-reroll-affix"
                type="button"
                className="rpg-btn sm active-toggle"
                style={{ flex: 1 }}
                disabled={
                  validAffixIdx === null ||
                  save.forgeStones < rerollCost.stones ||
                  save.gold < rerollCost.gold
                }
                onClick={() => {
                  if (validAffixIdx !== null) {
                    onRerollAffix(selectedItem.id, validAffixIdx);
                  }
                }}
              >
                {validAffixIdx !== null
                  ? `🔄再鍛造 💎${rerollCost.stones} ${rerollCost.gold}G`
                  : '🔄OP再鍛造'}
              </button>
            )}
          </div>

          {/* 1-Tap Equip / Lock / Salvage / Sell Row */}
          <div style={{ display: 'flex', gap: 4, minWidth: 0 }}>
            {isEquippedBySelectedUnit ? (
              <button
                type="button"
                className="rpg-btn sm"
                style={{ flex: 1 }}
                onClick={() => onUnequip(unit.id, selectedItem.slot)}
              >
                外す
              </button>
            ) : (
              <button
                id="btn-equip-selected"
                type="button"
                className="rpg-btn sm primary"
                style={{ flex: 1 }}
                onClick={() => onEquip(unit.id, selectedItem.id)}
              >
                {ownerOfSelected ? '移して装備' : `${getSpecies(unit.speciesId).name}に装備`}
              </button>
            )}
            <button
              type="button"
              className="rpg-btn sm"
              onClick={() => onToggleLock(selectedItem.id)}
            >
              {selectedItem.locked ? '解除' : '🔒'}
            </button>
            <button
              type="button"
              className="rpg-btn sm"
              disabled={selectedItem.locked || Boolean(ownerOfSelected)}
              onClick={() => onSalvageItem(selectedItem.id)}
            >
              分解+{salvageStones}💎
            </button>
            <button
              type="button"
              className="rpg-btn sm danger"
              disabled={selectedItem.locked || Boolean(ownerOfSelected)}
              onClick={() => onSellItem(selectedItem.id)}
            >
              売{selectedItem.sellValue}G
            </button>
          </div>
        </div>
      )}

      {/* Filter + Auto-Sell / Auto-Salvage Controls */}
      <div className="filter-row">
        <button
          type="button"
          className={`pill-chip ${slotFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSlotFilter('all')}
        >
          全 {save.inventory.length}
        </button>
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            className={`pill-chip ${slotFilter === s ? 'active' : ''}`}
            onClick={() => setSlotFilter(s)}
          >
            {SLOT_LABELS[s]}
          </button>
        ))}
        <button
          type="button"
          className="pill-chip"
          style={{ marginLeft: 'auto', color: '#8ae8ff' }}
          onClick={onToggleAutoLootMode}
        >
          {autoModeLabel}
        </button>
        <button
          type="button"
          className="pill-chip"
          style={{ color: '#ffd86b' }}
          onClick={cycleAutoSell}
        >
          {autoThresholdLabel}
        </button>
      </div>

      {/* 1-Tap Bulk Salvage / Bulk Sell */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
        <button
          type="button"
          className="rpg-btn sm"
          onClick={() => onBulkProcess('uncommon', 'salvage')}
        >
          UC以下分解
        </button>
        <button
          type="button"
          className="rpg-btn sm"
          onClick={() => onBulkProcess('rare', 'salvage')}
        >
          R以下分解
        </button>
        <button
          type="button"
          className="rpg-btn sm"
          onClick={() => onBulkProcess('rare', 'sell')}
        >
          R以下売却
        </button>
      </div>

      {/* Scrollable Inventory List */}
      <div className="item-list">
        {filteredItems.map((item) => {
          const rm = RARITY_META[item.rarity];
          const ownerId = equippedOwnerMap.get(item.id);
          const curSlotId = unit.equipped[item.slot];
          const curItem = curSlotId ? invMap.get(curSlotId) : null;
          const diff =
            ownerId === unit.id
              ? 0
              : calculateItemScore(item) - (curItem ? calculateItemScore(curItem) : 0);

          return (
            <button
              key={item.id}
              type="button"
              className={`item-row ${selectedItem?.id === item.id ? 'selected' : ''}`}
              style={{ borderLeft: `3px solid ${rm.border}` }}
              onClick={() => {
                setSelectedItemId(item.id);
                setSelectedAffixIdx(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <PixelIcon spriteKey={item.iconKey} size={22} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: rm.color,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.locked ? '🔒' : ''}
                    {item.name}
                    {item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {SLOT_LABELS[item.slot]} iLv.{item.itemLevel}
                    {item.setId ? `・${SET_MAP[item.setId].name}` : ''}
                    {ownerId ? `・${getSpecies(ownerId).name}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 10 }}>
                {ownerId === unit.id ? (
                  <span style={{ color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>装備中</span>
                ) : diff > 0 ? (
                  <span className="stat-diff-pos">▲+{diff}</span>
                ) : diff < 0 ? (
                  <span className="stat-diff-neg">▼{diff}</span>
                ) : (
                  <span className="muted-text">±0</span>
                )}
              </div>
            </button>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="muted-text" style={{ textAlign: 'center', padding: 10 }}>
            該当する装備がない
          </div>
        )}
      </div>
    </div>
  );
}
