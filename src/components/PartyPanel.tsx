import { useMemo, useState } from 'react';
import { ELEMENT_META } from '../game/bossGimmicks';
import { getSpecies, ROLE_LABELS } from '../game/data/monsters';
import {
  ALL_HERO_SKILLS,
  getAvailableSp,
  getHeroEquippedSkills,
  getUnlockedHeroSkillIds,
} from '../game/skillTree';
import {
  RANCH_SORT_OPTIONS,
  sortRanchMonsters,
  type RanchSortKey,
  type SortDirection,
} from '../game/sortUtils';
import {
  canEvolveMonster,
  canTrueEvolveMonster,
  computeUnitStats,
  expForNextLevel,
  getEvolutionRequirement,
  getTrueEvolutionRequirement,
} from '../game/stats';
import { computePartySynergies } from '../game/synergy';
import type {
  ActiveShrineBuffs,
  ElementType,
  GameSave,
  MonsterRole,
  MonsterTier,
} from '../game/types';
import { getUnitEquipVisualKey } from '../engine/equipVisuals';
import { PixelIcon } from './PixelIcon';
import { SkillTreeCanvas } from './SkillTreeCanvas';

interface PartyPanelProps {
  save: GameSave;
  shrineBuffs: ActiveShrineBuffs;
  onTogglePartyMember: (unitId: string) => void;
  onToggleFavorite: (unitId: string) => void;
  onEvolveMonster: (unitId: string) => void;
  onTrueEvolveMonster: (unitId: string) => void;
  onUpgradeSkillNode: (nodeId: string) => void;
  onRefundSkillNode: (nodeId: string) => void;
  onResetSkillTree: () => void;
  onEquipHeroSkill: (slotIndex: 0 | 1, skillId: string) => void;
  onHealPartyInVillage?: () => void;
  inVillage: boolean;
}

