import { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  getClaimedAchievementBonuses,
  getUnclaimedAchievements,
} from '../game/achievements';
import { ELEMENT_META, getBossGimmick, getWeaknessElementFor } from '../game/bossGimmicks';
import { BIOMES } from '../game/data/biomes';
import { SLOT_LABELS, UNIQUE_TEMPLATES } from '../game/data/equipment';
import {
  BOSS_MONSTERS,
  ELITE_MONSTERS,
  MONSTER_LIST,
  NORMAL_MONSTERS,
  ROLE_LABELS,
  TIER_LABELS,
} from '../game/data/monsters';
import { getCompendiumBonusPct } from '../game/stats';
import type { GameSave, MonsterSpecies, MonsterTier } from '../game/types';
import { PixelIcon } from './PixelIcon';

interface CompendiumPanelProps {
  save: GameSave;
  onClaimAchievement: (achievementId: string) => void;
}

export function CompendiumPanel({ save, onClaimAchievement }: CompendiumPanelProps) {
  const [subTab, setSubTab] = useState<'monsters' | 'uniques' | 'achievements'>('monsters');
  const [tierFilter, setTierFilter] = useState<'all' | MonsterTier>('all');
  const [inspectMonster, setInspectMonster] = useState<MonsterSpecies | null>(null);

  const encounteredSet = useMemo(
    () => new Set([...(save.encounteredMonsters ?? []), ...save.discoveredMonsters]),
    [save.encounteredMonsters, save.discoveredMonsters],
  );
  const capturedSet = useMemo(() => new Set(save.discoveredMonsters), [save.discoveredMonsters]);

  const bonus = getCompendiumBonusPct(
    save.discoveredMonsters.length,
    save.discoveredUniques.length,
  );
  const achBonus = getClaimedAchievementBonuses(save);
  const unclaimedList = useMemo(() => getUnclaimedAchievements(save), [save]);
  const claimedSet = useMemo(() => new Set(save.claimedAchievements ?? []), [save.claimedAchievements]);

  const filteredMonsters = useMemo(() => {
    if (tierFilter === 'all') return MONSTER_LIST;
    return MONSTER_LIST.filter((m) => m.tier === tierFilter);
  }, [tierFilter]);

  const sortedAchievements = useMemo(() => {
    return [...ACHIEVEMENTS].sort((a, b) => {
      const aClaimed = claimedSet.has(a.id);
      const bClaimed = claimedSet.has(b.id);
      const aReady = !aClaimed && a.getValue(save) >= a.target;
      const bReady = !bClaimed && b.getValue(save) >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
      return 0;
    });
  }, [save, claimedSet]);

  return (
    <div className="panel-body">
      {/* Compendium & Achievement Permanent Bonus Header */}
      <div className="rpg-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ffe570' }}>
            図鑑＆実績の恒久加護
          </div>
          <div className="muted-text">
            全能力 +{bonus.statPct + achBonus.statPct}% / MF +{bonus.mfBonus + achBonus.mfBonus}% / SP +{achBonus.bonusSp}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, flexShrink: 0 }}>
          <div>👑{capturedSet.size} / 👁{encounteredSet.size}/{MONSTER_LIST.length}</div>
          <div>実績 {claimedSet.size}/{ACHIEVEMENTS.length}</div>
        </div>
      </div>

      {/* 3 Sub-tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
        <button
          type="button"
          className={`rpg-btn sm ${subTab === 'monsters' ? 'primary' : ''}`}
          onClick={() => setSubTab('monsters')}
        >
          魔物 {encounteredSet.size}
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${subTab === 'uniques' ? 'primary' : ''}`}
          onClick={() => setSubTab('uniques')}
        >
          固有 {save.discoveredUniques.length}
        </button>
        <button
          id="btn-subtab-achievements"
          type="button"
          className={`rpg-btn sm ${subTab === 'achievements' ? 'primary' : unclaimedList.length > 0 ? 'emerald' : ''}`}
          onClick={() => setSubTab('achievements')}
        >
          🏆実績 {unclaimedList.length > 0 ? `+${unclaimedList.length}` : claimedSet.size}
        </button>
      </div>

      {subTab === 'monsters' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 3 }}>
            <button
              id="btn-comp-tier-all"
              type="button"
              className={`pill-chip ${tierFilter === 'all' ? 'active' : ''}`}
              style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9.5 }}
              onClick={() => setTierFilter('all')}
            >
              全{MONSTER_LIST.length}
            </button>
            <button
              id="btn-comp-tier-normal"
              type="button"
              className={`pill-chip ${tierFilter === 'normal' ? 'active' : ''}`}
              style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9.5 }}
              onClick={() => setTierFilter('normal')}
            >
              N {NORMAL_MONSTERS.length}
            </button>
            <button
              id="btn-comp-tier-elite"
              type="button"
              className={`pill-chip ${tierFilter === 'elite' ? 'active' : ''}`}
              style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9.5 }}
              onClick={() => setTierFilter('elite')}
            >
              ★E {ELITE_MONSTERS.length}
            </button>
            <button
              id="btn-comp-tier-boss"
              type="button"
              className={`pill-chip ${tierFilter === 'boss' ? 'active' : ''}`}
              style={{ textAlign: 'center', padding: '3px 2px', fontSize: 9.5 }}
              onClick={() => setTierFilter('boss')}
            >
              ☠B {BOSS_MONSTERS.length}
            </button>
          </div>
          <div className="compendium-grid">
            {filteredMonsters.map((sp) => {
              const seen = encounteredSet.has(sp.id);
              const captured = capturedSet.has(sp.id);
              const owned = save.roster[sp.id];
              const role = ROLE_LABELS[sp.role];
              const elem = ELEMENT_META[sp.element];
              const biomeName =
                sp.biome === 'special'
                  ? '希少'
                  : sp.biome !== 'hero'
                    ? BIOMES[sp.biome].shortName
                    : '';

              return (
                <button
                  key={sp.id}
                  id={`comp-card-${sp.id}`}
                  type="button"
                  className="rpg-card"
                  disabled={!seen}
                  onClick={() => {
                    if (seen) setInspectMonster(sp);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    opacity: seen ? 1 : 0.62,
                    textAlign: 'left',
                    cursor: seen ? 'pointer' : 'default',
                    borderColor:
                      sp.tier === 'boss' && seen
                        ? 'var(--border-gold)'
                        : sp.tier === 'elite' && seen
                          ? '#a865e8'
                          : undefined,
                  }}
                >
                  <PixelIcon spriteKey={sp.spriteKey} size={24} silhouette={!seen} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color:
                          sp.tier === 'boss' && seen
                            ? '#ffe570'
                            : sp.tier === 'elite' && seen
                              ? '#dfb3ff'
                              : 'var(--text-main)',
                      }}
                    >
                      {captured ? '👑' : ''}
                      {seen ? sp.name : '？？？'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1, minWidth: 0 }}>
                      <span className="role-badge" style={{ background: role.color, fontSize: 8.5 }}>
                        {role.label}
                      </span>
                      {seen && <span style={{ fontSize: 8.5 }}>{elem.icon}</span>}
                      <span
                        style={{
                          fontSize: 8.5,
                          color:
                            sp.tier === 'boss'
                              ? '#ffe570'
                              : sp.tier === 'elite'
                                ? '#d5a4ff'
                                : 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {biomeName}
                        {sp.tier === 'boss' ? '☠' : sp.tier === 'elite' ? '★' : ''}
                      </span>
                    </div>
                    {seen && (
                      <div
                        style={{
                          fontSize: 8.5,
                          color: captured ? '#9ee8ad' : '#9cc8ff',
                          marginTop: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {owned
                          ? `${owned.trueEvolved ? '【真】' : owned.evolved ? '【極】' : ''}Lv.${owned.level} ★+${owned.awakening}`
                          : '遭遇済・タップで詳細'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {inspectMonster && (() => {
            const sp = inspectMonster;
            const elem = ELEMENT_META[sp.element];
            const weak = getWeaknessElementFor(sp.element);
            const weakMeta = weak ? ELEMENT_META[weak] : null;
            const role = ROLE_LABELS[sp.role];
            const tierMeta = TIER_LABELS[sp.tier];
            const gimmick = getBossGimmick(sp.id);
            const captured = capturedSet.has(sp.id);
            const biomeLabel =
              sp.biome === 'special'
                ? '怪しい宝箱・希少'
                : sp.biome !== 'hero'
                  ? BIOMES[sp.biome].name
                  : '';
            return (
              <div
                id="compendium-detail-modal"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(6, 5, 12, 0.82)',
                  zIndex: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                }}
                onClick={() => setInspectMonster(null)}
              >
                <div
                  className="rpg-card-gold"
                  style={{
                    width: '100%',
                    maxWidth: 300,
                    maxHeight: '86vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: 10,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PixelIcon spriteKey={sp.spriteKey} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ffe570' }}>
                        {captured ? '👑' : ''}
                        {sp.name}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, fontSize: 9.5 }}>
                        <span className="role-badge" style={{ background: tierMeta.color }}>
                          {tierMeta.label}
                        </span>
                        <span className="role-badge" style={{ background: role.color }}>
                          {role.label}
                        </span>
                        <span style={{ color: elem.color }}>
                          {elem.icon}{elem.label}
                        </span>
                        {weakMeta && (
                          <span style={{ color: '#ff9696' }}>
                            弱点:{weakMeta.icon}{weakMeta.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="muted-text" style={{ fontSize: 9.5 }}>
                    出現: {biomeLabel} / 状態: {captured ? '👑捕獲済' : '👁遭遇済'}
                  </div>

                  {gimmick && (
                    <div
                      style={{
                        background: 'rgba(180, 32, 54, 0.25)',
                        border: '1px solid #ff667a',
                        borderRadius: 5,
                        padding: '4px 6px',
                        fontSize: 9.5,
                        color: '#ffd1d8',
                      }}
                    >
                      ⚙ ボス特性「{gimmick.name}」: {gimmick.shortDesc}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 4,
                      fontSize: 9.5,
                      background: 'rgba(10, 9, 16, 0.55)',
                      borderRadius: 5,
                      padding: 6,
                    }}
                  >
                    <div>HP {sp.baseStats.hp} (+{sp.growth.hp})</div>
                    <div>MP {sp.baseStats.mp} (+{sp.growth.mp})</div>
                    <div>ATK {sp.baseStats.atk} (+{sp.growth.atk})</div>
                    <div>MAG {sp.baseStats.mag} (+{sp.growth.mag})</div>
                    <div>DEF {sp.baseStats.def} (+{sp.growth.def})</div>
                    <div>SPD {sp.baseStats.spd} (+{sp.growth.spd})</div>
                  </div>

                  <div style={{ fontSize: 10, color: '#9ee8ad' }}>
                    ✦ 固有特性「{sp.passiveName}」: {sp.passiveDesc}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sp.skills.map((sk) => {
                      const sElem = ELEMENT_META[sk.element];
                      return (
                        <div
                          key={sk.id}
                          style={{
                            background: 'rgba(15, 13, 24, 0.72)',
                            border: '1px solid var(--border-dim)',
                            borderRadius: 5,
                            padding: '4px 6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700 }}>
                            <span>
                              {sElem.icon} {sk.name}
                            </span>
                            <span style={{ color: '#72d2ff' }}>MP{sk.mpCost}</span>
                          </div>
                          <div className="muted-text" style={{ fontSize: 9 }}>{sk.description}</div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    id="btn-close-comp-modal"
                    type="button"
                    className="rpg-btn sm primary"
                    onClick={() => setInspectMonster(null)}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      ) : subTab === 'uniques' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {UNIQUE_TEMPLATES.map((u) => {
            const found = save.discoveredUniques.includes(u.id);
            return (
              <div
                key={u.id}
                className="rpg-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: found ? '#e89b2d' : undefined,
                  opacity: found ? 1 : 0.62,
                }}
              >
                <PixelIcon spriteKey={u.iconKey} size={22} silhouette={!found} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: found ? '#ffb84d' : 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {found ? `★${u.name}` : `？？？・${SLOT_LABELS[u.slot]}・T${u.minTier}+`}
                  </div>
                  <div style={{ fontSize: 9.5, color: found ? '#fff2bd' : 'var(--text-dim)', lineHeight: 1.25 }}>
                    {found ? u.desc : '未発見の固有装備'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== 18 ACHIEVEMENTS TAB ===== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortedAchievements.map((ach) => {
            const val = ach.getValue(save);
            const pct = Math.min(100, Math.round((val / ach.target) * 100));
            const isClaimed = claimedSet.has(ach.id);
            const canClaim = !isClaimed && val >= ach.target;

            return (
              <div
                key={ach.id}
                className={canClaim ? 'rpg-card-gold' : 'rpg-card'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isClaimed ? 0.72 : 1,
                  minWidth: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 11, color: canClaim ? '#ffe570' : isClaimed ? '#82ff9e' : undefined }}>
                      {isClaimed ? '✓ ' : canClaim ? '★ ' : ''}
                      {ach.title}
                    </strong>
                    <span className="muted-text" style={{ fontSize: 9 }}>
                      {Math.min(val, ach.target)}/{ach.target}
                    </span>
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.25 }}>
                    {ach.desc}・全能力+{ach.permStatPct}% / MF+{ach.permMf}%
                  </div>
                  <div className="bar-track" style={{ marginTop: 3, height: 4 }}>
                    <div
                      className={isClaimed || canClaim ? 'bar-fill-hp' : 'bar-fill-exp'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {canClaim ? (
                  <button
                    id={`btn-claim-ach-${ach.id}`}
                    type="button"
                    className="rpg-btn sm primary"
                    style={{ flexShrink: 0, fontSize: 9.5, padding: '4px 6px' }}
                    onClick={() => onClaimAchievement(ach.id)}
                  >
                    受取
                    <br />
                    💎+{ach.rewardStones} SP+{ach.rewardSp}
                  </button>
                ) : (
                  <div
                    style={{
                      flexShrink: 0,
                      textAlign: 'right',
                      fontSize: 9,
                      color: isClaimed ? '#82ff9e' : 'var(--text-dim)',
                      fontFamily: 'var(--font-pixel)',
                    }}
                  >
                    {isClaimed ? '受取済' : `💎+${ach.rewardStones}\nSP+${ach.rewardSp}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
