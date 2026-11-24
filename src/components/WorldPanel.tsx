import { useState } from 'react';
import { BOSS_RUSH_WAVES } from '../game/bossRush';
import { RARITY_META, SLOT_LABELS } from '../game/data/equipment';
import { exportSaveCode } from '../game/save';
import type { GameSave } from '../game/types';
import {
  getActiveTierModifiers,
  getShopPrice,
  getWorldTierBlessing,
  toRoman,
} from '../game/worldTier';
import { PixelIcon } from './PixelIcon';

interface WorldPanelProps {
  save: GameSave;
  inVillage: boolean;
  onSelectWorldTier: (tier: number) => void;
  onEnterDungeonFloor: (floor: number) => void;
  onStartBossRush: () => void;
  onBuyShopItem: (itemId: string) => void;
  onRefreshShop: () => void;
  onBuyMysteryBox: () => void;
  onImportSaveCode: (code: string) => { ok: boolean; error?: string };
  onResetSave: () => void;
}

export function WorldPanel({
  save,
  inVillage,
  onSelectWorldTier,
  onEnterDungeonFloor,
  onStartBossRush,
  onBuyShopItem,
  onRefreshShop,
  onBuyMysteryBox,
  onImportSaveCode,
  onResetSave,
}: WorldPanelProps) {
  const [section, setSection] = useState<'altar' | 'arena' | 'shop' | 'save'>('altar');
  const [importText, setImportText] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const blessing = getWorldTierBlessing(save.maxUnlockedTier);
  const activeMods = getActiveTierModifiers(save.worldTier);
  const highestInActiveTier = save.highestFloorByTier[save.worldTier] ?? 1;

  // Checkpoint floors unlocked in the active World Tier (1F, 6F, 11F, 16F, 21F...)
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
      setExportMsg('下の欄へ出力した。コピーして保存してください。');
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

  return (
    <div className="panel-body">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 3 }}>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'altar' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => setSection('altar')}
        >
          世界ランク
        </button>
        <button
          id="btn-subtab-arena"
          type="button"
          className={`rpg-btn sm ${section === 'arena' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => setSection('arena')}
        >
          🏟闘技場
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'shop' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => setSection('shop')}
        >
          鍛冶商店
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'save' ? 'primary' : ''}`}
          style={{ padding: '4px 2px', fontSize: 10 }}
          onClick={() => setSection('save')}
        >
          記録
        </button>
      </div>

      {section === 'altar' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>世界ランクの祭壇</span>
              <span>最大 Tier {toRoman(save.maxUnlockedTier)}</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#fff2bd', lineHeight: 1.35 }}>
              恒久加護：全能力 <strong>+{Math.round((blessing.statMult - 1) * 100)}%</strong> / MF{' '}
              <strong>+{blessing.magicFindBonus}%</strong> / EXP <strong>+{blessing.expBonusPct}%</strong>
            </div>
            <div className="muted-text">
              最大Tierの20Fボス撃破で次ランク解放
            </div>

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
            {!inVillage && (
              <div className="muted-text">変更とワープは村でのみ可能</div>
            )}
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
              <span style={{ color: '#82ff9e' }}>最高 W{save.bossRushBestWave}/5</span>
            </div>
            <div className="muted-text" style={{ lineHeight: 1.35 }}>
              歴代ボス5連戦。HP・MP・秘薬・連携ゲージを引き継ぐ。全制覇でミシック確定。
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
            {!inVillage && (
              <div className="muted-text" style={{ textAlign: 'center' }}>
                村でのみ挑戦可能
              </div>
            )}
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
                    borderColor: cleared ? '#6be088' : w.wave === 5 ? 'var(--border-gold)' : undefined,
                    minWidth: 0,
                  }}
                >
                  <PixelIcon spriteKey={w.leadSprite} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: w.wave === 5 ? '#ffe570' : undefined,
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
              <div className="muted-text">到達階層に応じたレア以上装備を1点生成</div>
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
          <div className="rpg-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 5, fontSize: 10 }}>
            <div>累計討伐：<strong>{save.stats.totalKills.toLocaleString()}</strong></div>
            <div>ボス撃破：<strong>{save.stats.totalBossKills.toLocaleString()}</strong></div>
            <div>宝箱開封：<strong>{save.stats.totalChestsOpened.toLocaleString()}</strong></div>
            <div>獲得装備：<strong>{save.stats.totalItemsLooted.toLocaleString()}</strong></div>
            <div>ミシック：<strong style={{ color: '#ff7084' }}>{save.stats.totalMythicsFound}</strong></div>
            <div>最高階層：<strong>{save.stats.highestFloorReached}F</strong></div>
            <div>鍛冶強化：<strong>{save.stats.totalForgeUpgrades}回・最大+{save.stats.maxEnhanceReached}</strong></div>
            <div>OP再鍛造：<strong>{save.stats.totalRerolls}回</strong></div>
            <div>極進化：<strong>{save.stats.totalEvolutions}体</strong></div>
            <div>闘技場制覇：<strong>{save.stats.bossRushClears}回・最高W{save.bossRushBestWave}</strong></div>
          </div>

          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="section-heading">
              <span>セーブデータ引継ぎ</span>
            </div>
            <div className="muted-text">
              自動保存対応。コードで別端末へ移行できます。
            </div>
            <button type="button" className="rpg-btn sm primary" onClick={handleCopyExport}>
              セーブコードをコピー
            </button>
            {exportMsg && <div style={{ fontSize: 11, color: '#82ff9e' }}>{exportMsg}</div>}

            <textarea
              className="save-textarea"
              placeholder="RTL1:... のセーブコードを貼り付け"
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
            {importMsg && <div style={{ fontSize: 11, color: '#ffe570' }}>{importMsg}</div>}
          </div>

          <div className="rpg-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted-text">セーブ初期化</span>
            {confirmReset ? (
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  type="button"
                  className="rpg-btn sm danger"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                >
                  初期化する
                </button>
                <button
                  type="button"
                  className="rpg-btn sm"
                  onClick={() => setConfirmReset(false)}
                >
                  戻る
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="rpg-btn sm danger"
                onClick={() => setConfirmReset(true)}
              >
                初期化
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