export function PartyPanel({
  save,
  shrineBuffs,
  onTogglePartyMember,
  onToggleFavorite,
  onEvolveMonster,
  onTrueEvolveMonster,
  onUpgradeSkillNode,
  onRefundSkillNode,
  onResetSkillTree,
  onEquipHeroSkill,
  onHealPartyInVillage,
  inVillage,
}: PartyPanelProps) {
  const [subTab, setSubTab] = useState<'party' | 'tree'>('party');
  const [roleFilter, setRoleFilter] = useState<'all' | MonsterRole>('all');
  const [tierFilter, setTierFilter] = useState<'all' | MonsterTier>('all');
  const [elemFilter, setElemFilter] = useState<'all' | ElementType>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [sortKey, setSortKey] = useState<RanchSortKey>('power');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const favoriteSet = useMemo(() => new Set(save.favoriteMonsters ?? []), [save.favoriteMonsters]);

  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );
  const synergies = useMemo(() => computePartySynergies(save), [save]);
  const availableSp = getAvailableSp(save);
  const unlockedSkillIds = useMemo(() => getUnlockedHeroSkillIds(save), [save]);
  const equippedHeroSkills = useMemo(() => getHeroEquippedSkills(save), [save]);

  const ownedMonsters = useMemo(() => {
    const filtered = Object.values(save.roster)
      .filter((u) => u.id !== 'hero')
      .filter((u) => {
        const sp = getSpecies(u.speciesId);
        if (favOnly && !favoriteSet.has(u.id)) return false;
        if (roleFilter !== 'all' && sp.role !== roleFilter) return false;
        if (tierFilter !== 'all' && sp.tier !== tierFilter) return false;
        if (elemFilter !== 'all' && sp.element !== elemFilter) return false;
        return true;
      });
    return sortRanchMonsters(filtered, save, shrineBuffs, invMap, sortKey, sortDir);
  }, [
    save,
    shrineBuffs,
    invMap,
    favOnly,
    favoriteSet,
    roleFilter,
    tierFilter,
    elemFilter,
    sortKey,
    sortDir,
  ]);

  return (
    <div className="panel-body">
      {/* Sub-tabs: Party & Evolution vs Hero Skill Tree */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
        <button
          id="btn-subtab-party"
          type="button"
          className={`rpg-btn sm ${subTab === 'party' ? 'primary' : ''}`}
          onClick={() => setSubTab('party')}
        >
          🐾 パーティ
        </button>
        <button
          id="btn-subtab-skilltree"
          type="button"
          className={`rpg-btn sm ${subTab === 'tree' ? 'primary' : ''}`}
          onClick={() => setSubTab('tree')}
        >
          🌳 スキル SP{availableSp}
        </button>
      </div>

      {subTab === 'party' ? (
        <>
          <div className="section-heading">
            <span>出撃パーティ {save.partyIds.length}/4</span>
            {inVillage && onHealPartyInVillage && (
              <button
                type="button"
                className="rpg-btn sm emerald"
                onClick={onHealPartyInVillage}
              >
                泉で全回復
              </button>
            )}
          </div>

          {/* Party Formation Synergies */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-pixel)', color: '#ffe570' }}>
              ✦ 編成シナジー
            </div>
            {synergies.active.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {synergies.active.map((syn) => (
                  <span
                    key={syn.id}
                    style={{
                      fontSize: 9.5,
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: 'rgba(15, 13, 22, 0.72)',
                      border: `1px solid ${syn.color}`,
                      color: '#fff7e0',
                    }}
                  >
                    <strong style={{ color: syn.color }}>{syn.name}</strong> {syn.desc}
                  </span>
                ))}
              </div>
            ) : (
              <div className="muted-text">未発動</div>
            )}
          </div>

          {/* Active Party Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {save.partyIds.map((pid) => {
              const u = save.roster[pid];
              if (!u) return null;
              const sp = getSpecies(u.speciesId);
              const role = ROLE_LABELS[sp.role];
              const st = computeUnitStats(u, save, shrineBuffs, invMap);
              const nextExp = expForNextLevel(u.level);
              const expPct = Math.min(100, Math.round((u.exp / nextExp) * 100));
              const isMonster = pid !== 'hero';
              const evoReq = getEvolutionRequirement(u);
              const canEvo = canEvolveMonster(u, save.forgeStones);
              const trueReq = getTrueEvolutionRequirement(u);
              const canTrueEvo = canTrueEvolveMonster(u, save.forgeStones);

              return (
                <div key={pid} className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <PixelIcon spriteKey={sp.spriteKey} equipKey={getUnitEquipVisualKey(u, invMap)} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {isMonster && u.trueEvolved ? (
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: 'var(--font-pixel)',
                              padding: '0 4px',
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, #7ce8ff, #ff9ce6, #ffe86b)',
                              color: '#171224',
                              fontWeight: 700,
                            }}
                          >
                            真
                          </span>
                        ) : isMonster && u.evolved ? (
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: 'var(--font-pixel)',
                              padding: '0 4px',
                              borderRadius: 3,
                              background: 'linear-gradient(180deg, #ffe26a, #c9861e)',
                              color: '#1f160a',
                              fontWeight: 700,
                            }}
                          >
                            極
                          </span>
                        ) : null}
                        <strong style={{ fontSize: 11.5 }}>{sp.name}</strong>
                        <span className="role-badge" style={{ background: role.color }}>
                          {role.label}
                        </span>
                        <span style={{ fontSize: 10, color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>
                          Lv.{u.level}
                          {u.awakening > 0 ? ` ★+${u.awakening}` : ''}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isMonster && u.trueEvolved
                          ? '真極：全能力+48%・スキル+30%'
                          : isMonster && u.evolved
                            ? '極進化：全能力+24%・スキル+16%'
                            : `${sp.passiveName}：${sp.passiveDesc}`}
                      </div>
                    </div>
                    {isMonster && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {!u.evolved ? (
                          <button
                            type="button"
                            className={`rpg-btn sm ${canEvo ? 'primary' : ''}`}
                            disabled={!canEvo}
                            onClick={() => onEvolveMonster(pid)}
                            style={{ fontSize: 9.5, padding: '2px 5px' }}
                          >
                            {u.level < evoReq.minLevel
                              ? `Lv${evoReq.minLevel}〜`
                              : `✦極 💎${evoReq.stoneCost}`}
                          </button>
                        ) : !u.trueEvolved ? (
                          <button
                            type="button"
                            className={`rpg-btn sm ${canTrueEvo ? 'primary' : ''}`}
                            disabled={!canTrueEvo}
                            onClick={() => onTrueEvolveMonster(pid)}
                            style={{ fontSize: 9.5, padding: '2px 5px' }}
                          >
                            {u.level < trueReq.minLevel
                              ? `Lv${trueReq.minLevel}〜`
                              : `✦真 💎${trueReq.stoneCost}`}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rpg-btn sm"
                          onClick={() => onTogglePartyMember(pid)}
                          style={{ fontSize: 9.5, padding: '2px 5px' }}
                        >
                          外す
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 10 }}>
                    <span>HP {u.hp}/{st.maxHp}</span>
                    <span>MP {u.mp}/{st.maxMp}</span>
                    <span>ATK {st.atk}</span>
                    <span>MAG {st.mag}</span>
                    <span>DEF {st.def}</span>
                    <span>SPD {st.spd}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>EXP</span>
                    <div className="bar-track" style={{ flex: 1 }}>
                      <div className="bar-fill-exp" style={{ width: `${expPct}%` }} />
                    </div>
                    <span style={{ fontSize: 8.5, color: 'var(--text-dim)' }}>{expPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monster Ranch Roster */}
          <div className="section-heading" style={{ marginTop: 2 }}>
            <span>モンスター牧場 {ownedMonsters.length}/{Math.max(0, Object.keys(save.roster).length - 1)}体</span>
            <button
              id="btn-ranch-fav-filter"
              type="button"
              className={`pill-chip ${favOnly ? 'active' : ''}`}
              style={{ fontSize: 9, padding: '1px 5px' }}
              onClick={() => setFavOnly((v) => !v)}
            >
              ★お気に入り
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2 }}>
              {(
                [
                  ['all', '全役'],
                  ['tank', '盾'],
                  ['striker', '物'],
                  ['mage', '魔'],
                  ['support', '支'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  id={`btn-ranch-role-${val}`}
                  type="button"
                  className={`pill-chip ${roleFilter === val ? 'active' : ''}`}
                  style={{ textAlign: 'center', fontSize: 9, padding: '2px 2px' }}
                  onClick={() => setRoleFilter(val)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
              {(
                [
                  ['all', '全格'],
                  ['normal', 'N'],
                  ['elite', '★E'],
                  ['boss', '☠B'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  id={`btn-ranch-tier-${val}`}
                  type="button"
                  className={`pill-chip ${tierFilter === val ? 'active' : ''}`}
                  style={{ textAlign: 'center', fontSize: 9, padding: '2px 2px' }}
                  onClick={() => setTierFilter(val)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 2 }}>
              {(
                [
                  ['all', '全属'],
                  ['nature', '🌿'],
                  ['earth', '🪨'],
                  ['fire', '🔥'],
                  ['star', '⭐'],
                  ['holy', '✨'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`pill-chip ${elemFilter === val ? 'active' : ''}`}
                  style={{ textAlign: 'center', fontSize: 9, padding: '2px 1px' }}
                  onClick={() => setElemFilter(val)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sort-bar">
              <span className="muted-text" style={{ flexShrink: 0, fontSize: 9.5 }}>
                並替
              </span>
              <select
                id="select-ranch-sort"
                aria-label="モンスター並び替え"
                className="rpg-select"
                value={sortKey}
                onChange={(e) => {
                  const nextKey = e.target.value as RanchSortKey;
                  setSortKey(nextKey);
                  setSortDir(nextKey === 'dex' ? 'asc' : 'desc');
                }}
              >
                {RANCH_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                id="btn-ranch-sort-dir"
                type="button"
                className="rpg-btn sm"
                style={{ flexShrink: 0, height: 24, padding: '0 7px' }}
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                {sortDir === 'desc' ? '↓降順' : '↑昇順'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ownedMonsters.length === 0 && (
              <div className="rpg-card muted-text" style={{ textAlign: 'center', fontSize: 10 }}>
                条件に一致する仲間がいません
              </div>
            )}
            {ownedMonsters.map((u) => {
              const sp = getSpecies(u.speciesId);
              const role = ROLE_LABELS[sp.role];
              const elem = ELEMENT_META[sp.element];
              const inParty = save.partyIds.includes(u.id);
              const isFav = favoriteSet.has(u.id);
              const st = computeUnitStats(u, save, shrineBuffs, invMap);
              const evoReq = getEvolutionRequirement(u);
              const canEvo = canEvolveMonster(u, save.forgeStones);
              const trueReq = getTrueEvolutionRequirement(u);
              const canTrueEvo = canTrueEvolveMonster(u, save.forgeStones);
              const metricTag =
                sortKey === 'atk'
                  ? `ATK${st.atk}`
                  : sortKey === 'mag'
                    ? `MAG${st.mag}`
                    : sortKey === 'def'
                      ? `DEF${st.def}`
                      : sortKey === 'spd'
                        ? `SPD${st.spd}`
                        : sortKey === 'hp'
                          ? `HP${st.maxHp}`
                          : `戦力${st.powerScore}`;

              return (
                <div key={u.id} className="rpg-card" style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <PixelIcon spriteKey={sp.spriteKey} equipKey={getUnitEquipVisualKey(u, invMap)} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                      {u.trueEvolved ? (
                        <span
                          style={{
                            fontSize: 8.5,
                            fontFamily: 'var(--font-pixel)',
                            padding: '0 3px',
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #7ce8ff, #ff9ce6, #ffe86b)',
                            color: '#171224',
                            fontWeight: 700,
                          }}
                        >
                          真
                        </span>
                      ) : u.evolved ? (
                        <span
                          style={{
                            fontSize: 8.5,
                            fontFamily: 'var(--font-pixel)',
                            padding: '0 3px',
                            borderRadius: 3,
                            background: 'linear-gradient(180deg, #ffe26a, #c9861e)',
                            color: '#1f160a',
                            fontWeight: 700,
                          }}
                        >
                          極
                        </span>
                      ) : null}
                      <strong style={{ fontSize: 10.5 }}>{sp.name}</strong>
                      <span style={{ fontSize: 9 }}>{elem.icon}</span>
                      <span className="role-badge" style={{ background: role.color }}>
                        {role.label}
                      </span>
                      <span style={{ fontSize: 9.5, color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>
                        Lv.{u.level}
                        {u.awakening > 0 ? ` ★+${u.awakening}` : ''}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sp.skills[0].name} / {sp.skills[1].name} ・ {metricTag}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    <button
                      type="button"
                      className={`rpg-btn sm ${isFav ? 'primary' : ''}`}
                      onClick={() => onToggleFavorite(u.id)}
                      style={{ fontSize: 9.5, padding: '2px 4px' }}
                      aria-label="お気に入り"
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                    {!u.evolved ? (
                      <button
                        type="button"
                        className={`rpg-btn sm ${canEvo ? 'primary' : ''}`}
                        disabled={!canEvo}
                        onClick={() => onEvolveMonster(u.id)}
                        style={{ fontSize: 9, padding: '2px 5px' }}
                      >
                        {u.level < evoReq.minLevel ? `Lv${evoReq.minLevel}` : `✦💎${evoReq.stoneCost}`}
                      </button>
                    ) : !u.trueEvolved ? (
                      <button
                        type="button"
                        className={`rpg-btn sm ${canTrueEvo ? 'primary' : ''}`}
                        disabled={!canTrueEvo}
                        onClick={() => onTrueEvolveMonster(u.id)}
                        style={{ fontSize: 9, padding: '2px 5px' }}
                      >
                        {u.level < trueReq.minLevel ? `Lv${trueReq.minLevel}` : `真💎${trueReq.stoneCost}`}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`rpg-btn sm ${inParty ? '' : 'emerald'}`}
                      disabled={!inParty && save.partyIds.length >= 4}
                      onClick={() => onTogglePartyMember(u.id)}
                      style={{ fontSize: 9.5, padding: '2px 5px' }}
                    >
                      {inParty ? '編成中' : '編成へ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ===== HERO CONSTELLATION SKILL TREE TAB (PoE-GRADE 103 NODES) ===== */
        <>
          <SkillTreeCanvas
            save={save}
            onUpgradeSkillNode={onUpgradeSkillNode}
            onRefundSkillNode={onRefundSkillNode}
            onResetSkillTree={onResetSkillTree}
          />

          {/* Equipped Hero Skill Slots (2 active slots) */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>装備中スキル</span>
              <span className="muted-text">解放 {unlockedSkillIds.length}/10</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
              {([0, 1] as const).map((slotIdx) => {
                const sk = equippedHeroSkills[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    style={{
                      background: 'rgba(18, 16, 28, 0.72)',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 5,
                      padding: '4px 6px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: 9, color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>
                      枠{slotIdx + 1}・MP{sk.mpCost}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      ✦ {sk.name}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {unlockedSkillIds.map((skId) => {
                const sk = ALL_HERO_SKILLS[skId];
                if (!sk) return null;
                const isSlot0 = equippedHeroSkills[0].id === skId;
                const isSlot1 = equippedHeroSkills[1].id === skId;
                return (
                  <div
                    key={skId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(14, 13, 22, 0.55)',
                      borderRadius: 4,
                      padding: '3px 5px',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sk.name} <span className="muted-text">MP{sk.mpCost}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 8.5,
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sk.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`rpg-btn sm ${isSlot0 ? 'primary' : ''}`}
                      style={{ fontSize: 9, padding: '2px 5px', flexShrink: 0 }}
                      onClick={() => onEquipHeroSkill(0, skId)}
                    >
                      枠1
                    </button>
                    <button
                      type="button"
                      className={`rpg-btn sm ${isSlot1 ? 'emerald' : ''}`}
                      style={{ fontSize: 9, padding: '2px 5px', flexShrink: 0 }}
                      onClick={() => onEquipHeroSkill(1, skId)}
                    >
                      枠2
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
