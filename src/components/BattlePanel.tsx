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
  onOpenGearFromLoot,
}: BattlePanelProps) {
  const activeUnit = findBattleUnit(battle, battle.activeUid);
  const canPlayerAct =
    battle.phase === 'player_input' &&
    Boolean(activeUnit?.isAlly) &&
    !settings.autoBattle;

  const lastLogs = battle.logs.slice(-2);

  if (battle.phase === 'victory' && battle.reward) {
    const r = battle.reward;
    return (
      <div className="panel-body">
        <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: '#ffe570' }}>
              ★ 戦闘勝利！
            </span>
            <span className="muted-text">
              EXP +{r.exp.toLocaleString()} / {r.gold.toLocaleString()}G
            </span>
          </div>

          {r.worldTierUnlocked && (
            <div
              style={{
                background: 'rgba(219, 138, 36, 0.25)',
                border: '1px solid #ffcf5c',
                borderRadius: 6,
                padding: '6px 8px',
                fontFamily: 'var(--font-pixel)',
                fontSize: 13,
                color: '#fff2b3',
                textAlign: 'center',
              }}
            >
              世界ランク Tier {toRoman(r.worldTierUnlocked)} 解放！村の祭壇で昇格できます！
            </div>
          )}

          {r.leveledUpIds.length > 0 && (
            <div style={{ fontSize: 12, color: '#82ff9e', fontWeight: 700 }}>
              LEVEL UP! {r.leveledUpIds.map((id) => getSpecies(id).name).join(' / ')}
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
                    <PixelIcon spriteKey={sp.spriteKey} size={26} />
                    <div style={{ fontSize: 12 }}>
                      <strong style={{ color: '#99ffad' }}>
                        {sp.name}
                      </strong>{' '}
                      {rec.isNew
                        ? 'が仲間になった！'
                        : `が覚醒！ (★+${rec.newAwakening} 全能力+8%)`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {r.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="muted-text">獲得装備（タップで装備画面へ）</div>
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
                      <PixelIcon spriteKey={item.iconKey} size={26} />
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
                          {item.name}
                        </div>
                        <div className="muted-text">
                          iLv.{item.itemLevel} {rm.label}
                          {item.uniqueDesc ? ` / 固有効果` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, color: '#fff3c7' }}>
                      確認 ›
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {r.autoSoldCount > 0 && (
            <div className="muted-text">
              自動売却: {r.autoSoldCount}個 → +{r.autoSoldGold.toLocaleString()}G
            </div>
          )}

          <button
            id="btn-battle-continue"
            type="button"
            className="rpg-btn primary"
            style={{ width: '100%', padding: '10px' }}
            onClick={onFinishBattle}
          >
            探索に戻る
          </button>
        </div>
      </div>
    );
  }

  if (battle.phase === 'defeat' || battle.phase === 'fled') {
    return (
      <div className="panel-body">
        <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: '#ff8a8a' }}>
            {battle.phase === 'defeat' ? 'パーティは力尽きた…' : '戦闘から撤退した'}
          </div>
          <div className="muted-text">
            {battle.phase === 'defeat'
              ? '装備・仲間・ゴールドはそのまま残ります。村の回復の泉で立て直して再挑戦しましょう！'
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

  return (
    <div className="panel-body" style={{ gap: 6 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <PixelIcon spriteKey={ally.spriteKey} size={22} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ally.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                    HP {ally.hp}/{ally.maxHp}
                    {ally.shield > 0 ? ` (+${ally.shield})` : ''}
                  </div>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill-hp" style={{ width: `${hpPct}%` }} />
              </div>
              <div className="bar-track" style={{ height: 4 }}>
                <div className="bar-fill-mp" style={{ width: `${mpPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Battle Toolbar: Auto / Speed / Tactic */}
      <div className="battle-toolbar">
        <button
          id="btn-toggle-auto"
          type="button"
          className={`rpg-btn sm ${settings.autoBattle ? 'active-toggle' : ''}`}
          onClick={onToggleAuto}
        >
          {settings.autoBattle ? 'AUTO: ON' : 'AUTO: OFF'}
        </button>
        <button
          id="btn-cycle-speed"
          type="button"
          className="rpg-btn sm"
          onClick={onCycleSpeed}
        >
          速度 {SPEED_LABELS[settings.battleSpeed]}
        </button>
        <button
          id="btn-cycle-tactic"
          type="button"
          className="rpg-btn sm"
          onClick={onCycleTactic}
        >
          {TACTIC_LABELS[settings.battleTactic]}
        </button>
        <span className="muted-text" style={{ marginLeft: 'auto', fontSize: 10 }}>
          T{battle.turn} {activeUnit ? `▶ ${activeUnit.name}` : ''}
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
              <span style={{ fontSize: 10, color: '#9ee8ad' }}>MP 0</span>
            </span>
            <span className="cmd-desc">選択中の敵を通常攻撃</span>
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
                  <span style={{ fontSize: 10, color: affordable ? '#72d2ff' : '#ff7a7a' }}>
                    MP {cost}
                  </span>
                </span>
                <span className="cmd-desc">{sk.description}</span>
              </button>
            );
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <button
              id="btn-cmd-defend"
              type="button"
              className="rpg-btn"
              disabled={!canPlayerAct}
              onClick={() => onCommand({ type: 'defend' })}
            >
              🛡 防御
            </button>
            <button
              id="btn-cmd-flee"
              type="button"
              className="rpg-btn danger"
              disabled={!canPlayerAct || battle.isBossBattle}
              onClick={() => onCommand({ type: 'flee' })}
            >
              逃げる
            </button>
          </div>
        </div>
      ) : (
        <div className="rpg-card" style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          {settings.autoBattle ? 'オート戦闘進行中…' : '敵の行動中…'}
        </div>
      )}
    </div>
  );
}
