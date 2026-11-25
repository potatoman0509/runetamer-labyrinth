import { useState } from 'react';
import {
  findBattleUnit,
  getSkillMpCost,
  getUnitEffectiveElement,
  isElementalWeakness,
  type PlayerActionCommand,
} from '../game/battle';
import {
  ELEMENT_META,
  getBossGimmick,
  getWeaknessElementFor,
} from '../game/bossGimmicks';
import { BOSS_RUSH_MAX_WAVE } from '../game/bossRush';
import { RARITY_META, SET_MAP, UNIQUE_MAP } from '../game/data/equipment';
import { getSpecies, ROLE_LABELS } from '../game/data/monsters';
import type {
  BattleSpeed,
  BattleState,
  BattleTactic,
  GameSettings,
} from '../game/types';
import { toRoman } from '../game/worldTier';
import { PixelIcon } from './PixelIcon';

interface BattlePanelProps {
  battle: BattleState;
  settings: GameSettings;
  selectedEnemyUid: string | null;
  onSelectEnemy: (uid: string) => void;
  onCommand: (cmd: PlayerActionCommand) => void;
  onToggleAuto: () => void;
  onCycleSpeed: () => void;
  onCycleTactic: () => void;
  onFinishBattle: () => void;
  onNextBossRushWave?: () => void;
  onOpenGearFromLoot: (itemId: string) => void;
}

const TACTIC_LABELS: Record<BattleTactic, string> = {
  balanced: '作戦:バランス',
  allout: '作戦:全力',
  conserve: '作戦:節約',
};

const SPEED_LABELS: Record<BattleSpeed, string> = {
  1: '1x',
  2: '2x',
  4: '4x',
};

