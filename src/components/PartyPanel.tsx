import { useMemo } from 'react';
import { getSpecies, ROLE_LABELS } from '../game/data/monsters';
import { computeUnitStats, expForNextLevel } from '../game/stats';
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

      {/* Active Party Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {save.partyIds.map((pid) => {
          const u = save.roster[pid];
          if (!u) return null;
          const sp = getSpecies(u.speciesId);
          const role = ROLE_LABELS[sp.role];
          const st = computeUnitStats(u, save, shrineBuffs, invMap);
          const nextExp = expForNextLevel(u.level);
          const expPct = Math.min(100, Math.round((u.exp / nextExp) * 100));

          return (
            <div key={pid} className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PixelIcon spriteKey={sp.spriteKey} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <strong style={{ fontSize: 13 }}>{sp.name}</strong>
                    <span className="role-badge" style={{ background: role.color }}>
                      {role.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>
                      Lv.{u.level}
                      {u.awakening > 0 ? ` ★+${u.awakening}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    固有: {sp.passiveName}（{sp.passiveDesc}）
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

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 11 }}>
                <span>HP {u.hp}/{st.maxHp}</span>
                <span>MP {u.mp}/{st.maxMp}</span>
                <span>ATK {st.atk}</span>
                <span>MAG {st.mag}</span>
                <span>DEF {st.def}</span>
                <span>SPD {st.spd}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>EXP</span>
                <div className="bar-track" style={{ flex: 1 }}>
                  <div className="bar-fill-exp" style={{ width: `${expPct}%` }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{expPct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monster Ranch Roster */}
      <div className="section-heading" style={{ marginTop: 4 }}>
        <span>モンスター牧場 ({ownedMonsters.length}体)</span>
        <span className="muted-text">撃破で仲間化＆★覚醒</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {ownedMonsters.map((u) => {
          const sp = getSpecies(u.speciesId);
          const role = ROLE_LABELS[sp.role];
          const inParty = save.partyIds.includes(u.id);
          const st = computeUnitStats(u, save, shrineBuffs, invMap);

          return (
            <div key={u.id} className="rpg-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PixelIcon spriteKey={sp.spriteKey} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <strong style={{ fontSize: 12 }}>{sp.name}</strong>
                  <span className="role-badge" style={{ background: role.color }}>
                    {role.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#ffe570', fontFamily: 'var(--font-pixel)' }}>
                    Lv.{u.level}
                    {u.awakening > 0 ? ` ★+${u.awakening}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {sp.skills[0].name} / {sp.skills[1].name} ・ 戦力 {st.powerScore}
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
