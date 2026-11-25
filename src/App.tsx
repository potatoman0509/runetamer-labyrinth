import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BattlePanel } from './components/BattlePanel';
import { CompendiumPanel } from './components/CompendiumPanel';
import { EquipmentPanel } from './components/EquipmentPanel';
import { GameCanvas } from './components/GameCanvas';
import { PartyPanel } from './components/PartyPanel';
import { PixelIcon } from './components/PixelIcon';
import { WorldPanel, type WorldSection } from './components/WorldPanel';
import { getUnitEquipVisualKey } from './engine/equipVisuals';
import { soundEngine } from './engine/sound';
import { ACHIEVEMENT_MAP, getUnclaimedAchievements } from './game/achievements';
import {
  createBattleState,
  executeTurnAction,
  findBattleUnit,
  resolveBattleVictory,
  shouldAutoSell,
  stepEnemyOrAutoTurn,
  type PlayerActionCommand,
} from './game/battle';
import { BOSS_RUSH_MAX_WAVE, createBossRushEntity, getBossRushWave } from './game/bossRush';
import { BIOMES, getBiomeForFloor } from './game/data/biomes';
import {
  calculateItemScore,
  enhanceEquipment,
  generateEquipment,
  getEnhanceCost,
  getRerollCost,
  getSalvageValue,
  MAX_ENHANCE_LEVEL,
  RARITY_META,
  rerollAffixSlot,
} from './game/data/equipment';
import { getSpecies, HERO_SPECIES } from './game/data/monsters';
import {
  createDungeonExpedition,
  createVillageExpedition,
  generateStepChoices,
  pickAutoExpeditionChoice,
  type ExpeditionChoice,
  type ExpeditionState,
} from './game/expedition';
import {
  applyEnhanceProgressToQuests,
  claimGuildQuestReward,
  getClaimableGuildQuestCount,
} from './game/guildQuests';
import {
  buildSaveFileName,
  createInitialSave,
  deleteSaveSlot,
  exportSaveJson,
  getActiveSaveSlot,
  importSaveCode,
  importSaveJson,
  listSaveSlotSummaries,
  loadGameFromSlot,
  saveGameToSlot,
  setActiveSaveSlot,
  trimInventorySafely,
  type SaveSlotId,
} from './game/save';
import {
  ALL_HERO_SKILLS,
  canUpgradeSkillNode,
  getAvailableSp,
  getUnlockedHeroSkillIds,
  SKILL_NODE_MAP,
} from './game/skillTree';
import {
  canEvolveMonster,
  canTrueEvolveMonster,
  computeUnitStats,
  expForNextLevel,
  getEvolutionRequirement,
  getPartyAggregatedLootBonuses,
  getTrueEvolutionRequirement,
} from './game/stats';
import type {
  ActiveShrineBuffs,
  AutoLootMode,
  AutoSellThreshold,
  BattleSpeed,
  BattleState,
  BattleTactic,
  EquipmentItem,
  EquipSlot,
  GameSave,
  MapEntity,
  TrialModId,
} from './game/types';
import { generateShopInventory, getShopPrice, toRoman } from './game/worldTier';

type ActiveTab = 'explore' | 'party' | 'gear' | 'compendium' | 'world';

const EMPTY_SHRINE_BUFFS: ActiveShrineBuffs = {
  powerBonus: 0,
  fortuneBonus: 0,
  curseEnemyBonus: 0,
};

const INITIAL_RUN_POTIONS = { hp: 1, mp: 1 };

