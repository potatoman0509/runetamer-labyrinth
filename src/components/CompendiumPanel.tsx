import { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  getClaimedAchievementBonuses,
  getUnclaimedAchievements,
} from '../game/achievements';
import { BIOMES } from '../game/data/biomes';
import { SLOT_LABELS, UNIQUE_TEMPLATES } from '../game/data/equipment';
import { MONSTER_LIST, ROLE_LABELS } from '../game/data/monsters';
import { getCompendiumBonusPct } from '../game/stats';
import type { GameSave } from '../game/types';
import { PixelIcon } from './PixelIcon';

interface CompendiumPanelProps {
  save: GameSave;
  onClaimAchievement: (achievementId: string) => void;
}

export function CompendiumPanel({ save, onClaimAchievement }: CompendiumPanelProps) {
  const [subTab, setSubTab] = useState<'monsters' | 'uniques' | 'achievements'>('monsters');

  const bonus = getCompendiumBonusPct(
    save.discoveredMonsters.length,
    save.discoveredUniques.length,
  );
  const achBonus = getClaimedAchievementBonuses(save);
  const unclaimedList = useMemo(() => getUnclaimedAchievements(save), [save]);
  const claimedSet = useMemo(() => new Set(save.claimedAchievements ?? []), [save.claimedAchievements]);

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
          <div>魔物 {save.discoveredMonsters.length}/{MONSTER_LIST.length}</div>
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
          魔物 ({save.discoveredMonsters.length})
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${subTab === 'uniques' ? 'primary' : ''}`}
          onClick={() => setSubTab('uniques')}
        >
          固有 ({save.discoveredUniques.length})
        </button>
        <button
          id="btn-subtab-achievements"
          type="button"
          className={`rpg-btn sm ${subTab === 'achievements' ? 'primary' : unclaimedList.length > 0 ? 'emerald' : ''}`}
          onClick={() => setSubTab('achievements')}
        >
          🏆実績{unclaimedList.length > 0 ? `(${unclaimedList.length}!)` : `(${claimedSet.size})`}
        </button>
      </div>

      {subTab === 'monsters' ? (
        <div className="compendium-grid">
          {MONSTER_LIST.map((sp) => {
            const found = save.discoveredMonsters.includes(sp.id);
            const owned = save.roster[sp.id];
            const role = ROLE_LABELS[sp.role];
            const biomeName =
              sp.biome === 'special'
                ? '希少'
                : sp.biome !== 'hero'
                  ? BIOMES[sp.biome].shortName
                  : '';

            return (
              <div
                key={sp.id}
                className="rpg-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: found ? 1 : 0.65,
                  borderColor: sp.isBoss && found ? 'var(--border-gold)' : undefined,
                }}
              >
                <PixelIcon spriteKey={sp.spriteKey} size={24} silhouette={!found} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: sp.isBoss && found ? '#ffe570' : 'var(--text-main)',
                    }}
                  >
                    {found ? sp.name : '？？？'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1, minWidth: 0 }}>
                    <span className="role-badge" style={{ background: role.color, fontSize: 8.5 }}>
                      {role.label}
                    </span>
                    <span
                      style={{
                        fontSize: 8.5,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {biomeName}
                      {sp.isBoss ? '★' : ''}
                    </span>
                  </div>
                  {found && (
                    <div
                      style={{
                        fontSize: 8.5,
                        color: '#9ee8ad',
                        marginTop: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {owned
                        ? `${owned.evolved ? '【極】' : ''}Lv.${owned.level} ★+${owned.awakening}`
                        : sp.passiveDesc}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                    {found ? `★${u.name}` : `？？？ (${SLOT_LABELS[u.slot]} / T${u.minTier}+)`}
                  </div>
                  <div style={{ fontSize: 9.5, color: found ? '#fff2bd' : 'var(--text-dim)', lineHeight: 1.25 }}>
                    {found ? u.desc : 'レジェンド・ミシック装備ドロップで発見'}
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
                      ({Math.min(val, ach.target)}/{ach.target})
                    </span>
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.25 }}>
                    {ach.desc} ・ 永続:全能力+{ach.permStatPct}%/MF+{ach.permMf}%
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
