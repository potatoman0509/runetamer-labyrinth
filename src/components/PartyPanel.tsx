import { useMemo } from 'react';
import { getSpecies, ROLE_LABELS } from '../game/data/monsters';
import { computeUnitStats, expForNextLevel } from '../game/stats';
import { computePartySynergies } from '../game/synergy';
import type { ActiveShrineBuffs, GameSave } from '../game/types';
import { PixelIcon } from './PixelIcon';

interface PartyPanelProps {
  save: GameSave;
  shrineBuffs: ActiveShrineBuffs;
  onTogglePartyMember: (unitId: string) => void;
  onHealPartyInVillage?: () => void;
  inVillage: boolean;
}

export function PartyPanel({
  save,
  shrineBuffs,
  onTogglePartyMember,
  onHealPartyInVillage,
  inVillage,
}: PartyPanelProps) {
  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );
  const synergies = useMemo(() => computePartySynergies(save), [save]);

  const ownedMonsters = useMemo(() => {
    return Object.values(save.roster)
      .filter((u) => u.id !== 'hero')
      .sort((a, b) => {
        const aIn = save.partyIds.includes(a.id) ? 1 : 0;
        const bIn = save.partyIds.includes(b.id) ? 1 : 0;
        if (aIn !== bIn) return bIn - aIn;
        return computeUnitStats(b, save, shrineBuffs, invMap).powerScore -
          computeUnitStats(a, save, shrineBuffs, invMap).powerScore;
      });
  }, [save, shrineBuffs, invMap]);

  return (
    <div className="panel-body">
      <div className="section-heading">
        <span>出撃パーティ ({save.partyIds.length}/4)</span>
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
          ✦ パーティ編成シナジー
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
          <div className="muted-text">
            同属性2体以上や「前衛＋火力＋支援」バランス編成で強力なパーティバフが発動！
          </div>
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

          return (
            <div key={pid} className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <PixelIcon spriteKey={sp.spriteKey} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
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
                    {sp.passiveName}（{sp.passiveDesc}）
                  </div>
                </div>
                {pid !== 'hero' && (
                  <button
                    type="button"
                    className="rpg-btn sm"
                    onClick={() => onTogglePartyMember(pid)}
                  >
                    外す
                  </button>
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
        <span>モンスター牧場 ({ownedMonsters.length}体)</span>
        <span className="muted-text">撃破で仲間化＆★覚醒</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ownedMonsters.map((u) => {
          const sp = getSpecies(u.speciesId);
          const role = ROLE_LABELS[sp.role];
          const inParty = save.partyIds.includes(u.id);
          const st = computeUnitStats(u, save, shrineBuffs, invMap);

          return (
            <div key={u.id} className="rpg-card" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <PixelIcon spriteKey={sp.spriteKey} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 11 }}>{sp.name}</strong>
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
                  {sp.skills[0].name} / {sp.skills[1].name} ・ 戦力{st.powerScore}
                </div>
              </div>
              <button
                type="button"
                className={`rpg-btn sm ${inParty ? '' : 'emerald'}`}
                disabled={!inParty && save.partyIds.length >= 4}
                onClick={() => onTogglePartyMember(u.id)}
              >
                {inParty ? '編成中' : '編成へ'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
