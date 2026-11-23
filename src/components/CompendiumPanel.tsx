import { useState } from 'react';
import { BIOMES } from '../game/data/biomes';
import { SLOT_LABELS, UNIQUE_TEMPLATES } from '../game/data/equipment';
import { MONSTER_LIST, ROLE_LABELS } from '../game/data/monsters';
import { getCompendiumBonusPct } from '../game/stats';
import type { GameSave } from '../game/types';
import { PixelIcon } from './PixelIcon';

interface CompendiumPanelProps {
  save: GameSave;
}

export function CompendiumPanel({ save }: CompendiumPanelProps) {
  const [subTab, setSubTab] = useState<'monsters' | 'uniques'>('monsters');

  const bonus = getCompendiumBonusPct(
    save.discoveredMonsters.length,
    save.discoveredUniques.length,
  );

  return (
    <div className="panel-body">
      {/* Compendium Completion Bonus Header */}
      <div className="rpg-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: '#ffe570' }}>
            図鑑コンプリート加護
          </div>
          <div className="muted-text">
            全能力 +{bonus.statPct}% / トレハン +{bonus.mfBonus}%
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <div>魔物 {save.discoveredMonsters.length}/{MONSTER_LIST.length}</div>
          <div>固有 {save.discoveredUniques.length}/{UNIQUE_TEMPLATES.length}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
        <button
          type="button"
          className={`rpg-btn sm ${subTab === 'monsters' ? 'primary' : ''}`}
          onClick={() => setSubTab('monsters')}
        >
          魔物図鑑 ({save.discoveredMonsters.length}/{MONSTER_LIST.length})
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${subTab === 'uniques' ? 'primary' : ''}`}
          onClick={() => setSubTab('uniques')}
        >
          固有装備 ({save.discoveredUniques.length}/{UNIQUE_TEMPLATES.length})
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
                      {owned ? `Lv.${owned.level} ★+${owned.awakening}` : sp.passiveDesc}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
      )}
    </div>
  );
}
