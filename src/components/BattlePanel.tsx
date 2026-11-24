import {
  findBattleUnit,
  getSkillMpCost,
  type PlayerActionCommand,
} from '../game/battle';
import { RARITY_META } from '../game/data/equipment';
import { getSpecies } from '../game/data/monsters';
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
  onCommand,
  onToggleAuto,
  onCycleSpeed,
  onCycleTactic,
  onFinishBattle,
  onNextBossRushWave,
  onOpenGearFromLoot,
}: BattlePanelProps) {
  const activeUnit = findBattleUnit(battle, battle.activeUid);
  const canPlayerAct =
    battle.phase === 'player_input' &&
    Boolean(activeUnit?.isAlly) &&
    !settings.autoBattle;
  const canSwiftAct =
    battle.phase === 'player_input' && Boolean(activeUnit?.isAlly);

  const lastLogs = battle.logs.slice(-2);

  if (battle.phase === 'victory' && battle.reward) {
    const r = battle.reward;
    const isBossRush = Boolean(battle.bossRushWave);
    const hasNextWave = Boolean(battle.bossRushWave && battle.bossRushWave < 5);
    const isBossRushClear = battle.bossRushWave === 5;

    return (
      <div className="panel-body">
        <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, color: '#ffe570' }}>
              {isBossRush ? `★ Wave ${battle.bossRushWave}/5 突破` : '★ 戦闘勝利'}
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
              🏆 ボスラッシュ全5Wave制覇・ミシック装備獲得
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
                🏟 Wave {(battle.bossRushWave ?? 1) + 1}/5 へ
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
            {battle.phase === 'defeat' ? '☠ 全滅した' : '戦闘から撤退した'}
          </div>
          <div className="muted-text">
            {battle.phase === 'defeat'
              ? battle.bossRushWave
                ? `Wave ${battle.bossRushWave} で力尽きた。獲得報酬を持って村へ戻る。`
                : '所持金の15%を失い、始まりの村へ戻る。'
              : '安全に距離を取った。'}
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
  const limitPct = Math.max(0, Math.min(100, Math.round(battle.limitGauge)));
  const limitReady = limitPct >= 100;

  return (
    <div className="panel-body" style={{ gap: 4 }}>
      {/* 4 Ally Status Strip */}
      <div className="battle-ally-strip">
        {battle.allies.map((ally) => {
          const isTurn = battle.activeUid === ally.uid;
          const hpPct = Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100));
          const mpPct = Math.max(0, Math.min(100, (ally.mp / ally.maxMp) * 100));
          return (
            <div
              key={ally.uid}
              className={`battle-ally-card ${isTurn ? 'active' : ''} ${ally.hp <= 0 ? 'dead' : ''}`}
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
                      color: ally.poisonTurns > 0 ? '#e3a6ff' : ally.evolved ? '#ffe878' : undefined,
                    }}
                  >
                    {ally.poisonTurns > 0 ? '☠' : ''}
                    {ally.defending ? '🛡' : ''}
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
            </div>
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
          ⚠ {chargingEnemy.name}が大技を溜めている
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
          disabled={!canSwiftAct || battle.hpPotions <= 0}
          onClick={() => onCommand({ type: 'use_hp_potion' })}
        >
          🧪HP薬×{battle.hpPotions}
        </button>
        <button
          id="btn-cmd-mp-potion"
          type="button"
          className="rpg-btn sm"
          style={{ padding: '3px 6px', fontSize: 9.5, flexShrink: 0 }}
          disabled={!canSwiftAct || battle.mpPotions <= 0}
          onClick={() => onCommand({ type: 'use_mp_potion' })}
        >
          💧MP薬×{battle.mpPotions}
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
            disabled={!canPlayerAct}
            onClick={() => onCommand({ type: 'attack', targetUid: selectedEnemyUid ?? undefined })}
          >
            <span className="cmd-title">
              <span>⚔ たたかう</span>
              <span style={{ fontSize: 9, color: '#9ee8ad', flexShrink: 0 }}>MP0</span>
            </span>
            <span className="cmd-desc">通常攻撃</span>
          </button>

          {activeUnit.skills.map((sk, idx) => {
            const cost = getSkillMpCost(activeUnit, sk);
            const affordable = activeUnit.mp >= cost;
            return (
              <button
                key={sk.id}
                id={`btn-cmd-skill-${idx}`}
                type="button"
                className="cmd-btn"
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
                  <span>✦ {sk.name}</span>
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
    </div>
  );
}