export function BattlePanel({
  battle,
  settings,
  selectedEnemyUid,
  onSelectEnemy,
  onCommand,
  onToggleAuto,
  onCycleSpeed,
  onCycleTactic,
  onFinishBattle,
  onNextBossRushWave,
  onOpenGearFromLoot,
}: BattlePanelProps) {
  const [inspectAllyUid, setInspectAllyUid] = useState<string | null>(null);
  const activeUnit = findBattleUnit(battle, battle.activeUid);
  const canPlayerAct =
    battle.phase === 'player_input' &&
    Boolean(activeUnit?.isAlly) &&
    !settings.autoBattle;
  const canSwiftAct =
    battle.phase === 'player_input' && Boolean(activeUnit?.isAlly);
  const potionsBlocked = battle.activeTrials.includes('no_potions');

  const lastLogs = battle.logs.slice(-2);

  if (battle.phase === 'victory' && battle.reward) {
    const r = battle.reward;
    const isBossRush = Boolean(battle.bossRushWave);
    const hasNextWave = Boolean(
      battle.bossRushWave && battle.bossRushWave < BOSS_RUSH_MAX_WAVE,
    );
    const isBossRushClear = battle.bossRushWave === BOSS_RUSH_MAX_WAVE;

    return (
      <div className="panel-body">
        <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, color: '#ffe570' }}>
              {isBossRush ? `★ Wave ${battle.bossRushWave}/${BOSS_RUSH_MAX_WAVE} 突破` : '★ 戦闘勝利'}
            </span>
            <span className="muted-text">
              EXP+{r.exp.toLocaleString()} / {r.gold.toLocaleString()}G / 💎+{r.forgeStones}
            </span>
          </div>

          {isBossRushClear && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(242, 178, 56, 0.35), rgba(168, 72, 24, 0.32))',
                border: '1px solid #ffe570',
                borderRadius: 6,
                padding: '7px 8px',
                fontFamily: 'var(--font-pixel)',
                fontSize: 12,
                color: '#fff6cc',
                textAlign: 'center',
              }}
            >
              🏆 闘技場 全{BOSS_RUSH_MAX_WAVE}Wave制覇・ミシック獲得
            </div>
          )}

          {r.worldTierUnlocked && (
            <div
              style={{
                background: 'rgba(219, 138, 36, 0.25)',
                border: '1px solid #ffcf5c',
                borderRadius: 6,
                padding: '6px 8px',
                fontFamily: 'var(--font-pixel)',
                fontSize: 12,
                color: '#fff2b3',
                textAlign: 'center',
              }}
            >
              世界ランク Tier {toRoman(r.worldTierUnlocked)} 解放
            </div>
          )}

          {r.leveledUpIds.length > 0 && (
            <div style={{ fontSize: 11.5, color: '#82ff9e', fontWeight: 700 }}>
              LEVEL UP {r.leveledUpIds.map((id) => getSpecies(id).name).join(' / ')}
            </div>
          )}

          {r.benchLeveledUpIds && r.benchLeveledUpIds.length > 0 && (
            <div style={{ fontSize: 10, color: '#9cc8ff' }}>
              控えLV UP: {r.benchLeveledUpIds.slice(0, 4).map((id) => getSpecies(id).name).join('・')}
              {r.benchLeveledUpIds.length > 4 ? ` ほか${r.benchLeveledUpIds.length - 4}` : ''}
            </div>
          )}

          {r.recruited.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {r.recruited.map((rec) => {
                const sp = getSpecies(rec.speciesId);
                return (
                  <div
                    key={rec.speciesId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(54, 143, 85, 0.22)',
                      border: '1px solid #6be088',
                      borderRadius: 6,
                      padding: '4px 8px',
                    }}
                  >
                    <PixelIcon spriteKey={sp.spriteKey} size={24} />
                    <div style={{ fontSize: 11.5 }}>
                      <strong style={{ color: '#99ffad' }}>
                        {sp.name}
                      </strong>{' '}
                      {rec.isNew
                        ? 'が仲間になった'
                        : `が覚醒 ★+${rec.newAwakening}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {r.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="muted-text">獲得装備</div>
              {r.items.map((item) => {
                const rm = RARITY_META[item.rarity];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="item-row"
                    style={{ borderColor: rm.border, background: rm.bg }}
                    onClick={() => onOpenGearFromLoot(item.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <PixelIcon spriteKey={item.iconKey} size={24} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: rm.color,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </div>
                        <div className="muted-text">
                          iLv.{item.itemLevel} {rm.label}
                          {item.uniqueDesc ? ` / 固有` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10.5, color: '#fff3c7', flexShrink: 0 }}>
                      装備 ›
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {r.autoProcessedCount > 0 && (
            <div className="muted-text">
              {r.autoProcessedMode === 'salvage'
                ? `自動分解 ${r.autoProcessedCount}点 → 💎+${r.autoSalvagedStones}`
                : `自動売却 ${r.autoProcessedCount}点 → +${r.autoSoldGold.toLocaleString()}G`}
            </div>
          )}

          {hasNextWave && onNextBossRushWave ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 5 }}>
              <button
                id="btn-boss-rush-next"
                type="button"
                className="rpg-btn primary"
                style={{ padding: '9px 6px' }}
                onClick={onNextBossRushWave}
              >
                🏟 Wave {(battle.bossRushWave ?? 1) + 1}/{BOSS_RUSH_MAX_WAVE} へ
              </button>
              <button
                id="btn-battle-continue"
                type="button"
                className="rpg-btn"
                style={{ padding: '9px 6px' }}
                onClick={onFinishBattle}
              >
                村へ撤退
              </button>
            </div>
          ) : (
            <button
              id="btn-battle-continue"
              type="button"
              className="rpg-btn primary"
              style={{ width: '100%', padding: '9px' }}
              onClick={onFinishBattle}
            >
              {isBossRush ? '始まりの村へ戻る' : '探索に戻る'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (battle.phase === 'defeat' || battle.phase === 'fled') {
    return (
      <div className="panel-body">
        <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, color: '#ff8a8a' }}>
            {battle.phase === 'defeat' ? '☠ 全滅' : '撤退'}
          </div>
          <div className="muted-text">
            {battle.phase === 'defeat'
              ? battle.bossRushWave
                ? `Wave ${battle.bossRushWave} 敗北`
                : '所持金-15%・村へ帰還'
              : '戦闘離脱'}
          </div>
          <button
            id="btn-battle-retreat-ok"
            type="button"
            className="rpg-btn primary"
            onClick={onFinishBattle}
          >
            {battle.phase === 'defeat' ? '始まりの村へ戻る' : '探索に戻る'}
          </button>
        </div>
      </div>
    );
  }

  const chargingEnemy = battle.enemies.find((e) => e.hp > 0 && e.charging);
  const livingBosses = battle.enemies.filter((e) => e.hp > 0 && e.isBoss);
  const activeBossGimmick = livingBosses
    .map((b) => ({ boss: b, gimmick: getBossGimmick(b.speciesId) }))
    .find((x) => Boolean(x.gimmick));
  const limitPct = Math.max(0, Math.min(100, Math.round(battle.limitGauge)));
  const limitReady = limitPct >= 100;

  const targetEnemy =
    battle.enemies.find((e) => e.uid === selectedEnemyUid && e.hp > 0) ??
    battle.enemies.find((e) => e.hp > 0) ??
    null;
  const activeAllyElement = activeUnit?.isAlly ? getSpecies(activeUnit.speciesId).element : null;
  const activeAttackHitsWeak = Boolean(
    activeAllyElement &&
      targetEnemy &&
      isElementalWeakness(activeAllyElement, targetEnemy.speciesId, targetEnemy.shiftElement),
  );

  return (
    <div className="panel-body" style={{ gap: 4 }}>
      {/* Clickable Enemy Target & Element/Weakness Strip */}
      <div className="battle-enemy-strip">
        {battle.enemies.map((enemy) => {
          const isTargeted = selectedEnemyUid === enemy.uid && enemy.hp > 0;
          const hpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
          const effElem = getUnitEffectiveElement(enemy);
          const elemMeta = ELEMENT_META[effElem];
          const weakElem = getWeaknessElementFor(effElem);
          const weakMeta = weakElem ? ELEMENT_META[weakElem] : null;
          const allyCanWeak = Boolean(
            enemy.hp > 0 &&
              activeUnit?.isAlly &&
              ((activeAllyElement && isElementalWeakness(activeAllyElement, enemy.speciesId, enemy.shiftElement)) ||
                activeUnit.skills.some(
                  (sk) =>
                    (sk.kind === 'damage' || sk.kind === 'drain') &&
                    isElementalWeakness(sk.element, enemy.speciesId, enemy.shiftElement),
                )),
          );
          const statusIcons =
            (enemy.charging ? '⚠' : '') +
            (enemy.freezeTurns > 0 ? '❄' : '') +
            (enemy.burnTurns > 0 ? '🔥' : '') +
            (enemy.defBreakTurns > 0 ? '💔' : '') +
            (enemy.poisonTurns > 0 ? '☠' : '');
          return (
            <button
              key={enemy.uid}
              type="button"
              className={`battle-enemy-chip ${isTargeted ? 'targeted' : ''} ${enemy.hp <= 0 ? 'dead' : ''}`}
              disabled={enemy.hp <= 0}
              onClick={() => onSelectEnemy(enemy.uid)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isTargeted ? '#ffe570' : '#ffccd2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isTargeted ? '◎' : ''}
                  {elemMeta.icon}
                  {enemy.name}
                </span>
                <span style={{ fontSize: 8, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {weakMeta && (
                    <span
                      style={{
                        color: allyCanWeak ? '#ffe66b' : 'var(--text-muted)',
                        fontWeight: allyCanWeak ? 800 : 400,
                      }}
                    >
                      {allyCanWeak ? 'WEAK' : `弱${weakMeta.icon}`}
                    </span>
                  )}
                  {statusIcons}
                </span>
              </div>
              <div className="bar-track" style={{ height: 3 }}>
                <div className="bar-fill-enemy" style={{ width: `${hpPct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Boss Gimmick Status Bar */}
      {activeBossGimmick && activeBossGimmick.gimmick && (() => {
        const b = activeBossGimmick.boss;
        const g = activeBossGimmick.gimmick;
        const shiftMeta = b.shiftElement ? ELEMENT_META[b.shiftElement] : null;
        const shiftWeak = b.shiftElement ? getWeaknessElementFor(b.shiftElement) : null;
        return (
          <div
            id="boss-gimmick-banner"
            style={{
              background: 'rgba(66, 26, 92, 0.42)',
              border: '1px solid #b48cff',
              borderRadius: 5,
              padding: '2px 6px',
              fontSize: 9,
              color: '#ebd9ff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 4,
              minWidth: 0,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ⚙ {g.name}・{g.shortDesc}
            </span>
            {shiftMeta && shiftWeak && (
              <span style={{ color: '#ffe570', fontWeight: 700, flexShrink: 0 }}>
                {shiftMeta.icon}→弱{ELEMENT_META[shiftWeak].icon}
              </span>
            )}
          </div>
        );
      })()}

      {/* 4 Ally Status Strip (Tap any ally to inspect full battle stats) */}
      <div className="battle-ally-strip">
        {battle.allies.map((ally) => {
          const isTurn = battle.activeUid === ally.uid;
          const hpPct = Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100));
          const mpPct = Math.max(0, Math.min(100, (ally.mp / ally.maxMp) * 100));
          const allyStatus =
            (ally.freezeTurns > 0 ? '❄' : '') +
            (ally.burnTurns > 0 ? '🔥' : '') +
            (ally.defBreakTurns > 0 ? '💔' : '') +
            (ally.poisonTurns > 0 ? '☠' : '') +
            (ally.defending ? '🛡' : '');
          return (
            <button
              key={ally.uid}
              id={`battle-ally-card-${ally.speciesId}`}
              type="button"
              className={`battle-ally-card ${isTurn ? 'active' : ''} ${ally.hp <= 0 ? 'dead' : ''}`}
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => setInspectAllyUid(ally.uid)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                <PixelIcon spriteKey={ally.spriteKey} size={18} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color:
                        ally.freezeTurns > 0
                          ? '#7ce8ff'
                          : ally.poisonTurns > 0
                            ? '#e3a6ff'
                            : ally.trueEvolved
                              ? '#8ae8ff'
                              : ally.evolved
                                ? '#ffe878'
                                : undefined,
                    }}
                  >
                    {allyStatus}
                    {ally.name}
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
                    {ally.hp}/{ally.maxHp}
                    {ally.shield > 0 ? `+${ally.shield}` : ''}
                  </div>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill-hp" style={{ width: `${hpPct}%` }} />
              </div>
              <div className="bar-track" style={{ height: 3 }}>
                <div className="bar-fill-mp" style={{ width: `${mpPct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Urgent Boss/Elite Ultimate Warning Banner */}
      {chargingEnemy && (
        <div
          style={{
            background: 'rgba(180, 32, 54, 0.35)',
            border: '1px solid #ff667a',
            borderRadius: 5,
            padding: '2px 6px',
            fontFamily: 'var(--font-pixel)',
            fontSize: 9.5,
            color: '#ffd1d8',
            textAlign: 'center',
          }}
        >
          ⚠ {chargingEnemy.name}・大技待機
        </div>
      )}

      {/* Limit Break Gauge + Free-Action Potions Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) auto auto',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {limitReady ? (
          <button
            id="btn-cmd-limit-break"
            type="button"
            className="rpg-btn sm primary"
            disabled={!canSwiftAct}
            onClick={() => onCommand({ type: 'limit_break' })}
            style={{
              padding: '3px 6px',
              fontSize: 10,
              boxShadow: '0 0 8px rgba(255, 224, 96, 0.55)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ⚡ 連携奥義『ルーンユニゾン』
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(18, 16, 28, 0.72)',
              border: '1px solid rgba(130, 114, 168, 0.45)',
              borderRadius: 5,
              padding: '3px 6px',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 9, fontFamily: 'var(--font-pixel)', color: '#ffe570', flexShrink: 0 }}>
              ⚡連携 {limitPct}%
            </span>
            <div className="bar-track" style={{ flex: 1, height: 5 }}>
              <div
                style={{
                  width: `${limitPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #5cc8ff, #ffe566, #ff8ae0)',
                  transition: 'width 0.18s ease',
                }}
              />
            </div>
          </div>
        )}

        <button
          id="btn-cmd-hp-potion"
          type="button"
          className="rpg-btn sm emerald"
          style={{ padding: '3px 6px', fontSize: 9.5, flexShrink: 0 }}
          disabled={!canSwiftAct || potionsBlocked || battle.hpPotions <= 0}
          onClick={() => onCommand({ type: 'use_hp_potion' })}
        >
          {potionsBlocked ? '禁薬' : `🧪HP×${battle.hpPotions}`}
        </button>
        <button
          id="btn-cmd-mp-potion"
          type="button"
          className="rpg-btn sm"
          style={{ padding: '3px 6px', fontSize: 9.5, flexShrink: 0 }}
          disabled={!canSwiftAct || potionsBlocked || battle.mpPotions <= 0}
          onClick={() => onCommand({ type: 'use_mp_potion' })}
        >
          {potionsBlocked ? '禁薬' : `💧MP×${battle.mpPotions}`}
        </button>
      </div>

      {/* Battle Toolbar: Auto / Speed / Tactic */}
      <div className="battle-toolbar">
        <button
          id="btn-toggle-auto"
          type="button"
          className={`rpg-btn sm ${settings.autoBattle ? 'active-toggle' : ''}`}
          onClick={onToggleAuto}
        >
          {settings.autoBattle ? 'AUTO:ON' : 'AUTO:OFF'}
        </button>
        <button
          id="btn-cycle-speed"
          type="button"
          className="rpg-btn sm"
          onClick={onCycleSpeed}
        >
          {SPEED_LABELS[settings.battleSpeed]}
        </button>
        <button
          id="btn-cycle-tactic"
          type="button"
          className="rpg-btn sm"
          onClick={onCycleTactic}
        >
          {TACTIC_LABELS[settings.battleTactic]}
        </button>
        <span
          className="muted-text"
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '38%',
          }}
        >
          {battle.bossRushWave ? `W${battle.bossRushWave} ` : ''}T{battle.turn}{' '}
          {activeUnit ? `▶${activeUnit.name}` : ''}
        </span>
      </div>

      {/* Live 2-Line Log */}
      <div className="battle-log-box">
        {lastLogs.map((line, i) => (
          <div key={`${i}_${line}`}>{line}</div>
        ))}
      </div>

      {/* Manual Command Grid */}
      {activeUnit && activeUnit.isAlly ? (
        <div className="command-grid">
          <button
            id="btn-cmd-attack"
            type="button"
            className="cmd-btn"
            style={activeAttackHitsWeak ? { borderColor: '#ffe570' } : undefined}
            disabled={!canPlayerAct}
            onClick={() => onCommand({ type: 'attack', targetUid: selectedEnemyUid ?? undefined })}
          >
            <span className="cmd-title">
              <span>
                ⚔ たたかう
                {activeAttackHitsWeak && (
                  <span style={{ color: '#ffe570', fontSize: 8.5, marginLeft: 3 }}>WEAK</span>
                )}
              </span>
              <span style={{ fontSize: 9, color: '#9ee8ad', flexShrink: 0 }}>MP0</span>
            </span>
            <span className="cmd-desc">通常攻撃</span>
          </button>

          {activeUnit.skills.map((sk, idx) => {
            const cost = getSkillMpCost(activeUnit, sk);
            const affordable = activeUnit.mp >= cost;
            const isOffensive = sk.kind === 'damage' || sk.kind === 'drain';
            const hitsWeak =
              isOffensive &&
              (sk.target === 'all_enemies'
                ? battle.enemies.some(
                    (e) => e.hp > 0 && isElementalWeakness(sk.element, e.speciesId, e.shiftElement),
                  )
                : Boolean(
                    targetEnemy &&
                      isElementalWeakness(sk.element, targetEnemy.speciesId, targetEnemy.shiftElement),
                  ));
            const sElem = ELEMENT_META[sk.element];
            return (
              <button
                key={sk.id}
                id={`btn-cmd-skill-${idx}`}
                type="button"
                className="cmd-btn"
                style={hitsWeak ? { borderColor: '#ffe570' } : undefined}
                disabled={!canPlayerAct || !affordable}
                onClick={() =>
                  onCommand({
                    type: 'skill',
                    skillIndex: idx as 0 | 1,
                    targetUid: selectedEnemyUid ?? undefined,
                  })
                }
              >
                <span className="cmd-title">
                  <span>
                    {sElem.icon} {sk.name}
                    {hitsWeak && (
                      <span style={{ color: '#ffe570', fontSize: 8.5, marginLeft: 3 }}>WEAK</span>
                    )}
                  </span>
                  <span style={{ fontSize: 9, color: affordable ? '#72d2ff' : '#ff7a7a', flexShrink: 0 }}>
                    MP{cost}
                  </span>
                </span>
                <span className="cmd-desc">{sk.description}</span>
              </button>
            );
          })}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
            <button
              id="btn-cmd-defend"
              type="button"
              className={`rpg-btn sm ${chargingEnemy ? 'emerald' : ''}`}
              disabled={!canPlayerAct}
              onClick={() => onCommand({ type: 'defend' })}
            >
              🛡防御
            </button>
            <button
              id="btn-cmd-flee"
              type="button"
              className="rpg-btn sm danger"
              disabled={!canPlayerAct || battle.isBossBattle}
              onClick={() => onCommand({ type: 'flee' })}
            >
              逃げる
            </button>
          </div>
        </div>
      ) : (
        <div className="rpg-card" style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          {settings.autoBattle ? 'オート戦闘中' : '敵の行動中'}
        </div>
      )}

      {/* In-Battle Party Status Detail Modal */}
      {inspectAllyUid && (() => {
        const ally = battle.allies.find((a) => a.uid === inspectAllyUid) ?? battle.allies[0];
        if (!ally) return null;
        const sp = getSpecies(ally.speciesId);
        const role = ROLE_LABELS[sp.role];
        const elem = ELEMENT_META[sp.element];
        const weak = getWeaknessElementFor(sp.element);
        const weakMeta = weak ? ELEMENT_META[weak] : null;
        const statuses: string[] = [];
        if (ally.defending) statuses.push('🛡防御中');
        if (ally.atkBuffTurns > 0) statuses.push(`⚔火力UP ${ally.atkBuffTurns}T`);
        if (ally.defBuffTurns > 0) statuses.push(`🛡防御UP ${ally.defBuffTurns}T`);
        if (ally.poisonTurns > 0) statuses.push(`☠毒 ${ally.poisonTurns}T`);
        if (ally.burnTurns > 0) statuses.push(`🔥火傷 ${ally.burnTurns}T`);
        if (ally.freezeTurns > 0) statuses.push(`❄凍結 ${ally.freezeTurns}T`);
        if (ally.defBreakTurns > 0) statuses.push(`💔防低下 ${ally.defBreakTurns}T`);

        return (
          <div
            id="battle-ally-detail-modal"
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
            onClick={() => setInspectAllyUid(null)}
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
              {/* 4-Ally Quick Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${battle.allies.length}, minmax(0, 1fr))`,
                  gap: 3,
                }}
              >
                {battle.allies.map((a) => (
                  <button
                    key={a.uid}
                    type="button"
                    className={`pill-chip ${a.uid === ally.uid ? 'active' : ''}`}
                    style={{
                      textAlign: 'center',
                      fontSize: 9,
                      padding: '2px 2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setInspectAllyUid(a.uid)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PixelIcon spriteKey={ally.spriteKey} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ffe570' }}>
                    {ally.trueEvolved ? '【真】' : ally.evolved ? '【極】' : ''}
                    {ally.name} Lv.{ally.level}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, fontSize: 9.5 }}>
                    <span className="role-badge" style={{ background: role.color }}>
                      {role.label}
                    </span>
                    <span style={{ color: elem.color }}>
                      {elem.icon}
                      {elem.label}
                    </span>
                    {weakMeta && (
                      <span style={{ color: '#ff9696' }}>
                        弱点:{weakMeta.icon}
                        {weakMeta.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* HP / MP / Shield */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px 8px',
                  fontSize: 10,
                  background: 'rgba(10, 9, 18, 0.6)',
                  borderRadius: 5,
                  padding: '5px 7px',
                }}
              >
                <span style={{ color: '#82ff9e' }}>
                  HP <strong>{ally.hp}/{ally.maxHp}</strong>
                  {ally.shield > 0 ? ` +盾${ally.shield}` : ''}
                </span>
                <span style={{ color: '#72d2ff' }}>
                  MP <strong>{ally.mp}/{ally.maxMp}</strong>
                </span>
              </div>

              {/* Full Combat Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 4,
                  fontSize: 9.5,
                  background: 'rgba(10, 9, 18, 0.55)',
                  borderRadius: 5,
                  padding: 6,
                }}
              >
                <div>ATK <strong>{ally.atk}</strong></div>
                <div>MAG <strong>{ally.mag}</strong></div>
                <div>DEF <strong>{ally.def}</strong></div>
                <div>SPD <strong>{ally.spd}</strong></div>
                <div>会心 <strong>{ally.critRate}%</strong></div>
                <div>倍率 <strong>{ally.critDmg}%</strong></div>
                <div>吸血 <strong>{ally.lifesteal}%</strong></div>
                <div>追撃 <strong>{ally.doubleHit}%</strong></div>
                <div>貫通 <strong>{ally.armorPenPct}%</strong></div>
                {ally.regenPct > 0 && <div>再生 <strong>{ally.regenPct}%</strong></div>}
                {ally.skillPowerBonusPct > 0 && <div>技威力 <strong>+{ally.skillPowerBonusPct}%</strong></div>}
                {ally.damageTakenMult !== 1 && (
                  <div>被ダメ <strong>{Math.round(ally.damageTakenMult * 100)}%</strong></div>
                )}
              </div>

              {/* Active Buffs & Debuffs */}
              {statuses.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 9.5 }}>
                  {statuses.map((st) => (
                    <span
                      key={st}
                      style={{
                        background: 'rgba(24, 20, 38, 0.85)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 4,
                        padding: '1px 5px',
                      }}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              )}

              {/* Skills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ally.skills.map((sk) => {
                  const cost = getSkillMpCost(ally, sk);
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
                        <span style={{ color: '#72d2ff' }}>MP{cost}</span>
                      </div>
                      <div className="muted-text" style={{ fontSize: 9 }}>{sk.description}</div>
                    </div>
                  );
                })}
              </div>

              {/* Active 4pc Sets & Unique Effects */}
              {(ally.activeSetIds4pc.length > 0 || ally.uniqueEffects.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9, color: '#ffe570' }}>
                  {ally.activeSetIds4pc.map((sid) => (
                    <div key={sid}>✦ 4セット：{SET_MAP[sid].name}</div>
                  ))}
                  {ally.uniqueEffects.map((uid) => (
                    <div key={uid}>★ {UNIQUE_MAP[uid]?.name}：{UNIQUE_MAP[uid]?.desc}</div>
                  ))}
                </div>
              )}

              <button
                id="btn-close-ally-modal"
                type="button"
                className="rpg-btn sm primary"
                onClick={() => setInspectAllyUid(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
