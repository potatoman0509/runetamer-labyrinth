import { useMemo, useState } from 'react';
import { getSpecies, ROLE_LABELS } from '../game/data/monsters';
import {
  ALL_HERO_SKILLS,
  BRANCH_META,
  canUpgradeSkillNode,
  getAvailableSp,
  getHeroEquippedSkills,
  getSpentSp,
  getTotalEarnedSp,
  getUnlockedHeroSkillIds,
  SKILL_TREE_NODES,
  type SkillBranch,
} from '../game/skillTree';
import {
  canEvolveMonster,
  computeUnitStats,
  expForNextLevel,
  getEvolutionRequirement,
} from '../game/stats';
import { computePartySynergies } from '../game/synergy';
import type { ActiveShrineBuffs, GameSave } from '../game/types';
import { PixelIcon } from './PixelIcon';

interface PartyPanelProps {
  save: GameSave;
  shrineBuffs: ActiveShrineBuffs;
  onTogglePartyMember: (unitId: string) => void;
  onEvolveMonster: (unitId: string) => void;
  onUpgradeSkillNode: (nodeId: string) => void;
  onResetSkillTree: () => void;
  onEquipHeroSkill: (slotIndex: 0 | 1, skillId: string) => void;
  onHealPartyInVillage?: () => void;
  inVillage: boolean;
}

