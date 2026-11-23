import { useState } from 'react';
import { BIOMES } from '../game/data/biomes';
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
  onBuyShopItem,
  onRefreshShop,
  onBuyMysteryBox,
  onImportSaveCode,
  onResetSave,
}: WorldPanelProps) {
  const [section, setSection] = useState<'altar' | 'shop' | 'save'>('altar');
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
      setExportMsg('セーブコードをクリップボードにコピーしました！');
    } catch {
      setImportText(code);
      setExportMsg('下の欄にセーブコードを出力しました（全選択してコピーしてください）。');
    }
  };

  const handleImport = () => {
    const res = onImportSaveCode(importText);
    if (res.ok) {
      setImportMsg('セーブデータを復元しました！');
      setImportText('');
    } else {
      setImportMsg(res.error ?? '復元に失敗しました');
    }
  };

  return (
    <div className="panel-body">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'altar' ? 'primary' : ''}`}
          onClick={() => setSection('altar')}
        >
          世界ランク
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'shop' ? 'primary' : ''}`}
          onClick={() => setSection('shop')}
        >
          鍛冶・商店
        </button>
        <button
          type="button"
          className={`rpg-btn sm ${section === 'save' ? 'primary' : ''}`}
          onClick={() => setSection('save')}
        >
          記録・戦績
        </button>
      </div>

      {section === 'altar' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="section-heading">
              <span>世界ランクの祭壇</span>
              <span>最大解放: Tier {toRoman(save.maxUnlockedTier)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#fff2bd' }}>
              恒久加護（全Tier有効）: 全能力 <strong>+{Math.round((blessing.statMult - 1) * 100)}%</strong> / トレハン{' '}
              <strong>+{blessing.magicFindBonus}%</strong> / EXP <strong>+{blessing.expBonusPct}%</strong>
            </div>
            <div className="muted-text">
              リセット無し！現在の最大Tier（Tier {toRoman(save.maxUnlockedTier)}）で20Fの「星喰いの虚無獣」を撃破すると次の世界ランクが解放されます。
            </div>

            {/* Tier Selector */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
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
                    {unlocked ? `Tier ${toRoman(t)}` : `🔒 Tier ${toRoman(t)}`}
                  </button>
                );
              })}
            </div>
            {!inVillage && (
              <div className="muted-text">※世界ランクの変更と階層選択は「始まりの村」で行えます。</div>
            )}
          </div>

          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="section-heading">
              <span>選択中: {activeMods.label} の環境</span>
              <span>iLv上限 +{activeMods.itemLevelBonus}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', fontSize: 11 }}>
              <span>敵HP x{activeMods.enemyHpMult.toFixed(1)}</span>
              <span>経験値 x{activeMods.expMult.toFixed(1)}</span>
              <span>金貨 x{activeMods.goldMult.toFixed(1)}</span>
              <span style={{ color: '#ff8a98' }}>強敵率 {Math.round(activeMods.eliteChance * 100)}%</span>
            </div>
          </div>

          {/* Checkpoint Fast Entry */}
          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="section-heading">
              <span>迷宮ワープ出撃 ({activeMods.label})</span>
              <span>最高到達 {highestInActiveTier}F</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {checkpoints.map((fl) => {
                const b =
                  fl <= 5
                    ? BIOMES.forest.shortName
                    : fl <= 10
                      ? BIOMES.ruins.shortName
                      : fl <= 15
                        ? BIOMES.volcano.shortName
                        : fl <= 20
                          ? BIOMES.abyss.shortName
                          : 'エンドレス';
                return (
                  <button
                    key={fl}
                    type="button"
                    className="rpg-btn sm emerald"
                    disabled={!inVillage}
                    onClick={() => onEnterDungeonFloor(fl)}
                  >
                    {fl}F ({b})
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {section === 'shop' && (
        <>
          <div className="rpg-card-gold" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: '#ffe570' }}>
                秘宝ミステリー箱 (R〜M確定)
              </div>
              <div className="muted-text">現在の最高到達階層＆世界ランク基準で1点生成</div>
            </div>
            <button
              type="button"
              className="rpg-btn sm primary"
              disabled={save.gold < mysteryCost}
              onClick={onBuyMysteryBox}
            >
              {mysteryCost.toLocaleString()}G
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-heading">本日の掘り出し物</span>
            <button
              type="button"
              className="rpg-btn sm"
              disabled={save.gold < refreshCost}
              onClick={onRefreshShop}
            >
              品揃え更新 ({refreshCost}G)
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
                  style={{ borderLeft: `4px solid ${rm.border}`, cursor: 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <PixelIcon spriteKey={item.iconKey} size={26} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: rm.color }}>
                        {item.name}
                      </div>
                      <div className="muted-text">
                        {SLOT_LABELS[item.slot]} iLv.{item.itemLevel} / OP {item.affixes.length}個
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rpg-btn sm primary"
                    disabled={save.gold < price}
                    onClick={() => onBuyShopItem(item.id)}
                  >
                    {price.toLocaleString()}G
                  </button>
                </div>
              );
            })}
            {save.shopItems.length === 0 && (
              <div className="muted-text" style={{ textAlign: 'center', padding: 10 }}>
                完売しました。「品揃え更新」で補充できます。
              </div>
            )}
          </div>
        </>
      )}

      {section === 'save' && (
        <>
          <div className="rpg-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
            <div>累計討伐数: <strong>{save.stats.totalKills.toLocaleString()}</strong></div>
            <div>ボス撃破数: <strong>{save.stats.totalBossKills.toLocaleString()}</strong></div>
            <div>開封宝箱数: <strong>{save.stats.totalChestsOpened.toLocaleString()}</strong></div>
            <div>獲得装備数: <strong>{save.stats.totalItemsLooted.toLocaleString()}</strong></div>
            <div>ミシック発見: <strong style={{ color: '#ff7084' }}>{save.stats.totalMythicsFound}</strong></div>
            <div>最高到達階: <strong>{save.stats.highestFloorReached}F</strong></div>
          </div>

          <div className="rpg-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="section-heading">
              <span>セーブデータ引き継ぎ（完全ローカル完結）</span>
            </div>
            <div className="muted-text">
              進行状況はブラウザへ自動保存されます。別端末への移行やバックアップにはセーブコードを使ってください。
            </div>
            <button type="button" className="rpg-btn sm primary" onClick={handleCopyExport}>
              セーブコードを出力・コピー
            </button>
            {exportMsg && <div style={{ fontSize: 11, color: '#82ff9e' }}>{exportMsg}</div>}

            <textarea
              className="save-textarea"
              placeholder="RTL1:... で始まるセーブコードをここに貼り付け"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              type="button"
              className="rpg-btn sm emerald"
              disabled={!importText.trim()}
              onClick={handleImport}
            >
              コードからセーブ復元
            </button>
            {importMsg && <div style={{ fontSize: 11, color: '#ffe570' }}>{importMsg}</div>}
          </div>

          <div className="rpg-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted-text">最初からやり直す</span>
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
                  本当に初期化
                </button>
                <button
                  type="button"
                  className="rpg-btn sm"
                  onClick={() => setConfirmReset(false)}
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="rpg-btn sm danger"
                onClick={() => setConfirmReset(true)}
              >
                データ初期化
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