export function App() {
  const [activeSlot, setActiveSlot] = useState<SaveSlotId>(() => getActiveSaveSlot());
  const [save, setSave] = useState<GameSave>(
    () => loadGameFromSlot(getActiveSaveSlot()) ?? createInitialSave(),
  );
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => save.savedAt);
  const [slotRevision, setSlotRevision] = useState(0);
  const [expedition, setExpedition] = useState<ExpeditionState>(() => createVillageExpedition());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [pendingAdvanceOnWin, setPendingAdvanceOnWin] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [worldSection, setWorldSection] = useState<WorldSection>('altar');
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [selectedEnemyUid, setSelectedEnemyUid] = useState<string | null>(null);
  const [shrineBuffs, setShrineBuffs] = useState<ActiveShrineBuffs>(EMPTY_SHRINE_BUFFS);
  const [runPotions, setRunPotions] = useState(INITIAL_RUN_POTIONS);

  const [autoAdvance, setAutoAdvance] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    saveGameToSlot(activeSlot, save);
  }, [activeSlot, save]);

  useEffect(() => {
    soundEngine.setMuted(Boolean(save.settings.soundMuted));
  }, [save.settings.soundMuted]);

  useEffect(() => {
    const unlock = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (battle) {
      soundEngine.setBgm(battle.isBossBattle || battle.bossRushWave ? 'boss' : 'battle');
    } else if (expedition.inVillage) {
      soundEngine.setBgm('village');
    } else {
      soundEngine.setBgm('dungeon');
    }
  }, [battle, expedition.inVillage]);

  const invMap = useMemo(
    () => new Map(save.inventory.map((it) => [it.id, it])),
    [save.inventory],
  );

  const healAllParty = useCallback(
    (ratio = 1, silent = false) => {
      setSave((prev) => {
        const nextRoster = { ...prev.roster };
        const mapInv = new Map(prev.inventory.map((it) => [it.id, it]));
        for (const id of Object.keys(nextRoster)) {
          const u = nextRoster[id]!;
          const st = computeUnitStats(u, prev, shrineBuffs, mapInv);
          if (ratio >= 1) {
            nextRoster[id] = { ...u, hp: st.maxHp, mp: st.maxMp };
          } else {
            nextRoster[id] = {
              ...u,
              hp: Math.min(st.maxHp, u.hp + Math.round(st.maxHp * ratio)),
              mp: Math.min(st.maxMp, u.mp + Math.round(st.maxMp * ratio)),
            };
          }
        }
        return { ...prev, roster: nextRoster };
      });
      if (!silent) {
        soundEngine.playSfx('heal');
        showToast(
          ratio >= 1
            ? '泉で全員のHP・MPが全回復した'
            : `焚き火で全員のHP・MPが${Math.round(ratio * 100)}%回復した`,
        );
      }
    },
    [shrineBuffs, showToast],
  );

  const returnToVillage = useCallback(
    (msg?: string) => {
      setAutoAdvance(false);
      setBattle(null);
      setPendingAdvanceOnWin(false);
      setShrineBuffs(EMPTY_SHRINE_BUFFS);
      setRunPotions(INITIAL_RUN_POTIONS);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      setSave((prev) => {
        const nextRoster = { ...prev.roster };
        const mapInv = new Map(prev.inventory.map((it) => [it.id, it]));
        for (const id of Object.keys(nextRoster)) {
          const u = nextRoster[id]!;
          const st = computeUnitStats(u, prev, undefined, mapInv);
          nextRoster[id] = { ...u, hp: st.maxHp, mp: st.maxMp };
        }
        return { ...prev, roster: nextRoster };
      });
      showToast(msg ?? '始まりの村へ帰還した');
    },
    [showToast],
  );

  const enterDungeonFloor = useCallback(
    (floor: number) => {
      const targetFloor = Math.max(1, floor);
      setBattle(null);
      setPendingAdvanceOnWin(false);
      setActiveTab('explore');
      setExpedition(createDungeonExpedition(targetFloor, save.worldTier));
      setSave((prev) => ({
        ...prev,
        highestFloorByTier: {
          ...prev.highestFloorByTier,
          [prev.worldTier]: Math.max(prev.highestFloorByTier[prev.worldTier] ?? 1, targetFloor),
        },
        stats: {
          ...prev.stats,
          highestFloorReached: Math.max(prev.stats.highestFloorReached, targetFloor),
        },
      }));
      const b = BIOMES[getBiomeForFloor(targetFloor)];
      showToast(`${b.name} ${targetFloor}F・Tier ${toRoman(save.worldTier)}`);
    },
    [save.worldTier, showToast],
  );

  const advanceExpeditionStep = useCallback(
    (
      worldTier: number,
      markBossDefeated = false,
      markRestUsed = false,
      stepDelta: number | boolean = true,
    ) => {
      const delta = typeof stepDelta === 'number' ? stepDelta : stepDelta ? 1 : 0;
      setExpedition((prev) => {
        if (prev.inVillage) return prev;
        const nextBossDefeated = prev.bossDefeated || markBossDefeated;
        const nextRestUsed = prev.restUsedOnFloor || markRestUsed;
        const nextStep = Math.min(prev.maxSteps, prev.step + delta);
        return {
          ...prev,
          step: nextStep,
          bossDefeated: nextBossDefeated,
          restUsedOnFloor: nextRestUsed,
          choices: generateStepChoices(
            prev.floor,
            nextStep,
            prev.maxSteps,
            worldTier,
            nextBossDefeated,
            nextRestUsed,
          ),
          marchUntilMs: delta > 0 ? Date.now() + 550 : prev.marchUntilMs,
        };
      });
    },
    [],
  );

  // Helper to grant chest/event loot with auto-sell / auto-salvage & safe 140-cap protection
  const grantLootItems = useCallback(
    (items: EquipmentItem[], bonusGold: number, bonusStones: number, isChest: boolean) => {
      const kept: EquipmentItem[] = [];
      let autoCount = 0;
      let autoGold = 0;
      let autoStones = 0;
      let mythics = 0;
      const mode = save.settings.autoLootMode;

      for (const it of items) {
        if (it.rarity === 'mythic') mythics += 1;
        if (!it.uniqueId && shouldAutoSell(it.rarity, save.settings.autoSell)) {
          autoCount += 1;
          if (mode === 'salvage') autoStones += getSalvageValue(it);
          else autoGold += it.sellValue;
        } else {
          kept.push(it);
        }
      }
      if (mythics > 0) soundEngine.playSfx('mythic');

      setSave((prev) => {
        const uniques = new Set(prev.discoveredUniques);
        for (const it of items) {
          if (it.uniqueId) uniques.add(it.uniqueId);
        }
        return {
          ...prev,
          gold: prev.gold + bonusGold + autoGold,
          forgeStones: prev.forgeStones + bonusStones + autoStones,
          inventory: trimInventorySafely([...kept, ...prev.inventory], prev.roster),
          discoveredUniques: Array.from(uniques),
          stats: {
            ...prev.stats,
            totalChestsOpened: prev.stats.totalChestsOpened + (isChest ? 1 : 0),
            totalItemsLooted: prev.stats.totalItemsLooted + items.length,
            totalMythicsFound: prev.stats.totalMythicsFound + mythics,
          },
        };
      });

      return { kept, autoCount, autoGold, autoStones, mode };
    },
    [save.settings.autoLootMode, save.settings.autoSell],
  );

  // Execute a selected Expedition Command Choice (including all 5 v2 dungeon events!)
  const handleSelectChoice = useCallback(
    (choice: ExpeditionChoice) => {
      if (battle || expedition.inVillage) return;
      const lootBonuses = getPartyAggregatedLootBonuses(save, shrineBuffs);

      if (choice.kind === 'stairs') {
        enterDungeonFloor(expedition.floor + 1);
        return;
      }

      if (choice.kind === 'return_village') {
        returnToVillage();
        return;
      }

      if (choice.kind === 'rest') {
        healAllParty(0.3, false);
        advanceExpeditionStep(save.worldTier, false, true, false);
        return;
      }

      if (
        choice.kind === 'shrine_heal' ||
        choice.kind === 'shrine_power' ||
        choice.kind === 'shrine_fortune'
      ) {
        if (choice.kind === 'shrine_heal') {
          healAllParty(1, true);
          showToast('癒しの祠・全員HP・MP全回復');
        } else if (choice.kind === 'shrine_power') {
          setShrineBuffs((b) => ({ ...b, powerBonus: Math.min(0.54, b.powerBonus + 0.18) }));
          showToast('剛力の祠・攻撃・魔力+18%');
        } else {
          setShrineBuffs((b) => ({ ...b, fortuneBonus: Math.min(150, b.fortuneBonus + 30) }));
          showToast('幸運の祠・トレハン+30%');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 1: 呪いの祭壇 (Curse Altar) =====
      if (choice.kind === 'curse_altar') {
        setShrineBuffs((b) => ({
          ...b,
          fortuneBonus: Math.min(240, b.fortuneBonus + 65),
          curseEnemyBonus: Math.min(0.95, b.curseEnemyBonus + 0.2),
        }));
        // Sacrifice 28% of current HP (non-lethal, min 1 HP)
        setSave((prev) => {
          const nextRoster = { ...prev.roster };
          for (const pid of prev.partyIds) {
            const u = nextRoster[pid];
            if (u) {
              nextRoster[pid] = { ...u, hp: Math.max(1, Math.round(u.hp * 0.72)) };
            }
          }
          return { ...prev, roster: nextRoster };
        });
        const rewardItem = generateEquipment(
          expedition.floor + 1,
          save.worldTier,
          lootBonuses.magicFind + 55,
          'boss',
        );
        const stones = Math.round((6 + expedition.floor * 0.45) * (1 + (save.worldTier - 1) * 0.4));
        const res = grantLootItems([rewardItem], 0, stones, false);
        showToast(
          `呪いの契約・MF+65%・💎+${stones}・${res.kept[0] ? `${res.kept[0].name}` : '装備'}獲得`,
        );
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 2: 怪しい宝箱＆ミミック強襲 (Suspicious Chest / Mimic) =====
      if (choice.kind === 'suspicious_chest') {
        if (Math.random() < 0.55) {
          // Mimic Ambush Battle!
          const entity: MapEntity = {
            id: choice.id,
            kind: 'rare_enemy',
            x: 0,
            y: 0,
            spriteKey: 'mimic',
            name: '宝箱ミミック',
            speciesIds: ['mimic'],
            interacted: false,
          };
          const bState = createBattleState(save, entity, expedition.floor, {
            shrineBuffs,
            hpPotions: runPotions.hp,
            mpPotions: runPotions.mp,
          });
          setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
          setPendingAdvanceOnWin(choice.advancesStep);
          setBattle(bState);
          showToast('宝箱ミミックが現れた');
          return;
        }
        // Jackpot Treasure (nerfed count)
        const items: EquipmentItem[] = [
          generateEquipment(expedition.floor + 1, save.worldTier, lootBonuses.magicFind + 45, 'boss'),
        ];
        if (Math.random() < 0.6) {
          items.push(
            generateEquipment(expedition.floor, save.worldTier, lootBonuses.magicFind + 30, 'gold_chest'),
          );
        }
        const bonusGold = Math.round(70 * (1 + expedition.floor * 0.32) * Math.pow(2.0, save.worldTier - 1));
        const bonusStones = Math.round((5 + expedition.floor * 0.32) * (1 + (save.worldTier - 1) * 0.38));
        const res = grantLootItems(items, bonusGold, bonusStones, true);
        showToast(
          `秘宝獲得・${res.kept[0] ? res.kept[0].name : '装備'}・💎+${bonusStones}・${bonusGold}G`,
        );
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 3: 迷宮の行商人 (Wandering Merchant) =====
      if (choice.kind === 'merchant') {
        const cost = choice.merchantCostGold ?? 60;
        if (save.gold >= cost) {
          const item = generateEquipment(
            expedition.floor + 1,
            save.worldTier,
            lootBonuses.magicFind + 28,
            'gold_chest',
          );
          const stones = Math.round((7 + expedition.floor * 0.4) * (1 + (save.worldTier - 1) * 0.4));
          setSave((prev) => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
          const res = grantLootItems([item], 0, stones, false);
          showToast(
            `行商人から購入・💎+${stones}・${res.kept[0] ? res.kept[0].name : '装備'}`,
          );
        } else {
          healAllParty(0.3, true);
          showToast('行商人から薬草を受け取った・HP・MP30%回復');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 4: 旅の鍛冶師 (Wandering Blacksmith Free +1) =====
      if (choice.kind === 'wandering_smith') {
        let targetItemId: string | null = null;
        for (const pid of save.partyIds) {
          const u = save.roster[pid];
          if (!u) continue;
          for (const sl of ['weapon', 'armor', 'relic', 'rune'] as const) {
            const eid = u.equipped[sl];
            const eq = eid ? invMap.get(eid) : undefined;
            if (eq && eq.enhanceLevel < MAX_ENHANCE_LEVEL) {
              targetItemId = eq.id;
              break;
            }
          }
          if (targetItemId) break;
        }

        if (targetItemId) {
          const orig = invMap.get(targetItemId)!;
          const { upgraded, isBreakthrough } = enhanceEquipment(orig);
          setSave((prev) => ({
            ...prev,
            inventory: prev.inventory.map((i) => (i.id === targetItemId ? upgraded : i)),
            stats: {
              ...prev.stats,
              totalForgeUpgrades: prev.stats.totalForgeUpgrades + 1,
              maxEnhanceReached: Math.max(prev.stats.maxEnhanceReached, upgraded.enhanceLevel),
            },
          }));
          showToast(
            isBreakthrough
              ? `旅の鍛冶師・${upgraded.name}が★+${upgraded.enhanceLevel}突破`
              : `旅の鍛冶師・${upgraded.name}を+${upgraded.enhanceLevel}へ強化`,
          );
        } else {
          const giftStones = 6 + save.worldTier * 2;
          setSave((prev) => ({ ...prev, forgeStones: prev.forgeStones + giftStones }));
          showToast(`旅の鍛冶師から💎+${giftStones}を受け取った`);
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // Regular / Gold Chest (nerfed drop counts)
      if (choice.kind === 'chest' || choice.kind === 'gold_chest') {
        const isGold = choice.kind === 'gold_chest';
        const itemCount = isGold
          ? 1 + (Math.random() < 0.45 ? 1 : 0)
          : Math.random() < 0.7
            ? 1
            : 0;
        const generated: EquipmentItem[] = [];
        for (let i = 0; i < itemCount; i += 1) {
          generated.push(
            generateEquipment(
              expedition.floor,
              save.worldTier,
              lootBonuses.magicFind + (isGold ? 22 : 5),
              isGold ? 'gold_chest' : 'chest',
            ),
          );
        }
        const bonusGold = Math.round(
          (isGold ? 52 : 22) *
            (1 + expedition.floor * 0.32) *
            Math.pow(2.0, save.worldTier - 1),
        );
        const bonusStones = Math.round(
          (isGold ? 4 : 1) * (1 + (save.worldTier - 1) * 0.35) * (1 + lootBonuses.stoneFind / 100),
        );
        const res = grantLootItems(generated, bonusGold, bonusStones, true);
        const topItem = res.kept[0];
        if (topItem) {
          showToast(
            `${isGold ? '黄金箱' : '宝箱'}・${topItem.name}・💎+${bonusStones}・${bonusGold}G`,
          );
        } else if (res.autoCount > 0) {
          showToast(
            res.mode === 'salvage'
              ? `宝箱・自動分解で💎+${bonusStones + res.autoStones}`
              : `宝箱・自動売却で+${bonusGold + res.autoGold}G`,
          );
        } else {
          showToast(`${isGold ? '黄金箱' : '宝箱'}・💎+${bonusStones}・${bonusGold}G`);
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 5: 魔力の泉 (MP Fountain) =====
      if (choice.kind === 'fountain_mp') {
        setSave((prev) => {
          const nextRoster = { ...prev.roster };
          const mapInv = new Map(prev.inventory.map((it) => [it.id, it]));
          for (const id of Object.keys(nextRoster)) {
            const u = nextRoster[id]!;
            const st = computeUnitStats(u, prev, shrineBuffs, mapInv);
            nextRoster[id] = {
              ...u,
              hp: Math.min(st.maxHp, u.hp + Math.round(st.maxHp * 0.25)),
              mp: st.maxMp,
            };
          }
          return { ...prev, roster: nextRoster };
        });
        soundEngine.playSfx('heal');
        showToast('魔力の泉・全員MP全回復・HP+25%');
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 6: 秘薬の錬金釜 (Alchemy Pot) =====
      if (choice.kind === 'alchemy_pot') {
        const stones = Math.round((3 + expedition.floor * 0.25) * (1 + (save.worldTier - 1) * 0.35));
        setRunPotions((p) => ({
          hp: Math.min(5, p.hp + 1),
          mp: Math.min(5, p.mp + 1),
        }));
        setSave((prev) => ({ ...prev, forgeStones: prev.forgeStones + stones }));
        soundEngine.playSfx('buff');
        showToast(`秘薬調合・HP/MP秘薬+1・💎+${stones}`);
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 7: 古代のルーン碑 (Rune Tablet) =====
      if (choice.kind === 'rune_tablet') {
        const expGain = Math.round(
          (30 + expedition.floor * 13) * (1 + (save.worldTier - 1) * 0.45),
        );
        const powerRoll = Math.random() < 0.5;
        if (powerRoll) {
          setShrineBuffs((b) => ({ ...b, powerBonus: Math.min(0.54, b.powerBonus + 0.1) }));
        } else {
          setShrineBuffs((b) => ({ ...b, fortuneBonus: Math.min(240, b.fortuneBonus + 18) }));
        }
        let leveledAny = false;
        setSave((prev) => {
          const nextRoster = { ...prev.roster };
          for (const pid of prev.partyIds) {
            const u = nextRoster[pid];
            if (!u) continue;
            const updated = { ...u, exp: u.exp + expGain };
            while (updated.exp >= expForNextLevel(updated.level)) {
              updated.exp -= expForNextLevel(updated.level);
              updated.level += 1;
              leveledAny = true;
            }
            nextRoster[pid] = updated;
          }
          return { ...prev, roster: nextRoster };
        });
        soundEngine.playSfx(leveledAny ? 'levelup' : 'buff');
        showToast(
          `ルーン碑・全員EXP+${expGain}・${powerRoll ? '火力+10%' : 'トレハン+18%'}`,
        );
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 8: 練武の祭場 (Training Ground) =====
      if (choice.kind === 'training_ground') {
        const expGain = Math.round(
          (52 + expedition.floor * 19) * (1 + (save.worldTier - 1) * 0.5),
        );
        const stones = Math.round((4 + expedition.floor * 0.3) * (1 + (save.worldTier - 1) * 0.35));
        let leveledAny = false;
        setSave((prev) => {
          const nextRoster = { ...prev.roster };
          for (const pid of prev.partyIds) {
            const u = nextRoster[pid];
            if (!u) continue;
            const updated = {
              ...u,
              hp: Math.max(1, Math.round(u.hp * 0.85)),
              exp: u.exp + expGain,
            };
            while (updated.exp >= expForNextLevel(updated.level)) {
              updated.exp -= expForNextLevel(updated.level);
              updated.level += 1;
              leveledAny = true;
            }
            nextRoster[pid] = updated;
          }
          return {
            ...prev,
            forgeStones: prev.forgeStones + stones,
            roster: nextRoster,
          };
        });
        soundEngine.playSfx(leveledAny ? 'levelup' : 'attack');
        showToast(`特訓完了・全員EXP+${expGain}・💎+${stones}・HP-15%`);
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 9: 謎の落とし物袋 (Mystery Bag) =====
      if (choice.kind === 'mystery_bag') {
        const roll = Math.random();
        if (roll < 0.3) {
          const goldFound = Math.round(
            75 * (1 + expedition.floor * 0.35) * Math.pow(2.0, save.worldTier - 1),
          );
          grantLootItems([], goldFound, 2, false);
          showToast(`落とし物袋・金貨袋を発見 +${goldFound.toLocaleString()}G・💎+2`);
        } else if (roll < 0.55) {
          const stones = Math.round(
            (7 + expedition.floor * 0.4) * (1 + (save.worldTier - 1) * 0.4),
          );
          grantLootItems([], 0, stones, false);
          showToast(`落とし物袋・鍛冶石の塊 💎+${stones}`);
        } else if (roll < 0.8) {
          const item = generateEquipment(
            expedition.floor + 1,
            save.worldTier,
            lootBonuses.magicFind + 28,
            'gold_chest',
          );
          const res = grantLootItems([item], 0, 2, false);
          showToast(`落とし物袋・${res.kept[0] ? res.kept[0].name : '装備'}・💎+2`);
        } else {
          const consolationGold = Math.round(
            24 * (1 + expedition.floor * 0.25) * Math.pow(1.8, save.worldTier - 1),
          );
          setSave((prev) => {
            const nextRoster = { ...prev.roster };
            for (const pid of prev.partyIds) {
              const u = nextRoster[pid];
              if (u) nextRoster[pid] = { ...u, hp: Math.max(1, Math.round(u.hp * 0.88)) };
            }
            return { ...prev, gold: prev.gold + consolationGold, roster: nextRoster };
          });
          soundEngine.playSfx('attack');
          showToast(`罠針・全員HP-12%・小金貨+${consolationGold}G`);
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 10: 謎の賭博師 (Gambler) =====
      if (choice.kind === 'gambler') {
        const bet = choice.merchantCostGold ?? 40;
        if (save.gold >= bet) {
          if (Math.random() < 0.55) {
            const payout = Math.round(bet * 2.4);
            const profit = payout - bet;
            setSave((prev) => ({
              ...prev,
              gold: prev.gold + profit,
              forgeStones: prev.forgeStones + 3,
            }));
            soundEngine.playSfx('victory');
            showToast(`賭博勝利・+${profit.toLocaleString()}G・💎+3`);
          } else {
            setSave((prev) => ({
              ...prev,
              gold: Math.max(0, prev.gold - bet),
              forgeStones: prev.forgeStones + 2,
            }));
            showToast(`賭博敗北・-${bet.toLocaleString()}G・参加賞💎+2`);
          }
        } else {
          setSave((prev) => ({ ...prev, forgeStones: prev.forgeStones + 2 }));
          showToast('資金不足のため見送り・賭博師から💎+2');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 11: 隠し抜け道 (Expedition Shortcut) =====
      if (choice.kind === 'expedition_shortcut') {
        const bonusGold = Math.round(
          30 * (1 + expedition.floor * 0.25) * Math.pow(1.8, save.worldTier - 1),
        );
        const stones = Math.round((3 + expedition.floor * 0.2) * (1 + (save.worldTier - 1) * 0.3));
        grantLootItems([], bonusGold, stones, false);
        soundEngine.playSfx('buff');
        showToast(`隠し抜け道・進行STEP+2・💎+${stones}・+${bonusGold}G`);
        advanceExpeditionStep(save.worldTier, false, false, 2);
        return;
      }

      // Battle / Horde / Elite / Boss / Rare Encounter
      if (
        choice.kind === 'battle' ||
        choice.kind === 'battle_horde' ||
        choice.kind === 'elite' ||
        choice.kind === 'boss' ||
        choice.kind === 'rare_encounter'
      ) {
        const entity: MapEntity = {
          id: choice.id,
          kind:
            choice.kind === 'battle' || choice.kind === 'battle_horde'
              ? 'enemy'
              : choice.kind === 'rare_encounter'
                ? 'rare_enemy'
                : choice.kind,
          x: 0,
          y: 0,
          spriteKey: choice.spriteKey,
          name: choice.title,
          speciesIds: choice.speciesIds,
          interacted: false,
        };
        const bState = createBattleState(save, entity, expedition.floor, {
          shrineBuffs,
          hpPotions: runPotions.hp,
          mpPotions: runPotions.mp,
        });
        setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
        setPendingAdvanceOnWin(choice.advancesStep);
        setBattle(bState);
      }
    },
    [
      advanceExpeditionStep,
      battle,
      enterDungeonFloor,
      expedition.floor,
      expedition.inVillage,
      grantLootItems,
      healAllParty,
      invMap,
      returnToVillage,
      runPotions.hp,
      runPotions.mp,
      save,
      shrineBuffs,
      showToast,
    ],
  );

  useEffect(() => {
    if (!autoAdvance || battle || expedition.inVillage || activeTab !== 'explore') return;
    const timer = window.setTimeout(() => {
      const partyUnits = save.partyIds
        .map((id) => save.roster[id])
        .filter((u): u is NonNullable<typeof u> => Boolean(u));
      const avgHp =
        partyUnits.reduce((sum, u) => {
          const st = computeUnitStats(u, save, shrineBuffs, invMap);
          return sum + u.hp / st.maxHp;
        }, 0) / Math.max(1, partyUnits.length);

      const pick = pickAutoExpeditionChoice(expedition, avgHp);
      if (pick) handleSelectChoice(pick);
    }, 680);
    return () => window.clearTimeout(timer);
  }, [activeTab, autoAdvance, battle, expedition, handleSelectChoice, invMap, save, shrineBuffs]);

  const effectiveSelectedEnemyUid = useMemo(() => {
    if (!battle) return null;
    const alive = battle.enemies.find((e) => e.uid === selectedEnemyUid && e.hp > 0);
    return alive?.uid ?? battle.enemies.find((e) => e.hp > 0)?.uid ?? null;
  }, [battle, selectedEnemyUid]);

  const applyBattleTransition = useCallback(
    (next: BattleState) => {
      if (next.phase === 'victory' && !next.reward) {
        const { nextSave, reward } = resolveBattleVictory(save, next, shrineBuffs);
        if (reward.items.some((it) => it.rarity === 'mythic')) {
          soundEngine.playSfx('mythic');
        } else if (reward.leveledUpIds.length > 0) {
          soundEngine.playSfx('levelup');
        } else {
          soundEngine.playSfx('victory');
        }
        setSave(nextSave);
        setRunPotions({ hp: next.hpPotions, mp: next.mpPotions });
        setBattle({ ...next, reward });
        if (!next.bossRushWave) {
          advanceExpeditionStep(
            nextSave.worldTier,
            next.isBossBattle,
            false,
            pendingAdvanceOnWin,
          );
        }
        return;
      }
      if (next.phase === 'defeat') {
        soundEngine.playSfx('defeat');
      } else {
        const lastLog = next.logs[next.logs.length - 1] ?? '';
        if (lastLog.includes('ブレイク') || lastLog.includes('ルーンユニゾン')) {
          soundEngine.playSfx('break');
        } else if (lastLog.includes('魔力を溜めている')) {
          soundEngine.playSfx('boss_charge');
        } else if (lastLog.includes('WEAK')) {
          soundEngine.playSfx('weak');
        } else if (lastLog.includes('会心')) {
          soundEngine.playSfx('crit');
        } else if (lastLog.includes('回復')) {
          soundEngine.playSfx('heal');
        } else if (lastLog.includes('バリア') || lastLog.includes('身を固めた')) {
          soundEngine.playSfx('shield');
        } else if (lastLog.includes('強化')) {
          soundEngine.playSfx('buff');
        } else if (lastLog.includes('ダメージ')) {
          soundEngine.playSfx('attack');
        }
      }
      setBattle(next);
    },
    [advanceExpeditionStep, pendingAdvanceOnWin, save, shrineBuffs],
  );

  useEffect(() => {
    if (!battle) return;
    if (battle.phase === 'victory' || battle.phase === 'defeat' || battle.phase === 'fled') {
      return;
    }

    const active = findBattleUnit(battle, battle.activeUid);
    const shouldAutoStep = !active || !active.isAlly || save.settings.autoBattle;
    if (!shouldAutoStep) return;

    const delayMs =
      save.settings.battleSpeed === 4
        ? 190
        : save.settings.battleSpeed === 2
          ? 400
          : 770;

    const timer = window.setTimeout(() => {
      const next = stepEnemyOrAutoTurn(
        battle,
        save.settings.autoBattle,
        save.settings.battleTactic,
      );
      applyBattleTransition(next);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    applyBattleTransition,
    battle,
    save.settings.autoBattle,
    save.settings.battleSpeed,
    save.settings.battleTactic,
  ]);

  const handleBattleCommand = useCallback(
    (cmd: PlayerActionCommand) => {
      if (!battle || battle.phase !== 'player_input') return;
      const next = executeTurnAction(battle, cmd);
      applyBattleTransition(next);
    },
    [applyBattleTransition, battle],
  );

  const handleFinishBattle = useCallback(() => {
    if (!battle) return;
    if (battle.bossRushWave) {
      if (battle.phase === 'defeat') {
        returnToVillage(`闘技場 Wave ${battle.bossRushWave} で力尽きた`);
      } else {
        returnToVillage(
          battle.bossRushWave === BOSS_RUSH_MAX_WAVE && battle.phase === 'victory'
            ? `🏆 闘技場 全${BOSS_RUSH_MAX_WAVE}Wave制覇`
            : '始まりの村へ帰還した',
        );
      }
      return;
    }

    if (battle.phase === 'defeat') {
      const lostGold = Math.floor(save.gold * 0.15);
      if (lostGold > 0) {
        setSave((prev) => ({ ...prev, gold: Math.max(0, prev.gold - lostGold) }));
      }
      returnToVillage(
        lostGold > 0
          ? `全滅・${lostGold.toLocaleString()}Gを失い村へ帰還した`
          : '全滅・始まりの村へ帰還した',
      );
      return;
    }
    setRunPotions({ hp: battle.hpPotions, mp: battle.mpPotions });
    if (battle.phase === 'fled') {
      setSave((prev) => {
        const nextRoster = { ...prev.roster };
        for (const a of battle.allies) {
          const u = nextRoster[a.speciesId];
          if (u) {
            nextRoster[a.speciesId] = { ...u, hp: Math.max(1, a.hp), mp: a.mp };
          }
        }
        return { ...prev, roster: nextRoster };
      });
    }
    setBattle(null);
    setPendingAdvanceOnWin(false);
  }, [battle, returnToVillage, save.gold]);

  useEffect(() => {
    if (!autoAdvance || !battle || battle.bossRushWave || battle.phase !== 'victory' || !battle.reward) {
      return;
    }
    const delay = save.settings.battleSpeed === 4 ? 930 : 1600;
    const timer = window.setTimeout(() => {
      handleFinishBattle();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, battle, handleFinishBattle, save.settings.battleSpeed]);

  // Equipment & Blacksmith handlers
  const handleEquip = useCallback(
    (unitId: string, itemId: string) => {
      setSave((prev) => {
        const item = prev.inventory.find((i) => i.id === itemId);
        if (!item || !prev.roster[unitId]) return prev;
        const nextRoster = { ...prev.roster };

        for (const uid of Object.keys(nextRoster)) {
          const u = nextRoster[uid]!;
          if (u.equipped[item.slot] === itemId) {
            nextRoster[uid] = {
              ...u,
              equipped: { ...u.equipped, [item.slot]: null },
            };
          }
        }

        const target = nextRoster[unitId]!;
        nextRoster[unitId] = {
          ...target,
          equipped: { ...target.equipped, [item.slot]: itemId },
        };
        return { ...prev, roster: nextRoster };
      });
      showToast('装備を変更した');
    },
    [showToast],
  );

  const handleUnequip = useCallback((unitId: string, slot: EquipSlot) => {
    setSave((prev) => {
      const target = prev.roster[unitId];
      if (!target) return prev;
      return {
        ...prev,
        roster: {
          ...prev.roster,
          [unitId]: {
            ...target,
            equipped: { ...target.equipped, [slot]: null },
          },
        },
      };
    });
  }, []);

  const handleAutoEquipUnit = useCallback(
    (unitId: string) => {
      setSave((prev) => {
        const target = prev.roster[unitId];
        if (!target) return prev;
        const equippedByOther = new Set<string>();
        for (const [uid, u] of Object.entries(prev.roster)) {
          if (uid === unitId) continue;
          for (const eid of Object.values(u.equipped)) {
            if (eid) equippedByOther.add(eid);
          }
        }
        const nextEquipped = { ...target.equipped };
        for (const slot of ['weapon', 'armor', 'relic', 'rune'] as const) {
          const candidates = prev.inventory
            .filter((it) => it.slot === slot && !equippedByOther.has(it.id))
            .sort((a, b) => calculateItemScore(b) - calculateItemScore(a));
          if (candidates[0]) {
            nextEquipped[slot] = candidates[0].id;
          }
        }
        return {
          ...prev,
          roster: {
            ...prev.roster,
            [unitId]: { ...target, equipped: nextEquipped },
          },
        };
      });
      showToast('★最適装備を適用した');
    },
    [showToast],
  );

  const handleToggleLock = useCallback((itemId: string) => {
    setSave((prev) => ({
      ...prev,
      inventory: prev.inventory.map((it) =>
        it.id === itemId ? { ...it, locked: !it.locked } : it,
      ),
    }));
  }, []);

  const handleSellItem = useCallback(
    (itemId: string) => {
      setSave((prev) => {
        const item = prev.inventory.find((i) => i.id === itemId);
        if (!item || item.locked) return prev;
        const isEquipped = Object.values(prev.roster).some((u) =>
          Object.values(u.equipped).includes(itemId),
        );
        if (isEquipped) return prev;
        return {
          ...prev,
          gold: prev.gold + item.sellValue,
          inventory: prev.inventory.filter((i) => i.id !== itemId),
        };
      });
      showToast('装備を売却した');
    },
    [showToast],
  );

  const handleSalvageItem = useCallback(
    (itemId: string) => {
      const target = save.inventory.find((i) => i.id === itemId);
      if (!target || target.locked) return;
      const isEquipped = Object.values(save.roster).some((u) =>
        Object.values(u.equipped).includes(itemId),
      );
      if (isEquipped) return;
      const stones = getSalvageValue(target);
      setSave((prev) => ({
        ...prev,
        forgeStones: prev.forgeStones + stones,
        inventory: prev.inventory.filter((i) => i.id !== itemId),
      }));
      showToast(`装備を分解・💎+${stones}`);
    },
    [save.inventory, save.roster, showToast],
  );

  const handleEnhanceItem = useCallback(
    (itemId: string) => {
      const target = save.inventory.find((i) => i.id === itemId);
      if (!target || target.enhanceLevel >= MAX_ENHANCE_LEVEL) return;
      const cost = getEnhanceCost(target);
      if (save.forgeStones < cost.stones || save.gold < cost.gold) return;

      const { upgraded, isBreakthrough } = enhanceEquipment(target);
      soundEngine.playSfx(isBreakthrough ? 'levelup' : 'forge');
      setSave((prev) => ({
        ...prev,
        gold: prev.gold - cost.gold,
        forgeStones: prev.forgeStones - cost.stones,
        inventory: prev.inventory.map((i) => (i.id === itemId ? upgraded : i)),
        guildQuests: applyEnhanceProgressToQuests(prev.guildQuests, prev.worldTier, 1),
        stats: {
          ...prev.stats,
          totalForgeUpgrades: prev.stats.totalForgeUpgrades + 1,
          maxEnhanceReached: Math.max(prev.stats.maxEnhanceReached, upgraded.enhanceLevel),
        },
      }));
      showToast(
        isBreakthrough
          ? `★突破・${upgraded.name} +${upgraded.enhanceLevel}・全OP+12%`
          : `🔨 ${upgraded.name} +${upgraded.enhanceLevel}`,
      );
    },
    [save.forgeStones, save.gold, save.inventory, showToast],
  );

  const handleRerollAffix = useCallback(
    (itemId: string, affixIndex: number) => {
      const target = save.inventory.find((i) => i.id === itemId);
      if (!target || affixIndex < 0 || affixIndex >= target.affixes.length) return;
      const cost = getRerollCost(target);
      if (save.forgeStones < cost.stones || save.gold < cost.gold) return;

      const rerolled = rerollAffixSlot(target, affixIndex);
      const newAffix = rerolled.affixes[affixIndex];
      soundEngine.playSfx('forge');
      setSave((prev) => ({
        ...prev,
        gold: prev.gold - cost.gold,
        forgeStones: prev.forgeStones - cost.stones,
        inventory: prev.inventory.map((i) => (i.id === itemId ? rerolled : i)),
        stats: {
          ...prev.stats,
          totalRerolls: prev.stats.totalRerolls + 1,
        },
      }));
      if (newAffix) {
        showToast(
          `🔄 再鍛造・${newAffix.label}+${newAffix.value}${newAffix.isPercent ? '%' : ''}`,
        );
      }
    },
    [save.forgeStones, save.gold, save.inventory, showToast],
  );

  const handleBulkProcess = useCallback(
    (maxRarity: 'uncommon' | 'rare', mode: AutoLootMode) => {
      const maxRank = RARITY_META[maxRarity].rank;
      const equippedSet = new Set<string>();
      for (const u of Object.values(save.roster)) {
        for (const eid of Object.values(u.equipped)) {
          if (eid) equippedSet.add(eid);
        }
      }

      let count = 0;
      let goldGain = 0;
      let stoneGain = 0;
      const remaining = save.inventory.filter((it) => {
        if (it.locked || equippedSet.has(it.id) || it.uniqueId) return true;
        if (RARITY_META[it.rarity].rank <= maxRank) {
          count += 1;
          if (mode === 'salvage') stoneGain += getSalvageValue(it);
          else goldGain += it.sellValue;
          return false;
        }
        return true;
      });

      if (count === 0) {
        showToast('対象の装備がない');
        return;
      }

      setSave((prev) => ({
        ...prev,
        gold: prev.gold + goldGain,
        forgeStones: prev.forgeStones + stoneGain,
        inventory: remaining,
      }));
      showToast(
        mode === 'salvage'
          ? `${count}点を分解 → 💎+${stoneGain}`
          : `${count}点を売却 → +${goldGain.toLocaleString()}G`,
      );
    },
    [save.inventory, save.roster, showToast],
  );

  const handleTogglePartyMember = useCallback((unitId: string) => {
    if (unitId === 'hero') return;
    setSave((prev) => {
      const inParty = prev.partyIds.includes(unitId);
      if (inParty) {
        return {
          ...prev,
          partyIds: prev.partyIds.filter((id) => id !== unitId),
        };
      }
      if (prev.partyIds.length >= 4) return prev;
      return {
        ...prev,
        partyIds: [...prev.partyIds, unitId],
      };
    });
  }, []);

  const handleToggleFavorite = useCallback((unitId: string) => {
    setSave((prev) => {
      const cur = prev.favoriteMonsters ?? [];
      const exists = cur.includes(unitId);
      return {
        ...prev,
        favoriteMonsters: exists ? cur.filter((id) => id !== unitId) : [...cur, unitId],
      };
    });
  }, []);

  const handleClaimGuildQuest = useCallback(
    (questId: string) => {
      const { nextSave, claimedQuest, cycled } = claimGuildQuestReward(save, questId);
      if (!claimedQuest) return;
      soundEngine.playSfx('quest_claim');
      setSave(nextSave);
      showToast(
        cycled
          ? `📜 依頼達成・💎+${claimedQuest.rewardStones}・次の周回依頼を受注`
          : `📜 依頼達成・💎+${claimedQuest.rewardStones}・${claimedQuest.rewardGold}G`,
      );
    },
    [save, showToast],
  );

  const handleToggleSoundMute = useCallback(() => {
    setSave((prev) => {
      const nextMuted = !prev.settings.soundMuted;
      soundEngine.setMuted(nextMuted);
      if (!nextMuted) {
        soundEngine.unlock();
        soundEngine.playSfx('click');
      }
      return {
        ...prev,
        settings: { ...prev.settings, soundMuted: nextMuted },
      };
    });
  }, []);

  const handleUpgradeSkillNode = useCallback(
    (nodeId: string) => {
      if (!canUpgradeSkillNode(save, nodeId)) return;
      const def = SKILL_NODE_MAP[nodeId];
      if (!def) return;
      const nextLv = (save.heroSkillTree[nodeId] ?? 0) + 1;
      setSave((prev) => ({
        ...prev,
        heroSkillTree: {
          ...prev.heroSkillTree,
          [nodeId]: (prev.heroSkillTree[nodeId] ?? 0) + 1,
        },
      }));
      if (def.unlocksSkillId) {
        const sk = ALL_HERO_SKILLS[def.unlocksSkillId];
        showToast(`🌳 スキル「${sk?.name ?? def.name}」解放`);
      } else {
        showToast(`🌳 「${def.name}」Lv.${nextLv} 習得`);
      }
    },
    [save, showToast],
  );

  const handleResetSkillTree = useCallback(() => {
    if (!expedition.inVillage) return;
    setSave((prev) => ({
      ...prev,
      heroSkillTree: {},
      heroEquippedSkillIds: [HERO_SPECIES.skills[0].id, HERO_SPECIES.skills[1].id],
    }));
    showToast('🌳 スキルツリーをリセットした');
  }, [expedition.inVillage, showToast]);

  const handleEquipHeroSkill = useCallback(
    (slotIndex: 0 | 1, skillId: string) => {
      const unlocked = getUnlockedHeroSkillIds(save);
      if (!unlocked.includes(skillId)) return;
      const sk = ALL_HERO_SKILLS[skillId];
      setSave((prev) => {
        const cur: [string, string] = [
          prev.heroEquippedSkillIds[0] ?? HERO_SPECIES.skills[0].id,
          prev.heroEquippedSkillIds[1] ?? HERO_SPECIES.skills[1].id,
        ];
        const otherIndex: 0 | 1 = slotIndex === 0 ? 1 : 0;
        if (cur[otherIndex] === skillId) {
          // Swap the two slots cleanly
          const prevVal = cur[slotIndex];
          cur[slotIndex] = skillId;
          cur[otherIndex] = prevVal;
        } else {
          cur[slotIndex] = skillId;
        }
        return { ...prev, heroEquippedSkillIds: cur };
      });
      if (sk) {
        showToast(`✦ 枠${slotIndex + 1}に「${sk.name}」をセットした`);
      }
    },
    [save, showToast],
  );

  const handleEvolveMonster = useCallback(
    (unitId: string) => {
      const unit = save.roster[unitId];
      if (!unit || !canEvolveMonster(unit, save.forgeStones)) return;
      const req = getEvolutionRequirement(unit);
      const sp = getSpecies(unit.speciesId);

      setSave((prev) => {
        const target = prev.roster[unitId];
        if (!target || !canEvolveMonster(target, prev.forgeStones)) return prev;
        const evolvedUnit = { ...target, evolved: true };
        const nextSaveDraft: GameSave = {
          ...prev,
          forgeStones: prev.forgeStones - req.stoneCost,
          roster: { ...prev.roster, [unitId]: evolvedUnit },
          stats: {
            ...prev.stats,
            totalEvolutions: prev.stats.totalEvolutions + 1,
          },
        };
        const st = computeUnitStats(evolvedUnit, nextSaveDraft);
        nextSaveDraft.roster[unitId] = { ...evolvedUnit, hp: st.maxHp, mp: st.maxMp };
        return nextSaveDraft;
      });
      showToast(`✦ ${sp.name}が極進化した`);
    },
    [save.forgeStones, save.roster, showToast],
  );

  const handleTrueEvolveMonster = useCallback(
    (unitId: string) => {
      const unit = save.roster[unitId];
      if (!unit || !canTrueEvolveMonster(unit, save.forgeStones)) return;
      const req = getTrueEvolutionRequirement(unit);
      const sp = getSpecies(unit.speciesId);

      setSave((prev) => {
        const target = prev.roster[unitId];
        if (!target || !canTrueEvolveMonster(target, prev.forgeStones)) return prev;
        const trueUnit = { ...target, evolved: true, trueEvolved: true };
        const nextSaveDraft: GameSave = {
          ...prev,
          forgeStones: prev.forgeStones - req.stoneCost,
          roster: { ...prev.roster, [unitId]: trueUnit },
          stats: {
            ...prev.stats,
            totalTrueEvolutions: prev.stats.totalTrueEvolutions + 1,
          },
        };
        const st = computeUnitStats(trueUnit, nextSaveDraft);
        nextSaveDraft.roster[unitId] = { ...trueUnit, hp: st.maxHp, mp: st.maxMp };
        return nextSaveDraft;
      });
      showToast(`✦ ${sp.name}が真極進化した`);
    },
    [save.forgeStones, save.roster, showToast],
  );

  const handleClaimAchievement = useCallback(
    (achId: string) => {
      const def = ACHIEVEMENT_MAP[achId];
      if (!def) return;
      if (save.claimedAchievements.includes(achId)) return;
      if (def.getValue(save) < def.target) return;

      setSave((prev) => {
        if (prev.claimedAchievements.includes(achId)) return prev;
        return {
          ...prev,
          forgeStones: prev.forgeStones + def.rewardStones,
          claimedAchievements: [...prev.claimedAchievements, achId],
        };
      });
      showToast(`🏆 実績「${def.title}」・💎+${def.rewardStones} / SP+${def.rewardSp}`);
    },
    [save, showToast],
  );

  const handleStartBossRush = useCallback(() => {
    if (!expedition.inVillage || battle) return;
    // Full heal party synchronously so Wave 1 starts at 100% HP/MP
    const healedRoster = { ...save.roster };
    const mapInv = new Map(save.inventory.map((it) => [it.id, it]));
    for (const id of Object.keys(healedRoster)) {
      const u = healedRoster[id]!;
      const st = computeUnitStats(u, save, undefined, mapInv);
      healedRoster[id] = { ...u, hp: st.maxHp, mp: st.maxMp };
    }
    const healedSave: GameSave = { ...save, roster: healedRoster };
    setSave(healedSave);
    setAutoAdvance(false);
    setShrineBuffs(EMPTY_SHRINE_BUFFS);
    setRunPotions(INITIAL_RUN_POTIONS);
    setActiveTab('explore');

    const waveDef = getBossRushWave(1);
    const entity = createBossRushEntity(1);
    const bState = createBattleState(healedSave, entity, waveDef.equivFloor, {
      hpPotions: INITIAL_RUN_POTIONS.hp,
      mpPotions: INITIAL_RUN_POTIONS.mp,
      initialLimitGauge: 0,
      bossRushWave: 1,
    });
    setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
    setPendingAdvanceOnWin(false);
    setBattle(bState);
    showToast(`🏟 ${waveDef.title}`);
  }, [battle, expedition.inVillage, save, showToast]);

  const handleNextBossRushWave = useCallback(() => {
    if (!battle || !battle.bossRushWave || battle.bossRushWave >= BOSS_RUSH_MAX_WAVE) return;
    const nextWave = battle.bossRushWave + 1;
    const waveDef = getBossRushWave(nextWave);
    const entity = createBossRushEntity(nextWave);
    const bState = createBattleState(save, entity, waveDef.equivFloor, {
      hpPotions: battle.hpPotions,
      mpPotions: battle.mpPotions,
      initialLimitGauge: battle.limitGauge,
      bossRushWave: nextWave,
    });
    setRunPotions({ hp: battle.hpPotions, mp: battle.mpPotions });
    setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
    setBattle(bState);
    showToast(`🏟 ${waveDef.title}`);
  }, [battle, save, showToast]);

  const handleSelectWorldTier = useCallback(
    (tier: number) => {
      setSave((prev) => {
        if (tier > prev.maxUnlockedTier || tier < 1) return prev;
        const highest = prev.highestFloorByTier[tier] ?? 1;
        const mf = getPartyAggregatedLootBonuses(prev).magicFind;
        return {
          ...prev,
          worldTier: tier,
          highestFloorByTier: { ...prev.highestFloorByTier, [tier]: highest },
          shopItems: generateShopInventory(highest, tier, mf),
          shopRefreshedAtTier: tier,
        };
      });
      showToast(`世界ランク Tier ${toRoman(tier)}`);
    },
    [showToast],
  );

  const handleToggleTrialMod = useCallback(
    (id: TrialModId) => {
      if (!expedition.inVillage) return;
      setSave((prev) => {
        const cur = prev.activeTrials ?? [];
        const has = cur.includes(id);
        return {
          ...prev,
          activeTrials: has ? cur.filter((t) => t !== id) : [...cur, id],
        };
      });
    },
    [expedition.inVillage],
  );

  const handleBuyShopItem = useCallback(
    (itemId: string) => {
      const target = save.shopItems.find((i) => i.id === itemId);
      if (!target) return;
      const price = getShopPrice(target);
      if (save.gold < price) return;

      setSave((prev) => {
        const uniques = new Set(prev.discoveredUniques);
        if (target.uniqueId) uniques.add(target.uniqueId);
        return {
          ...prev,
          gold: prev.gold - price,
          inventory: [target, ...prev.inventory].slice(0, 140),
          shopItems: prev.shopItems.filter((i) => i.id !== itemId),
          discoveredUniques: Array.from(uniques),
        };
      });
      showToast(`${target.name}を購入した`);
    },
    [save.gold, save.shopItems, showToast],
  );

  const handleRefreshShop = useCallback(() => {
    const cost = Math.round(60 * Math.pow(1.8, save.worldTier - 1));
    if (save.gold < cost) return;
    setSave((prev) => {
      const highest = prev.highestFloorByTier[prev.worldTier] ?? 1;
      const mf = getPartyAggregatedLootBonuses(prev).magicFind;
      return {
        ...prev,
        gold: prev.gold - cost,
        shopItems: generateShopInventory(highest, prev.worldTier, mf),
      };
    });
    showToast('品揃えを更新した');
  }, [save.gold, save.worldTier, showToast]);

  const handleBuyMysteryBox = useCallback(() => {
    const highest = save.highestFloorByTier[save.worldTier] ?? 1;
    const cost = Math.round(180 * Math.pow(2.1, save.worldTier - 1) + highest * 22);
    if (save.gold < cost) return;

    const mf = getPartyAggregatedLootBonuses(save).magicFind;
    const item = generateEquipment(Math.max(2, highest + 2), save.worldTier, mf + 55, 'boss');
    setSave((prev) => {
      const uniques = new Set(prev.discoveredUniques);
      if (item.uniqueId) uniques.add(item.uniqueId);
      return {
        ...prev,
        gold: prev.gold - cost,
        inventory: [item, ...prev.inventory].slice(0, 140),
        discoveredUniques: Array.from(uniques),
        stats: {
          ...prev.stats,
          totalItemsLooted: prev.stats.totalItemsLooted + 1,
          totalMythicsFound: prev.stats.totalMythicsFound + (item.rarity === 'mythic' ? 1 : 0),
        },
      };
    });
    setFocusItemId(item.id);
    showToast(`ミステリー箱・${item.name}`);
  }, [save, showToast]);

  const handleManualSaveSlot = useCallback(
    (slot: SaveSlotId) => {
      const ts = saveGameToSlot(slot, save);
      if (slot === activeSlot) {
        setLastSavedAt(ts);
      }
      setSlotRevision((n) => n + 1);
      showToast(`💾 冒険の書 ${slot} に記録した`);
    },
    [activeSlot, save, showToast],
  );

  const handleLoadSaveSlot = useCallback(
    (slot: SaveSlotId) => {
      const loaded = loadGameFromSlot(slot);
      if (!loaded) return;
      setActiveSaveSlot(slot);
      setActiveSlot(slot);
      setSave(loaded);
      setLastSavedAt(loaded.savedAt);
      setBattle(null);
      setAutoAdvance(false);
      setShrineBuffs(EMPTY_SHRINE_BUFFS);
      setRunPotions(INITIAL_RUN_POTIONS);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      setSlotRevision((n) => n + 1);
      showToast(`📖 冒険の書 ${slot} を読み込んだ`);
    },
    [showToast],
  );

  const handleNewSaveInSlot = useCallback(
    (slot: SaveSlotId) => {
      const fresh = createInitialSave();
      const ts = saveGameToSlot(slot, fresh);
      setActiveSaveSlot(slot);
      setActiveSlot(slot);
      setSave(fresh);
      setLastSavedAt(ts);
      setBattle(null);
      setAutoAdvance(false);
      setShrineBuffs(EMPTY_SHRINE_BUFFS);
      setRunPotions(INITIAL_RUN_POTIONS);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      setSlotRevision((n) => n + 1);
      showToast(`📖 冒険の書 ${slot} で冒険を開始した`);
    },
    [showToast],
  );

  const handleDeleteSaveSlot = useCallback(
    (slot: SaveSlotId) => {
      deleteSaveSlot(slot);
      if (slot === activeSlot) {
        const fresh = createInitialSave();
        const ts = saveGameToSlot(slot, fresh);
        setSave(fresh);
        setLastSavedAt(ts);
        setBattle(null);
        setAutoAdvance(false);
        setShrineBuffs(EMPTY_SHRINE_BUFFS);
        setRunPotions(INITIAL_RUN_POTIONS);
        setExpedition(createVillageExpedition());
        setActiveTab('explore');
        setSlotRevision((n) => n + 1);
        showToast(`冒険の書 ${slot} を初期化した`);
        return;
      }
      setSlotRevision((n) => n + 1);
      showToast(`冒険の書 ${slot} を削除した`);
    },
    [activeSlot, showToast],
  );

  const handleExportSaveFile = useCallback(() => {
    const json = exportSaveJson(save);
    const ts = saveGameToSlot(activeSlot, save);
    setLastSavedAt(ts);
    setSlotRevision((n) => n + 1);
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildSaveFileName(activeSlot);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Fallback ignored in restricted environments
    }
    showToast('📁 セーブファイルを保存した');
  }, [activeSlot, save, showToast]);

  const handleImportSaveFile = useCallback(
    (rawText: string) => {
      const res = importSaveJson(rawText);
      if (!res.ok) return { ok: false, error: res.error };
      const ts = saveGameToSlot(activeSlot, res.save);
      setSave(res.save);
      setLastSavedAt(ts);
      setBattle(null);
      setAutoAdvance(false);
      setShrineBuffs(EMPTY_SHRINE_BUFFS);
      setRunPotions(INITIAL_RUN_POTIONS);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      setSlotRevision((n) => n + 1);
      showToast(`📁 冒険の書 ${activeSlot} へ復元した`);
      return { ok: true };
    },
    [activeSlot, showToast],
  );

  const handleImportSave = useCallback(
    (code: string) => {
      const res = importSaveCode(code);
      if (!res.ok) return { ok: false, error: res.error };
      const ts = saveGameToSlot(activeSlot, res.save);
      setSave(res.save);
      setLastSavedAt(ts);
      setBattle(null);
      setAutoAdvance(false);
      setShrineBuffs(EMPTY_SHRINE_BUFFS);
      setRunPotions(INITIAL_RUN_POTIONS);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      setSlotRevision((n) => n + 1);
      showToast(`冒険の書 ${activeSlot} へ復元した`);
      return { ok: true };
    },
    [activeSlot, showToast],
  );

  const slotSummaries = useMemo(() => {
    // Re-read storage on revision/slot change, and reflect live active save immediately
    void slotRevision;
    const base = listSaveSlotSummaries();
    const livePartySprites = save.partyIds
      .map((id) => save.roster[id])
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => getSpecies(u.speciesId).spriteKey);
    return base.map((entry) =>
      entry.slot === activeSlot
        ? {
            ...entry,
            exists: true,
            savedAt: Math.max(entry.savedAt, lastSavedAt),
            heroLevel: save.roster.hero?.level ?? 1,
            worldTier: save.worldTier,
            highestFloor: save.stats.highestFloorReached,
            gold: save.gold,
            forgeStones: save.forgeStones,
            partySprites: livePartySprites,
          }
        : entry,
    );
  }, [activeSlot, lastSavedAt, save, slotRevision]);

  const biomeDef = BIOMES[expedition.biome];
  const inVillage = expedition.inVillage;
  const highestFloorThisTier = save.highestFloorByTier[save.worldTier] ?? 1;
  const defaultEntryFloor =
    highestFloorThisTier >= 6 ? Math.floor((highestFloorThisTier - 1) / 5) * 5 + 1 : 1;
  const availableSp = getAvailableSp(save);
  const unclaimedAchCount = useMemo(() => getUnclaimedAchievements(save).length, [save]);
  const claimableGuildCount = useMemo(() => getClaimableGuildQuestCount(save), [save]);

  const quickCheckpoints: number[] = [1];
  for (let f = 6; f <= highestFloorThisTier; f += 5) {
    quickCheckpoints.push(f);
  }

  return (
    <div className="app-viewport">
      <main className="game-shell">
        {/* Top RPG HUD Header */}
        <header className="top-hud">
          <div className="hud-location">
            <h1 className="hud-title">
              {battle?.bossRushWave
                ? `闘技場 W${battle.bossRushWave}/${BOSS_RUSH_MAX_WAVE}`
                : inVillage
                  ? biomeDef.shortName
                  : `${biomeDef.shortName} ${expedition.floor}F`}
            </h1>
            <span className="tier-badge">T{toRoman(save.worldTier)}</span>
            <span
              className="tier-badge"
              style={{
                background: 'linear-gradient(180deg, #8c202e 0%, #57111b 100%)',
                borderColor: '#ff7084',
                color: '#ffd6dd',
              }}
            >
              v14
            </span>
          </div>
          <div className="hud-right">
            <span className="gold-pill" style={{ color: '#8ae8ff', borderColor: 'rgba(138, 232, 255, 0.45)' }}>
              💎{save.forgeStones.toLocaleString()}
            </span>
            <span className="gold-pill">{save.gold.toLocaleString()}G</span>
            <button
              id="btn-hud-sound"
              type="button"
              className="gold-pill"
              style={{
                color: save.settings.soundMuted ? '#ff9cab' : '#ffe570',
                borderColor: save.settings.soundMuted ? 'rgba(255, 130, 150, 0.45)' : 'rgba(255, 229, 112, 0.45)',
                cursor: 'pointer',
                background: 'rgba(24, 20, 36, 0.85)',
                padding: '1px 4px',
              }}
              onClick={handleToggleSoundMute}
              aria-label="音量切替"
            >
              {save.settings.soundMuted ? '🔇' : '🔊'}
            </button>
            {!battle && (
              <button
                id="btn-hud-save"
                type="button"
                className="gold-pill"
                style={{
                  color: '#a3ffbe',
                  borderColor: 'rgba(130, 255, 158, 0.45)',
                  cursor: 'pointer',
                  background: 'rgba(20, 44, 30, 0.85)',
                }}
                onClick={() => {
                  setActiveTab('world');
                  setWorldSection('save');
                }}
              >
                💾書{activeSlot}
              </button>
            )}
          </div>
        </header>

        {/* Top Half: Crisp 16-bit Side-View Pixel Art Stage */}
        <section className="stage-wrap" aria-label="ゲーム画面">
          <GameCanvas
            expedition={expedition}
            save={save}
            battle={battle}
            selectedEnemyUid={effectiveSelectedEnemyUid}
            onEnemyTap={(uid) => setSelectedEnemyUid(uid)}
          />

          {((shrineBuffs.powerBonus > 0 ||
            shrineBuffs.fortuneBonus > 0 ||
            shrineBuffs.curseEnemyBonus > 0) &&
            !inVillage) ||
          (save.activeTrials?.length ?? 0) > 0 ? (
            <div className="stage-buff-strip">
              {(save.activeTrials?.length ?? 0) > 0 && (
                <span className="buff-tag" style={{ borderColor: '#ff7084', color: '#ffd1d8' }}>
                  ☠刻印×{save.activeTrials.length}
                </span>
              )}
              {!inVillage && shrineBuffs.powerBonus > 0 && (
                <span className="buff-tag">
                  剛力 +{Math.round(shrineBuffs.powerBonus * 100)}%
                </span>
              )}
              {!inVillage && shrineBuffs.fortuneBonus > 0 && (
                <span className="buff-tag">幸運 MF+{shrineBuffs.fortuneBonus}%</span>
              )}
              {!inVillage && shrineBuffs.curseEnemyBonus > 0 && (
                <span className="buff-tag" style={{ borderColor: '#ff7084', color: '#ff9cab' }}>
                  呪い 敵+{Math.round(shrineBuffs.curseEnemyBonus * 100)}%
                </span>
              )}
            </div>
          ) : null}

          {toast && <div className="stage-toast">{toast}</div>}
        </section>

        {/* Bottom Half: One-Handed Command Selection Zone */}
        <section className="bottom-shell">
          {battle ? (
            <BattlePanel
              battle={battle}
              settings={save.settings}
              selectedEnemyUid={effectiveSelectedEnemyUid}
              onSelectEnemy={(uid) => setSelectedEnemyUid(uid)}
              onCommand={handleBattleCommand}
              onToggleAuto={() => {
                setSave((p) => ({
                  ...p,
                  settings: { ...p.settings, autoBattle: !p.settings.autoBattle },
                }));
              }}
              onCycleSpeed={() =>
                setSave((p) => {
                  const next: BattleSpeed =
                    p.settings.battleSpeed === 1 ? 2 : p.settings.battleSpeed === 2 ? 4 : 1;
                  return { ...p, settings: { ...p.settings, battleSpeed: next } };
                })
              }
              onCycleTactic={() =>
                setSave((p) => {
                  const order: BattleTactic[] = ['balanced', 'allout', 'conserve'];
                  const next =
                    order[(order.indexOf(p.settings.battleTactic) + 1) % order.length]!;
                  return { ...p, settings: { ...p.settings, battleTactic: next } };
                })
              }
              onFinishBattle={handleFinishBattle}
              onNextBossRushWave={handleNextBossRushWave}
              onOpenGearFromLoot={(itemId) => {
                setAutoAdvance(false);
                setFocusItemId(itemId);
                handleFinishBattle();
                setActiveTab('gear');
              }}
            />
          ) : (
            <>
              {activeTab === 'explore' && (
                <div className="panel-body" style={{ gap: 6 }}>
                  {/* Compact Party HP/MP Strip */}
                  <div className="party-mini-strip">
                    {save.partyIds.map((pid) => {
                      const u = save.roster[pid];
                      if (!u) return null;
                      const sp = getSpecies(u.speciesId);
                      const st = computeUnitStats(u, save, shrineBuffs, invMap);
                      const hpPct = Math.max(0, Math.min(100, (u.hp / st.maxHp) * 100));
                      const mpPct = Math.max(0, Math.min(100, (u.mp / st.maxMp) * 100));
                      return (
                        <div key={pid} className="party-mini-chip">
                          <div className="party-mini-top">
                            <PixelIcon
                              spriteKey={sp.spriteKey}
                              equipKey={getUnitEquipVisualKey(u, invMap)}
                              size={18}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 8.5,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: u.trueEvolved
                                    ? '#8ae8ff'
                                    : u.evolved
                                      ? '#ffe878'
                                      : undefined,
                                }}
                              >
                                {u.trueEvolved ? '真' : u.evolved ? '極' : ''}
                                {sp.name}
                              </div>
                              <div style={{ fontSize: 8.5, color: 'var(--accent-amber)' }}>
                                Lv.{u.level}
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

                  {inVillage ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <button
                        id="btn-enter-labyrinth"
                        type="button"
                        className="choice-card stairs-choice"
                        onClick={() => enterDungeonFloor(defaultEntryFloor)}
                      >
                        <PixelIcon
                          spriteKey="hero"
                          equipKey={
                            save.roster.hero ? getUnitEquipVisualKey(save.roster.hero, invMap) : ''
                          }
                          size={26}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12.5, color: '#eafff0' }}>
                            ⚔ 迷宮へ出撃・{defaultEntryFloor}F〜
                          </div>
                          <div className="muted-text">
                            {(save.activeTrials ?? []).includes('no_potions')
                              ? '禁薬中'
                              : `HP薬×${INITIAL_RUN_POTIONS.hp} / MP薬×${INITIAL_RUN_POTIONS.mp}`}
                            {(save.activeTrials?.length ?? 0) > 0
                              ? `・☠刻印×${save.activeTrials.length}`
                              : ''}
                          </div>
                        </div>
                        <span className="choice-tag" style={{ background: '#2e8a4e' }}>
                          出撃
                        </span>
                      </button>

                      <button
                        id="btn-village-boss-rush"
                        type="button"
                        className="choice-card gold-choice"
                        onClick={handleStartBossRush}
                      >
                        <PixelIcon spriteKey="genesis_orrery" size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#fff3bd' }}>
                            🏟 ボスラッシュ闘技場
                          </div>
                          <div className="muted-text">
                            W{save.bossRushBestWave}/{BOSS_RUSH_MAX_WAVE}・W10ミシック確定
                          </div>
                        </div>
                        <span className="choice-tag" style={{ background: '#b8701a' }}>
                          {BOSS_RUSH_MAX_WAVE}連戦
                        </span>
                      </button>

                      {quickCheckpoints.length > 1 && (
                        <div className="filter-row">
                          <span className="muted-text">開始:</span>
                          {quickCheckpoints.map((fl) => (
                            <button
                              key={fl}
                              type="button"
                              className="pill-chip active"
                              onClick={() => enterDungeonFloor(fl)}
                            >
                              {fl}F
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="village-cmd-grid">
                        <button
                          id="btn-village-heal"
                          type="button"
                          className="rpg-btn emerald"
                          style={{ padding: '8px 6px' }}
                          onClick={() => healAllParty(1, false)}
                        >
                          💧 回復の泉
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '8px 6px' }}
                          onClick={() => setActiveTab('party')}
                        >
                          🌳 スキル・進化{availableSp > 0 ? ` SP${availableSp}` : ''}
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '8px 6px' }}
                          onClick={() => {
                            setFocusItemId(null);
                            setActiveTab('gear');
                          }}
                        >
                          🔨 装備・鍛冶 {save.inventory.length}
                        </button>
                        <button
                          id="btn-village-guild"
                          type="button"
                          className={`rpg-btn ${claimableGuildCount > 0 ? 'primary' : ''}`}
                          style={{ padding: '8px 6px' }}
                          onClick={() => {
                            setActiveTab('world');
                            setWorldSection('guild');
                          }}
                        >
                          📜 ギルド依頼{claimableGuildCount > 0 ? ` +${claimableGuildCount}` : ''}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                        <span
                          className="section-heading"
                          style={{
                            flex: 1,
                            fontSize: 10.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {expedition.step >= expedition.maxSteps && !expedition.bossDefeated
                            ? `${expedition.floor}F ボス`
                            : `ルート ${expedition.step}/${expedition.maxSteps}`}
                        </span>
                        <button
                          id="btn-auto-advance"
                          type="button"
                          className={`rpg-btn sm ${autoAdvance ? 'active-toggle' : ''}`}
                          style={{ fontSize: 9, padding: '3px 5px' }}
                          onClick={() => setAutoAdvance((v) => !v)}
                        >
                          {autoAdvance ? '探索AUTO:ON' : '探索AUTO:OFF'}
                        </button>
                        <button
                          id="btn-explore-battle-auto"
                          type="button"
                          className={`rpg-btn sm ${save.settings.autoBattle ? 'active-toggle' : ''}`}
                          style={{ fontSize: 9, padding: '3px 5px' }}
                          onClick={() =>
                            setSave((p) => ({
                              ...p,
                              settings: { ...p.settings, autoBattle: !p.settings.autoBattle },
                            }))
                          }
                        >
                          {save.settings.autoBattle ? '戦闘AUTO:ON' : '戦闘AUTO:OFF'}
                        </button>
                        <button
                          id="btn-return-village"
                          type="button"
                          className="rpg-btn sm"
                          style={{ fontSize: 9, padding: '3px 5px' }}
                          onClick={() => returnToVillage()}
                        >
                          🏠帰還
                        </button>
                      </div>

                      <div className="choice-list">
                        {expedition.choices.map((ch, idx) => {
                          const extraClass =
                            ch.kind === 'boss' || ch.kind === 'curse_altar'
                              ? 'boss-choice'
                              : ch.kind === 'stairs' || ch.kind === 'expedition_shortcut'
                                ? 'stairs-choice'
                                : ch.kind === 'gold_chest' ||
                                    ch.kind === 'elite' ||
                                    ch.kind === 'rare_encounter' ||
                                    ch.kind === 'suspicious_chest' ||
                                    ch.kind === 'alchemy_pot' ||
                                    ch.kind === 'gambler'
                                  ? 'gold-choice'
                                  : '';
                          return (
                            <button
                              key={ch.id}
                              id={`btn-choice-${idx}`}
                              type="button"
                              className={`choice-card ${extraClass}`}
                              onClick={() => {
                                setAutoAdvance(false);
                                handleSelectChoice(ch);
                              }}
                            >
                              <PixelIcon spriteKey={ch.spriteKey} size={24} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-pixel)',
                                    fontSize: 11.5,
                                    color: '#fff7e0',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {ch.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 9.5,
                                    color: 'var(--text-muted)',
                                    marginTop: 1,
                                    lineHeight: 1.25,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {ch.subtitle}
                                </div>
                              </div>
                              <span className="choice-tag" style={{ background: ch.tagColor }}>
                                {ch.tag}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'party' && (
                <PartyPanel
                  save={save}
                  shrineBuffs={shrineBuffs}
                  inVillage={inVillage}
                  onTogglePartyMember={handleTogglePartyMember}
                  onToggleFavorite={handleToggleFavorite}
                  onEvolveMonster={handleEvolveMonster}
                  onTrueEvolveMonster={handleTrueEvolveMonster}
                  onUpgradeSkillNode={handleUpgradeSkillNode}
                  onResetSkillTree={handleResetSkillTree}
                  onEquipHeroSkill={handleEquipHeroSkill}
                  onHealPartyInVillage={() => healAllParty(1, false)}
                />
              )}

              {activeTab === 'gear' && (
                <EquipmentPanel
                  save={save}
                  shrineBuffs={shrineBuffs}
                  initialItemId={focusItemId}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                  onAutoEquipUnit={handleAutoEquipUnit}
                  onToggleLock={handleToggleLock}
                  onSellItem={handleSellItem}
                  onSalvageItem={handleSalvageItem}
                  onEnhanceItem={handleEnhanceItem}
                  onRerollAffix={handleRerollAffix}
                  onBulkProcess={handleBulkProcess}
                  onChangeAutoSell={(threshold: AutoSellThreshold) =>
                    setSave((p) => ({
                      ...p,
                      settings: { ...p.settings, autoSell: threshold },
                    }))
                  }
                  onToggleAutoLootMode={() =>
                    setSave((p) => ({
                      ...p,
                      settings: {
                        ...p.settings,
                        autoLootMode: p.settings.autoLootMode === 'sell' ? 'salvage' : 'sell',
                      },
                    }))
                  }
                />
              )}

              {activeTab === 'compendium' && (
                <CompendiumPanel
                  save={save}
                  onClaimAchievement={handleClaimAchievement}
                />
              )}

              {activeTab === 'world' && (
                <WorldPanel
                  save={save}
                  inVillage={inVillage}
                  section={worldSection}
                  onChangeSection={setWorldSection}
                  activeSlot={activeSlot}
                  lastSavedAt={lastSavedAt}
                  slotSummaries={slotSummaries}
                  onManualSaveSlot={handleManualSaveSlot}
                  onLoadSaveSlot={handleLoadSaveSlot}
                  onNewSaveInSlot={handleNewSaveInSlot}
                  onDeleteSaveSlot={handleDeleteSaveSlot}
                  onExportSaveFile={handleExportSaveFile}
                  onImportSaveFile={handleImportSaveFile}
                  onSelectWorldTier={handleSelectWorldTier}
                  onToggleTrialMod={handleToggleTrialMod}
                  onEnterDungeonFloor={enterDungeonFloor}
                  onStartBossRush={handleStartBossRush}
                  onClaimGuildQuest={handleClaimGuildQuest}
                  onBuyShopItem={handleBuyShopItem}
                  onRefreshShop={handleRefreshShop}
                  onBuyMysteryBox={handleBuyMysteryBox}
                  onImportSaveCode={handleImportSave}
                />
              )}

              {/* Bottom 5-Tab Bar */}
              <nav className="tab-bar" aria-label="メインメニュー">
                <button
                  id="tab-explore"
                  type="button"
                  className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
                  onClick={() => setActiveTab('explore')}
                >
                  <span>🧭</span>
                  <span>冒険</span>
                </button>
                <button
                  id="tab-party"
                  type="button"
                  className={`tab-btn ${activeTab === 'party' ? 'active' : ''}`}
                  onClick={() => setActiveTab('party')}
                >
                  <span>🐾</span>
                  <span>パーティ</span>
                  {availableSp > 0 && <span className="tab-dot" />}
                </button>
                <button
                  id="tab-gear"
                  type="button"
                  className={`tab-btn ${activeTab === 'gear' ? 'active' : ''}`}
                  onClick={() => {
                    setFocusItemId(null);
                    setActiveTab('gear');
                  }}
                >
                  <span>🔨</span>
                  <span>装備・鍛冶</span>
                  {save.inventory.length >= 2 && <span className="tab-dot" />}
                </button>
                <button
                  id="tab-compendium"
                  type="button"
                  className={`tab-btn ${activeTab === 'compendium' ? 'active' : ''}`}
                  onClick={() => setActiveTab('compendium')}
                >
                  <span>📖</span>
                  <span>図鑑・実績</span>
                  {unclaimedAchCount > 0 && <span className="tab-dot" />}
                </button>
                <button
                  id="tab-world"
                  type="button"
                  className={`tab-btn ${activeTab === 'world' ? 'active' : ''}`}
                  onClick={() => setActiveTab('world')}
                >
                  <span>✦</span>
                  <span>世界</span>
                  {claimableGuildCount > 0 && <span className="tab-dot" />}
                </button>
              </nav>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
