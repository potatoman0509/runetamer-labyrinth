import { useRef, useState } from 'react';
import { BOSS_RUSH_MAX_WAVE, BOSS_RUSH_WAVES } from '../game/bossRush';
import { RARITY_META, SLOT_LABELS } from '../game/data/equipment';
import {
  exportSaveCode,
  formatSavedAt,
  type SaveSlotId,
  type SaveSlotSummary,
} from '../game/save';
import { computeTrialModifiers, TRIAL_MODS } from '../game/trials';
import type { GameSave, TrialModId } from '../game/types';
import {
  getActiveTierModifiers,
  getShopPrice,
  getWorldTierBlessing,
  toRoman,
} from '../game/worldTier';
import { PixelIcon } from './PixelIcon';

export type WorldSection = 'altar' | 'arena' | 'shop' | 'save';

interface WorldPanelProps {
  save: GameSave;
  inVillage: boolean;
  section: WorldSection;
  onChangeSection: (section: WorldSection) => void;
  activeSlot: SaveSlotId;
  lastSavedAt: number;
  slotSummaries: SaveSlotSummary[];
  onManualSaveSlot: (slot: SaveSlotId) => void;
  onLoadSaveSlot: (slot: SaveSlotId) => void;
  onNewSaveInSlot: (slot: SaveSlotId) => void;
  onDeleteSaveSlot: (slot: SaveSlotId) => void;
  onExportSaveFile: () => void;
  onImportSaveFile: (rawText: string) => { ok: boolean; error?: string };
  onSelectWorldTier: (tier: number) => void;
  onToggleTrialMod: (id: TrialModId) => void;
  onEnterDungeonFloor: (floor: number) => void;
  onStartBossRush: () => void;
  onBuyShopItem: (itemId: string) => void;
  onRefreshShop: () => void;
  onBuyMysteryBox: () => void;
  onImportSaveCode: (code: string) => { ok: boolean; error?: string };
}

