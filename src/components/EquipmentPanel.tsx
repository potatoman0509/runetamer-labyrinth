import { useMemo, useState } from 'react';
import {
  calculateItemScore,
  RARITY_META,
  SLOT_LABELS,
} from '../game/data/equipment';
import { getSpecies } from '../game/data/monsters';
import { computeUnitStats } from '../game/stats';
import type {
  ActiveShrineBuffs,
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
  onToggleLock: (itemId: string) => void;
  onSellItem: (itemId: string) => void;
  onBulkSell: (maxRarity: 'uncommon' | 'rare') => void;
  onChangeAutoSell: (threshold: AutoSellThreshold) => void;
}

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'relic', 'rune'];

const AUTO_SELL_OPTIONS: { value: AutoSellThreshold; label: string }[] = [
  { value: 'none', label: '自動売:OFF' },
  { value: 'common', label: '自動売:C以下' },
  { value: 'uncommon', label: '自動売:UC以下' },
  { value: 'rare', label: '自動売:R以下' },
  { value: 'epic', label: '自動売:E以下' },
];

export function EquipmentPanel({
  save,
  shrineBuffs,
  initialItemId,
  onEquip,
  onUnequip,
  onToggleLock,
  onSellItem,
  onBulkSell,
  onChangeAutoSell,
}: EquipmentPanelProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(save.partyIds[0] ?? 'hero');
  const [slotFilter, setSlotFilter] = useState<EquipSlot | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId ?? null);

  const activeUnitId = save.roster[selectedUnitId] ? selectedUnitId : 'hero';
  const unit = save.roster[activeUnitId]!;

  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );

  // Track which unit currently equips each item
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

  // Currently equipped item in the same slot on selected unit for 1-tap diff comparison
  const currentInSlot: EquipmentItem | null = selectedItem
    ? (unit.equipped[selectedItem.slot] ? invMap.get(unit.equipped[selectedItem.slot]!) ?? null : null)
    : null;

  const scoreDiff =
    selectedItem && currentInSlot && selectedItem.id !== currentInSlot.id
      ? calculateItemScore(selectedItem) - calculateItemScore(currentInSlot)
      : selectedItem && !currentInSlot
        ? calculateItemScore(selectedItem)
        : 0;

  const ownerOfSelected = selectedItem ? equippedOwnerMap.get(selectedItem.id) : undefined;
  const isEquippedBySelectedUnit = ownerOfSelected === unit.id;

  const cycleAutoSell = () => {
    const idx = AUTO_SELL_OPTIONS.findIndex((o) => o.value === save.settings.autoSell);
    const next = AUTO_SELL_OPTIONS[(idx + 1) % AUTO_SELL_OPTIONS.length]!;
    onChangeAutoSell(next.value);
  };

  return (
    <div className="panel-body" style={{ gap: 5 }}>
      {/* Party Member Selector (All 4 can equip all 4 slots!) */}
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

      {/* Selected Unit Compact Stats + 4 Equipped Slots */}
      <div className="rpg-card" style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 10 }}>
          <span>ATK <strong>{unitStats.atk}</strong></span>
          <span>MAG <strong>{unitStats.mag}</strong></span>
          <span>DEF <strong>{unitStats.def}</strong></span>
          <span>HP <strong>{unitStats.maxHp}</strong></span>
          <span>会心 <strong>{unitStats.critRate}%</strong></span>
          <span style={{ color: 'var(--accent-amber)' }}>MF <strong>+{unitStats.magicFind}%</strong></span>
        </div>

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
                  if (eqItem) setSelectedItemId(eqItem.id);
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
                  <div style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>{SLOT_LABELS[slot]}</div>
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

      {/* Selected Item Detail & 1-Tap Compare Card */}
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
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {SLOT_LABELS[selectedItem.slot]} iLv.{selectedItem.itemLevel} (T{selectedItem.worldTier}) 評価
                {calculateItemScore(selectedItem)}
                {!isEquippedBySelectedUnit && scoreDiff !== 0 && (
                  <span className={scoreDiff > 0 ? 'stat-diff-pos' : 'stat-diff-neg'}>
                    {' '}
                    ({scoreDiff > 0 ? `▲+${scoreDiff}` : `▼${scoreDiff}`})
                  </span>
                )}
              </div>
            </div>
          </div>

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
              {selectedItem.affixes.map((af, idx) => (
                <span
                  key={`${af.stat}_${idx}`}
                  style={{
                    fontSize: 9.5,
                    background: 'rgba(15, 13, 22, 0.65)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    color: '#d9f2ff',
                  }}
                >
                  {af.label}+{af.value}
                  {af.isPercent ? '%' : ''}
                </span>
              ))}
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
              ★固有: {selectedItem.uniqueDesc}
            </div>
          )}

          {/* 1-Tap Action Buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 2, minWidth: 0 }}>
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
                {ownerOfSelected
                  ? `移して装備`
                  : `${getSpecies(unit.speciesId).name}に装備`}
              </button>
            )}
            <button
              type="button"
              className="rpg-btn sm"
              onClick={() => onToggleLock(selectedItem.id)}
            >
              {selectedItem.locked ? '解除' : 'ロック'}
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

      {/* Filter + Bulk Sell + Auto-Sell Controls */}
      <div className="filter-row">
        <button
          type="button"
          className={`pill-chip ${slotFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSlotFilter('all')}
        >
          全て({save.inventory.length})
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
          style={{ marginLeft: 'auto', color: '#ffd86b' }}
          onClick={cycleAutoSell}
        >
          {AUTO_SELL_OPTIONS.find((o) => o.value === save.settings.autoSell)?.label}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <button
          type="button"
          className="rpg-btn sm"
          style={{ flex: 1 }}
          onClick={() => onBulkSell('uncommon')}
        >
          UC以下を一括売却
        </button>
        <button
          type="button"
          className="rpg-btn sm"
          style={{ flex: 1 }}
          onClick={() => onBulkSell('rare')}
        >
          R以下を一括売却
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
              style={{ borderLeft: `4px solid ${rm.border}` }}
              onClick={() => setSelectedItemId(item.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <PixelIcon spriteKey={item.iconKey} size={24} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: rm.color,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.locked ? '🔒' : ''}
                    {item.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {SLOT_LABELS[item.slot]} iLv.{item.itemLevel}
                    {ownerId ? ` [${getSpecies(ownerId).name}装備中]` : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 11 }}>
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
          <div className="muted-text" style={{ textAlign: 'center', padding: 12 }}>
            該当する装備がありません。迷宮で魔物や宝箱から掘り出しましょう！
          </div>
        )}
      </div>
    </div>
  );
}