export function PartyPanel({
  save,
  shrineBuffs,
  onTogglePartyMember,
  onEvolveMonster,
  onUpgradeSkillNode,
  onResetSkillTree,
  onEquipHeroSkill,
  onHealPartyInVillage,
  inVillage,
}: PartyPanelProps) {
  const [subTab, setSubTab] = useState<'party' | 'tree'>('party');
  const [branch, setBranch] = useState<SkillBranch>('sword');

  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );
  const synergies = useMemo(() => computePartySynergies(save), [save]);
  const availableSp = getAvailableSp(save);
  const totalSp = getTotalEarnedSp(save);
  const spentSp = getSpentSp(save);
  const unlockedSkillIds = useMemo(() => getUnlockedHeroSkillIds(save), [save]);
  const equippedHeroSkills = useMemo(() => getHeroEquippedSkills(save), [save]);

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

  const branchNodes = useMemo(
    () => SKILL_TREE_NODES.filter((n) => n.branch === branch).sort((a, b) => a.tier - b.tier),
    [branch],
  );

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
              <div className="muted-text">
                同属性や役割の組み合わせでシナジー発動
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
              const isMonster = pid !== 'hero';
              const evoReq = getEvolutionRequirement(u);
              const canEvo = canEvolveMonster(u, save.forgeStones);

              return (
                <div key={pid} className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <PixelIcon spriteKey={sp.spriteKey} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {isMonster && u.evolved && (
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
                        )}
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
                        {isMonster && u.evolved
                          ? '極進化：全能力+35%・スキル+25%'
                          : `${sp.passiveName}：${sp.passiveDesc}`}
                      </div>
                    </div>
                    {isMonster && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {!u.evolved && (
                          <button
                            type="button"
                            className={`rpg-btn sm ${canEvo ? 'primary' : ''}`}
                            disabled={!canEvo}
                            title={evoReq.discounted ? '★+2割引' : 'Lv10以上と鍛冶石で極進化'}
                            onClick={() => onEvolveMonster(pid)}
                            style={{ fontSize: 9.5, padding: '2px 5px' }}
                          >
                            {u.level < evoReq.minLevel
                              ? `Lv${evoReq.minLevel}〜`
                              : `✦極 💎${evoReq.stoneCost}`}
                          </button>
                        )}
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
            <span>モンスター牧場 {ownedMonsters.length}体</span>
            <span className="muted-text">Lv10から極進化</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ownedMonsters.map((u) => {
              const sp = getSpecies(u.speciesId);
              const role = ROLE_LABELS[sp.role];
              const inParty = save.partyIds.includes(u.id);
              const st = computeUnitStats(u, save, shrineBuffs, invMap);
              const evoReq = getEvolutionRequirement(u);
              const canEvo = canEvolveMonster(u, save.forgeStones);

              return (
                <div key={u.id} className="rpg-card" style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <PixelIcon spriteKey={sp.spriteKey} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                      {u.evolved && (
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
                      )}
                      <strong style={{ fontSize: 10.5 }}>{sp.name}</strong>
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
                      {sp.skills[0].name} / {sp.skills[1].name} ・ 戦力{st.powerScore}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {!u.evolved && (
                      <button
                        type="button"
                        className={`rpg-btn sm ${canEvo ? 'primary' : ''}`}
                        disabled={!canEvo}
                        onClick={() => onEvolveMonster(u.id)}
                        style={{ fontSize: 9, padding: '2px 5px' }}
                      >
                        {u.level < evoReq.minLevel ? `Lv${evoReq.minLevel}` : `✦💎${evoReq.stoneCost}`}
                      </button>
                    )}
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
        /* ===== HERO SKILL TREE TAB ===== */
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ffe570' }}>
                  主人公スキルツリー
                </div>
                <div style={{ fontSize: 10, color: '#fff2bd' }}>
                  残りSP <strong style={{ color: '#82ff9e', fontSize: 12 }}>{availableSp}</strong> / 累計 {totalSp}
                </div>
              </div>
              <button
                id="btn-reset-skilltree"
                type="button"
                className="rpg-btn sm"
                disabled={!inVillage || spentSp === 0}
                onClick={onResetSkillTree}
              >
                SPリセット
              </button>
            </div>
            <div className="muted-text">
              LvUP・世界ランク・実績でSP獲得。村で無料リセット可。
            </div>
          </div>

          {/* Equipped Hero Skill Slots (2 active slots) */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>装備中スキル</span>
              <span className="muted-text">解放 {unlockedSkillIds.length}/8</span>
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

          {/* 3 Branch Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
            {(['sword', 'magic', 'command'] as const).map((b) => {
              const meta = BRANCH_META[b];
              const pts = SKILL_TREE_NODES.filter((n) => n.branch === b).reduce(
                (s, n) => s + (save.heroSkillTree[n.id] ?? 0),
                0,
              );
              return (
                <button
                  key={b}
                  type="button"
                  className={`rpg-btn sm ${branch === b ? 'primary' : ''}`}
                  onClick={() => setBranch(b)}
                  style={{ fontSize: 10 }}
                >
                  {meta.label} {pts}
                </button>
              );
            })}
          </div>

          {/* Branch Nodes (Tier 1 -> Tier 5) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {branchNodes.map((node) => {
              const cur = save.heroSkillTree[node.id] ?? 0;
              const maxed = cur >= node.maxLevel;
              const reqMet = !node.requires || (save.heroSkillTree[node.requires] ?? 0) > 0;
              const upgradeable = canUpgradeSkillNode(save, node.id);
              const meta = BRANCH_META[node.branch];

              return (
                <div
                  key={node.id}
                  className={cur > 0 ? 'rpg-card-gold' : 'rpg-card'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: reqMet ? 1 : 0.62,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: cur > 0 ? meta.color : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-pixel)',
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    T{node.tier}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 11, color: node.unlocksSkillId ? '#ffe570' : undefined }}>
                        {node.name}
                      </strong>
                      <span style={{ fontSize: 9.5, fontFamily: 'var(--font-pixel)', color: maxed ? '#82ff9e' : '#cbd4e8' }}>
                        Lv.{cur}/{node.maxLevel}
                      </span>
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.25 }}>
                      {node.desc}
                    </div>
                  </div>
                  <button
                    id={`btn-skill-node-${node.id}`}
                    type="button"
                    className={`rpg-btn sm ${upgradeable ? 'primary' : ''}`}
                    style={{ flexShrink: 0, fontSize: 10, padding: '4px 7px' }}
                    disabled={!upgradeable}
                    onClick={() => onUpgradeSkillNode(node.id)}
                  >
                    {maxed ? 'MAX' : !reqMet ? '🔒' : '+1 SP'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
