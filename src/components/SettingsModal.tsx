import { useState } from 'react';
import { soundEngine } from '../engine/sound';
import type { SaveSlotId } from '../game/save';
import type {
  AutoLootMode,
  AutoSellThreshold,
  BattleSpeed,
  BattleTactic,
  GameSettings,
} from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  activeSlot: SaveSlotId;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetCurrentSlot: () => void;
  onDeleteAllData: () => void;
}

const AUTO_SELL_LABELS: Record<AutoSellThreshold, string> = {
  none: 'OFF',
  common: '一般',
  uncommon: '上質',
  rare: 'レア',
  epic: 'エピック',
};

const TACTIC_LABELS: Record<BattleTactic, string> = {
  balanced: 'バランス',
  allout: '全力攻撃',
  conserve: 'MP温存',
};

export function SettingsModal({
  settings,
  activeSlot,
  onClose,
  onUpdateSettings,
  onResetCurrentSlot,
  onDeleteAllData,
}: SettingsModalProps) {
  const [confirmMode, setConfirmMode] = useState<'none' | 'slot' | 'all'>('none');
  const [helpOpen, setHelpOpen] = useState(false);

  const bgmPct = Math.round((settings.bgmVolume ?? 0.75) * 100);
  const sePct = Math.round((settings.seVolume ?? 0.85) * 100);

  return (
    <div
      id="settings-modal-backdrop"
      className="settings-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="設定画面"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-modal-card">
        <div className="section-heading" style={{ marginBottom: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span>⚙ ゲーム設定・データ管理</span>
            <span
              className="tier-badge"
              style={{
                background: 'linear-gradient(180deg, #8c202e 0%, #57111b 100%)',
                borderColor: '#ff7084',
                color: '#ffd6dd',
                fontSize: 9,
              }}
            >
              v16
            </span>
          </span>
          <button
            id="btn-close-settings"
            type="button"
            className="rpg-btn sm"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>

        {/* Sound Settings */}
        <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 11, color: '#ffe570' }}>🎵 サウンド設定</strong>
            <button
              id="btn-settings-mute"
              type="button"
              className={`rpg-btn sm ${settings.soundMuted ? 'danger' : 'emerald'}`}
              onClick={() => onUpdateSettings({ soundMuted: !settings.soundMuted })}
            >
              {settings.soundMuted ? '🔇 ミュート中' : '🔊 音あり'}
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>BGM音量</span>
              <strong>{bgmPct}%</strong>
            </span>
            <input
              id="slider-bgm-volume"
              type="range"
              min={0}
              max={100}
              value={bgmPct}
              onChange={(e) => onUpdateSettings({ bgmVolume: Number(e.target.value) / 100 })}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SE音量</span>
              <strong>{sePct}%</strong>
            </span>
            <input
              id="slider-se-volume"
              type="range"
              min={0}
              max={100}
              value={sePct}
              onChange={(e) => onUpdateSettings({ seVolume: Number(e.target.value) / 100 })}
            />
          </label>

          <button
            type="button"
            className="rpg-btn sm"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playSfx('forge');
            }}
          >
            🔔 効果音テスト
          </button>
        </div>

        {/* Battle & Loot Settings */}
        <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong style={{ fontSize: 11, color: '#ffe570' }}>⚔ 戦闘・トレハン設定</strong>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>戦闘速度</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {([1, 2, 4] as BattleSpeed[]).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className={`rpg-btn sm ${settings.battleSpeed === spd ? 'primary' : ''}`}
                  onClick={() => onUpdateSettings({ battleSpeed: spd })}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>戦闘AUTO</span>
            <button
              type="button"
              className={`rpg-btn sm ${settings.autoBattle ? 'active-toggle' : ''}`}
              onClick={() => onUpdateSettings({ autoBattle: !settings.autoBattle })}
            >
              {settings.autoBattle ? '戦闘AUTO:ON' : '戦闘AUTO:OFF'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>AI作戦</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['balanced', 'allout', 'conserve'] as BattleTactic[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rpg-btn sm ${settings.battleTactic === t ? 'primary' : ''}`}
                  style={{ fontSize: 9, padding: '3px 5px' }}
                  onClick={() => onUpdateSettings({ battleTactic: t })}
                >
                  {TACTIC_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>自動処理モード</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['sell', 'salvage'] as AutoLootMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rpg-btn sm ${settings.autoLootMode === m ? 'primary' : ''}`}
                  onClick={() => onUpdateSettings({ autoLootMode: m })}
                >
                  {m === 'sell' ? '自動売却' : '自動分解'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10 }}>自動処理の対象レア度</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2 }}>
              {(['none', 'common', 'uncommon', 'rare', 'epic'] as AutoSellThreshold[]).map((th) => (
                <button
                  key={th}
                  type="button"
                  className={`rpg-btn sm ${settings.autoSell === th ? 'primary' : ''}`}
                  style={{ fontSize: 8.5, padding: '3px 1px' }}
                  onClick={() => onUpdateSettings({ autoSell: th })}
                >
                  {AUTO_SELL_LABELS[th]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible In-Game Help & Element Chart */}
        <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button
            id="btn-toggle-help-guide"
            type="button"
            className="rpg-btn sm"
            style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
            onClick={() => setHelpOpen((v) => !v)}
          >
            <span>📖 遊び方・属性相性・進化条件</span>
            <span>{helpOpen ? '▲' : '▼'}</span>
          </button>
          {helpOpen && (
            <div
              id="settings-help-guide"
              style={{ fontSize: 9.5, color: '#d8d2e8', display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.45 }}
            >
              <div>
                <strong style={{ color: '#ffe570' }}>属性弱点：</strong>
                🔥炎→🌿森→🪨地→🔥炎 ／ ✨光↔⭐星。弱点攻撃はダメージ大幅UP！
              </div>
              <div>
                <strong style={{ color: '#ffe570' }}>ボス大技対策：</strong>
                敵がチャージしたら🛡防御で軽減、または⚡連携奥義100%でブレイク可能。
              </div>
              <div>
                <strong style={{ color: '#ffe570' }}>星座盤スキルツリー：</strong>
                全103ノード＋10キーストーン。いつでも1pt返却・全リセット可能。
              </div>
              <div>
                <strong style={{ color: '#ffe570' }}>モンスター進化：</strong>
                Lv10＋鍛冶石で【極】進化、Lv25＋鍛冶石で【真】進化を解放。
              </div>
              <div>
                <strong style={{ color: '#ffe570' }}>戦闘中の詳細：</strong>
                味方カードをタップで全ステータス・バフを確認、ログ欄タップで履歴表示。
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone: Data Deletion */}
        <div
          className="rpg-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderColor: 'rgba(255, 112, 132, 0.55)',
            background: 'rgba(46, 18, 26, 0.85)',
          }}
        >
          <strong style={{ fontSize: 11, color: '#ff8a9e' }}>🗑 データ削除</strong>

          {confirmMode === 'none' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
              <button
                id="btn-reset-current-slot"
                type="button"
                className="rpg-btn sm danger"
                onClick={() => setConfirmMode('slot')}
              >
                書{activeSlot}を初期化
              </button>
              <button
                id="btn-delete-all-data"
                type="button"
                className="rpg-btn sm danger"
                onClick={() => setConfirmMode('all')}
              >
                全データ完全削除
              </button>
            </div>
          )}

          {confirmMode === 'slot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 10, color: '#ffd6dd' }}>
                現在の冒険の書・書{activeSlot}を初期状態に戻します。よろしいですか？
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
                <button
                  id="btn-confirm-reset-slot"
                  type="button"
                  className="rpg-btn sm danger"
                  onClick={() => {
                    setConfirmMode('none');
                    onResetCurrentSlot();
                    onClose();
                  }}
                >
                  書{activeSlot}を初期化する
                </button>
                <button
                  type="button"
                  className="rpg-btn sm"
                  onClick={() => setConfirmMode('none')}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 10, color: '#ffd6dd' }}>
                冒険の書1〜3と全ての設定データを完全に削除します。この操作は取り消せません。
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5 }}>
                <button
                  id="btn-confirm-delete-all"
                  type="button"
                  className="rpg-btn sm danger"
                  onClick={() => {
                    setConfirmMode('none');
                    onDeleteAllData();
                    onClose();
                  }}
                >
                  本当に全て削除する
                </button>
                <button
                  type="button"
                  className="rpg-btn sm"
                  onClick={() => setConfirmMode('none')}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