export function WorldPanel({
  save,
  inVillage,
  section,
  onChangeSection,
  activeSlot,
  lastSavedAt,
  slotSummaries,
  onManualSaveSlot,
  onLoadSaveSlot,
  onNewSaveInSlot,
  onDeleteSaveSlot,
  onExportSaveFile,
  onImportSaveFile,
  onSelectWorldTier,
  onToggleTrialMod,
  onEnterDungeonFloor,
  onStartBossRush,
  onBuyShopItem,
  onRefreshShop,
  onBuyMysteryBox,
  onImportSaveCode,
}: WorldPanelProps) {
  const [importText, setImportText] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [fileMsg, setFileMsg] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotId | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const blessing = getWorldTierBlessing(save.maxUnlockedTier);
  const activeMods = getActiveTierModifiers(save.worldTier);
  const trials = computeTrialModifiers(save.activeTrials);
  const highestInActiveTier = save.highestFloorByTier[save.worldTier] ?? 1;

  const checkpoints: number[] = [1];
  for (let f = 6; f <= highestInActiveTier; f += 5) {
    checkpoints.push(f);
  }
  if (highestInActiveTier > checkpoints[checkpoints.length - 1]!) {
    checkpoints.push(highestInActiveTier);
  }

  const mysteryCost = Math.round(180 * Math.pow(2.1, save.worldTier - 1) + highestInActiveTier * 22);
  const refreshCost = Math.round(60 * Math.pow(1.8, save.worldTier - 1));

  const handleCopyExport = async () => {
    const code = exportSaveCode(save);
    try {
      await navigator.clipboard.writeText(code);
      setExportMsg('セーブコードをコピーした');
    } catch {
      setImportText(code);
      setExportMsg('下の欄へ出力した');
    }
  };

  const handleImport = () => {
    const res = onImportSaveCode(importText);
    if (res.ok) {
      setImportMsg('セーブデータを復元した');
      setImportText('');
    } else {
      setImportMsg(res.error ?? '復元に失敗した');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportSaveFile(text);
      setFileMsg(res.ok ? `読込完了・${file.name}` : (res.error ?? '読込に失敗した'));
    };
    reader.onerror = () => {
      setFileMsg('ファイルの読取に失敗した');
    };
    reader.readAsText(file);
  };

  return (
    <div className="panel-body">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 3 }}>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'altar' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => onChangeSection('altar')}
        >
          世界ランク
        </button>
        <button
          id="btn-subtab-arena"
          type="button"
          className={`rpg-btn sm ${section === 'arena' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => onChangeSection('arena')}
        >
          🏟闘技場
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'shop' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => onChangeSection('shop')}
        >
          鍛冶商店
        </button>
        <button
          id="btn-subtab-save"
          type="button"
          className={`rpg-btn sm ${section === 'save' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => onChangeSection('save')}
        >
          💾記録
        </button>
      </div>

      {section === 'altar' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>世界ランク</span>
              <span>最大 Tier {toRoman(save.maxUnlockedTier)}</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#fff2bd', lineHeight: 1.35 }}>
              加護：全能力 <strong>+{Math.round((blessing.statMult - 1) * 100)}%</strong> / MF{' '}
              <strong>+{blessing.magicFindBonus}%</strong> / EXP <strong>+{blessing.expBonusPct}%</strong>
            </div>
            <div className="muted-text">30Fボスで次Tier解放</div>

            {/* Tier Selector */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
              {Array.from({ length: save.maxUnlockedTier + 1 }, (_, i) => i + 1).map((t) => {
                const unlocked = t <= save.maxUnlockedTier;
                const active = t === save.worldTier;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`rpg-btn sm ${active ? 'primary' : ''}`}
                    disabled={!unlocked || !inVillage}
                    onClick={() => onSelectWorldTier(t)}
                  >
                    {unlocked ? `Tier ${toRoman(t)}` : `🔒T${toRoman(t)}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="section-heading">
              <span>{activeMods.label}</span>
              <span>iLv +{activeMods.itemLevelBonus}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 10.5 }}>
              <span>敵HP x{activeMods.enemyHpMult.toFixed(1)}</span>
              <span>EXP x{activeMods.expMult.toFixed(1)}</span>
              <span>金貨 x{activeMods.goldMult.toFixed(1)}</span>
              <span style={{ color: '#ff8a98' }}>強敵 {Math.round(activeMods.eliteChance * 100)}%</span>
            </div>
          </div>

          {/* Trial Modifiers (☠ 試練の刻印) */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>☠ 試練の刻印 {trials.count}/{TRIAL_MODS.length}</span>
              {trials.count > 0 && (
                <span style={{ fontSize: 9.5, color: '#82ff9e' }}>
                  MF+{trials.mfBonus}% 💎+{trials.stoneBonusPct}%
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {TRIAL_MODS.map((mod) => {
                const active = (save.activeTrials ?? []).includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    id={`btn-trial-${mod.id}`}
                    type="button"
                    className="item-row"
                    style={{
                      borderColor: active ? '#ff7084' : 'var(--border-subtle)',
                      background: active ? 'rgba(138, 28, 48, 0.35)' : undefined,
                      padding: '4px 6px',
                    }}
                    disabled={!inVillage}
                    onClick={() => onToggleTrialMod(mod.id)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: active ? '#ffd1d8' : undefined }}>
                        {active ? '✓ ' : ''}
                        {mod.name} <span className="muted-text">{mod.effectText}</span>
                      </div>
                      <div style={{ fontSize: 9, color: '#82ff9e' }}>
                        MF+{mod.mfBonus}% / 💎+{mod.stoneBonusPct}% / EXP+{mod.expBonusPct}%
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-pixel)',
                        color: active ? '#ff8a98' : 'var(--text-dim)',
                        flexShrink: 0,
                      }}
                    >
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkpoint Fast Entry */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>迷宮ワープ</span>
              <span>最高 {highestInActiveTier}F</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
              {checkpoints.map((fl) => {
                const b =
                  fl <= 5
                    ? '森'
                    : fl <= 10
                      ? '遺跡'
                      : fl <= 15
                        ? '溶岩'
                        : fl <= 20
                          ? '深淵'
                          : fl <= 25
                            ? '氷結'
                            : fl <= 30
                              ? '聖域'
                              : '無限';
                return (
                  <button
                    key={fl}
                    type="button"
                    className="rpg-btn sm emerald"
                    disabled={!inVillage}
                    onClick={() => onEnterDungeonFloor(fl)}
                  >
                    {fl}F {b}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {section === 'arena' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="section-heading">
              <span>🏟 ボスラッシュ闘技場</span>
              <span style={{ color: '#82ff9e' }}>最高 W{save.bossRushBestWave}/{BOSS_RUSH_MAX_WAVE}</span>
            </div>
            <div className="muted-text">
              全{BOSS_RUSH_MAX_WAVE}連戦・W5ミシック×1 / W8ミシック×2
            </div>
            <button
              id="btn-start-boss-rush"
              type="button"
              className="rpg-btn primary"
              style={{ width: '100%', padding: '9px' }}
              disabled={!inVillage}
              onClick={onStartBossRush}
            >
              ⚔ 闘技場へ挑む
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {BOSS_RUSH_WAVES.map((w) => {
              const cleared = w.wave <= save.bossRushBestWave;
              return (
                <div
                  key={w.wave}
                  className="rpg-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor:
                      cleared
                        ? '#6be088'
                        : w.wave === BOSS_RUSH_MAX_WAVE || w.wave === 5
                          ? 'var(--border-gold)'
                          : undefined,
                    minWidth: 0,
                  }}
                >
                  <PixelIcon spriteKey={w.leadSprite} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: w.wave === BOSS_RUSH_MAX_WAVE ? '#ffe570' : undefined,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {w.title}
                    </div>
                    <div className="muted-text" style={{ fontSize: 9.5 }}>
                      {w.rewardHint}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontFamily: 'var(--font-pixel)',
                      color: cleared ? '#82ff9e' : 'var(--text-dim)',
                      flexShrink: 0,
                    }}
                  >
                    {cleared ? '✓制覇' : `${w.equivFloor}F相当`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {section === 'shop' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 11.5, color: '#ffe570' }}>
                秘宝ミステリー箱
              </div>
              <div className="muted-text">レア以上1点</div>
            </div>
            <button
              type="button"
              className="rpg-btn sm primary"
              style={{ flexShrink: 0 }}
              disabled={save.gold < mysteryCost}
              onClick={onBuyMysteryBox}
            >
              {mysteryCost.toLocaleString()}G
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <span className="section-heading">掘り出し物</span>
            <button
              type="button"
              className="rpg-btn sm"
              style={{ flexShrink: 0 }}
              disabled={save.gold < refreshCost}
              onClick={onRefreshShop}
            >
              更新 {refreshCost}G
            </button>
          </div>

          <div className="item-list">
            {save.shopItems.map((item) => {
              const rm = RARITY_META[item.rarity];
              const price = getShopPrice(item);
              return (
                <div
                  key={item.id}
                  className="item-row"
                  style={{ borderLeft: `3px solid ${rm.border}`, cursor: 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <PixelIcon spriteKey={item.iconKey} size={22} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
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
                        {SLOT_LABELS[item.slot]} iLv.{item.itemLevel} / OP{item.affixes.length}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rpg-btn sm primary"
                    style={{ flexShrink: 0 }}
                    disabled={save.gold < price}
                    onClick={() => onBuyShopItem(item.id)}
                  >
                    {price.toLocaleString()}G
                  </button>
                </div>
              );
            })}
            {save.shopItems.length === 0 && (
              <div className="muted-text" style={{ textAlign: 'center', padding: 8 }}>
                完売
              </div>
            )}
          </div>
        </>
      )}

      {section === 'save' && (
        <>
          {/* Active Adventure Book & Instant Manual Save */}
          <div className="rpg-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ffe570' }}>
                冒険の書 {activeSlot}・自動保存ON
              </div>
              <div className="muted-text">
                最終記録 {formatSavedAt(lastSavedAt)}
              </div>
            </div>
            <button
              id="btn-manual-save-now"
              type="button"
              className="rpg-btn sm primary"
              style={{ flexShrink: 0 }}
              onClick={() => onManualSaveSlot(activeSlot)}
            >
              💾 今すぐ保存
            </button>
          </div>

          {/* 3 Save Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {slotSummaries.map((slotInfo) => {
              const isCurrent = slotInfo.slot === activeSlot;
              const isConfirming = confirmDeleteSlot === slotInfo.slot;
              return (
                <div
                  key={slotInfo.slot}
                  className={isCurrent ? 'rpg-card-gold' : 'rpg-card'}
                  style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <strong style={{ fontSize: 11.5, color: isCurrent ? '#ffe570' : undefined }}>
                        冒険の書 {slotInfo.slot}
                      </strong>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 8.5,
                            fontFamily: 'var(--font-pixel)',
                            padding: '1px 4px',
                            borderRadius: 3,
                            background: '#2e8a4e',
                            color: '#eafff0',
                          }}
                        >
                          使用中
                        </span>
                      )}
                    </div>
                    {slotInfo.exists && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        {slotInfo.partySprites.slice(0, 4).map((sk, idx) => (
                          <PixelIcon key={`${slotInfo.slot}_${idx}_${sk}`} spriteKey={sk} size={18} />
                        ))}
                      </div>
                    )}
                  </div>

                  {slotInfo.exists ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 9.5, color: 'var(--text-muted)' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Lv.{slotInfo.heroLevel}・T{toRoman(slotInfo.worldTier)}・最高{slotInfo.highestFloor}F・💎{slotInfo.forgeStones}
                      </span>
                      <span style={{ flexShrink: 0 }}>{formatSavedAt(slotInfo.savedAt)}</span>
                    </div>
                  ) : (
                    <div className="muted-text">からっぽ</div>
                  )}

                  {isConfirming ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
                      <button
                        id={`btn-confirm-del-slot-${slotInfo.slot}`}
                        type="button"
                        className="rpg-btn sm danger"
                        onClick={() => {
                          onDeleteSaveSlot(slotInfo.slot);
                          setConfirmDeleteSlot(null);
                        }}
                      >
                        本当に削除
                      </button>
                      <button
                        type="button"
                        className="rpg-btn sm"
                        onClick={() => setConfirmDeleteSlot(null)}
                      >
                        戻る
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
                      <button
                        id={`btn-save-slot-${slotInfo.slot}`}
                        type="button"
                        className="rpg-btn sm primary"
                        style={{ padding: '4px 2px', fontSize: 9.5 }}
                        onClick={() => onManualSaveSlot(slotInfo.slot)}
                      >
                        {slotInfo.exists ? '上書保存' : 'ここに保存'}
                      </button>
                      {slotInfo.exists ? (
                        <button
                          id={`btn-load-slot-${slotInfo.slot}`}
                          type="button"
                          className="rpg-btn sm emerald"
                          style={{ padding: '4px 2px', fontSize: 9.5 }}
                          disabled={isCurrent}
                          onClick={() => onLoadSaveSlot(slotInfo.slot)}
                        >
                          {isCurrent ? 'プレイ中' : '読込'}
                        </button>
                      ) : (
                        <button
                          id={`btn-new-slot-${slotInfo.slot}`}
                          type="button"
                          className="rpg-btn sm emerald"
                          style={{ padding: '4px 2px', fontSize: 9.5 }}
                          onClick={() => onNewSaveInSlot(slotInfo.slot)}
                        >
                          新規開始
                        </button>
                      )}
                      <button
                        id={`btn-del-slot-${slotInfo.slot}`}
                        type="button"
                        className="rpg-btn sm danger"
                        style={{ padding: '4px 2px', fontSize: 9.5 }}
                        disabled={!slotInfo.exists}
                        onClick={() => setConfirmDeleteSlot(slotInfo.slot)}
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* JSON Backup File Export / Import */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>📁 ファイル保存・読込</span>
              <span className="muted-text">.json</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
              <button
                id="btn-export-file"
                type="button"
                className="rpg-btn sm primary"
                onClick={() => {
                  onExportSaveFile();
                  setFileMsg('セーブファイルを書き出した');
                }}
              >
                ⬇ ファイル保存
              </button>
              <button
                id="btn-import-file"
                type="button"
                className="rpg-btn sm emerald"
                onClick={() => fileInputRef.current?.click()}
              >
                ⬆ ファイル読込
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {fileMsg && <div style={{ fontSize: 10.5, color: '#82ff9e' }}>{fileMsg}</div>}
          </div>

          {/* Save Code Export / Import */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>🔑 セーブコード</span>
            </div>
            <button type="button" className="rpg-btn sm" onClick={handleCopyExport}>
              セーブコードをコピー
            </button>
            {exportMsg && <div style={{ fontSize: 10.5, color: '#82ff9e' }}>{exportMsg}</div>}

            <textarea
              className="save-textarea"
              placeholder="RTL1:..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              type="button"
              className="rpg-btn sm emerald"
              disabled={!importText.trim()}
              onClick={handleImport}
            >
              コードから復元
            </button>
            {importMsg && <div style={{ fontSize: 10.5, color: '#ffe570' }}>{importMsg}</div>}
          </div>

          {/* Cumulative Stats */}
          <div className="rpg-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5, fontSize: 10 }}>
            <div>累計討伐：<strong>{save.stats.totalKills.toLocaleString()}</strong></div>
            <div>ボス撃破：<strong>{save.stats.totalBossKills.toLocaleString()}</strong></div>
            <div>宝箱開封：<strong>{save.stats.totalChestsOpened.toLocaleString()}</strong></div>
            <div>獲得装備：<strong>{save.stats.totalItemsLooted.toLocaleString()}</strong></div>
            <div>ミシック：<strong style={{ color: '#ff7084' }}>{save.stats.totalMythicsFound}</strong></div>
            <div>最高階層：<strong>{save.stats.highestFloorReached}F</strong></div>
            <div>鍛冶強化：<strong>{save.stats.totalForgeUpgrades}回・最大+{save.stats.maxEnhanceReached}</strong></div>
            <div>OP再鍛造：<strong>{save.stats.totalRerolls}回</strong></div>
            <div>極進化：<strong>{save.stats.totalEvolutions}体・真{save.stats.totalTrueEvolutions}体</strong></div>
            <div>闘技場制覇：<strong>{save.stats.bossRushClears}回・W{save.bossRushBestWave}/{BOSS_RUSH_MAX_WAVE}</strong></div>
            <div>刻印撃破：<strong>{save.stats.trialClears}回</strong></div>
          </div>
        </>
      )}
    </div>
  );
}
