import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BattlePanel } from './components/BattlePanel';
import { CompendiumPanel } from './components/CompendiumPanel';
import { EquipmentPanel } from './components/EquipmentPanel';
import { GameCanvas } from './components/GameCanvas';
import { PartyPanel } from './components/PartyPanel';
import { PixelIcon } from './components/PixelIcon';
import { WorldPanel } from './components/WorldPanel';
import {
  createBattleState,
  executeTurnAction,
  findBattleUnit,
  resolveBattleVictory,
  shouldAutoSell,
  stepEnemyOrAutoTurn,
  type PlayerActionCommand,
} from './game/battle';
import { BIOMES, getBiomeForFloor } from './game/data/biomes';
import {
  enhanceEquipment,
  generateEquipment,
  getEnhanceCost,
  getRerollCost,
  getSalvageValue,
  MAX_ENHANCE_LEVEL,
  RARITY_META,
  rerollAffixSlot,
} from './game/data/equipment';
import { getSpecies } from './game/data/monsters';
import {
  createDungeonExpedition,
  createVillageExpedition,
  generateStepChoices,
  pickAutoExpeditionChoice,
  type ExpeditionChoice,
  type ExpeditionState,
} from './game/expedition';
import {
  clearLocalSave,
  createInitialSave,
  importSaveCode,
  loadGameFromLocal,
  saveGameToLocal,
} from './game/save';
import { computeUnitStats, getPartyAggregatedLootBonuses } from './game/stats';
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
} from './game/types';
import { generateShopInventory, getShopPrice, toRoman } from './game/worldTier';

type ActiveTab = 'explore' | 'party' | 'gear' | 'compendium' | 'world';

const EMPTY_SHRINE_BUFFS: ActiveShrineBuffs = {
  powerBonus: 0,
  fortuneBonus: 0,
  curseEnemyBonus: 0,
};

export function App() {
  const [save, setSave] = useState<GameSave>(() => loadGameFromLocal() ?? createInitialSave());
  const [expedition, setExpedition] = useState<ExpeditionState>(() => createVillageExpedition());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [pendingAdvanceOnWin, setPendingAdvanceOnWin] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [selectedEnemyUid, setSelectedEnemyUid] = useState<string | null>(null);
  const [shrineBuffs, setShrineBuffs] = useState<ActiveShrineBuffs>(EMPTY_SHRINE_BUFFS);

  const [autoAdvance, setAutoAdvance] = useState(false);
  const [toast, setToast] = useState<string | null>(
    'コマンドを選んで迷宮を進もう！装備強化・OP再鍛造・セット効果も完備！',
  );

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    saveGameToLocal(save);
  }, [save]);

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
        showToast(
          ratio >= 1
            ? '回復の泉の清らかな水で、パーティ全員のHP/MPが全回復した！'
            : `焚き火で休息し、全員のHP/MPが${Math.round(ratio * 100)}%回復した！`,
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
      showToast(msg ?? '始まりの村へ帰還し、全員の体力が全回復した！');
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
      showToast(`${b.name} ${targetFloor}F へ突入！（Tier ${toRoman(save.worldTier)}）`);
    },
    [save.worldTier, showToast],
  );

  const advanceExpeditionStep = useCallback(
    (worldTier: number, markBossDefeated = false, markRestUsed = false, shouldAdvance = true) => {
      setExpedition((prev) => {
        if (prev.inVillage) return prev;
        const nextBossDefeated = prev.bossDefeated || markBossDefeated;
        const nextRestUsed = prev.restUsedOnFloor || markRestUsed;
        const nextStep = shouldAdvance
          ? Math.min(prev.maxSteps, prev.step + 1)
          : prev.step;
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
          marchUntilMs: shouldAdvance ? Date.now() + 550 : prev.marchUntilMs,
        };
      });
    },
    [],
  );

  // Helper to grant chest/event loot with auto-sell / auto-salvage respected
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

      setSave((prev) => {
        const uniques = new Set(prev.discoveredUniques);
        for (const it of items) {
          if (it.uniqueId) uniques.add(it.uniqueId);
        }
        return {
          ...prev,
          gold: prev.gold + bonusGold + autoGold,
          forgeStones: prev.forgeStones + bonusStones + autoStones,
          inventory: [...kept, ...prev.inventory].slice(0, 140),
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
        healAllParty(0.5, false);
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
          showToast('癒しの祠の祝福！パーティ全員のHP/MPが全回復した！');
        } else if (choice.kind === 'shrine_power') {
          setShrineBuffs((b) => ({ ...b, powerBonus: Math.min(0.75, b.powerBonus + 0.25) }));
          showToast('剛力の祠の祝福！この探索中、味方全体の攻撃・魔力+25%！');
        } else {
          setShrineBuffs((b) => ({ ...b, fortuneBonus: Math.min(240, b.fortuneBonus + 45) }));
          showToast('幸運の祠の祝福！この探索中、トレハン（レア率）+45%！');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 1: 呪いの祭壇 (Curse Altar) =====
      if (choice.kind === 'curse_altar') {
        setShrineBuffs((b) => ({
          ...b,
          fortuneBonus: Math.min(350, b.fortuneBonus + 85),
          curseEnemyBonus: Math.min(0.9, b.curseEnemyBonus + 0.18),
        }));
        // Sacrifice 25% of current HP (non-lethal, min 1 HP)
        setSave((prev) => {
          const nextRoster = { ...prev.roster };
          for (const pid of prev.partyIds) {
            const u = nextRoster[pid];
            if (u) {
              nextRoster[pid] = { ...u, hp: Math.max(1, Math.round(u.hp * 0.75)) };
            }
          }
          return { ...prev, roster: nextRoster };
        });
        const rewardItem = generateEquipment(
          expedition.floor + 1,
          save.worldTier,
          lootBonuses.magicFind + 85,
          'boss',
        );
        const stones = Math.round((8 + expedition.floor * 0.6) * (1 + (save.worldTier - 1) * 0.45));
        const res = grantLootItems([rewardItem], 0, stones, false);
        showToast(
          `呪いの契約成立！MF+85%・💎石+${stones}・${res.kept[0] ? `[${RARITY_META[res.kept[0].rarity].label}]${res.kept[0].name}` : '装備'}獲得！`,
        );
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 2: 怪しい宝箱＆ミミック強襲 (Suspicious Chest / Mimic) =====
      if (choice.kind === 'suspicious_chest') {
        if (Math.random() < 0.5) {
          // Mimic Ambush Battle!
          const entity: MapEntity = {
            id: choice.id,
            kind: 'rare_enemy',
            x: 0,
            y: 0,
            spriteKey: 'mimic',
            name: '宝箱ミミック強襲！',
            speciesIds: ['mimic'],
            interacted: false,
          };
          const bState = createBattleState(save, entity, expedition.floor, shrineBuffs);
          setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
          setPendingAdvanceOnWin(choice.advancesStep);
          setBattle(bState);
          showToast('罠だ！宝箱が「宝箱ミミック」に姿を変えた！倒せば高レア確定級！');
          return;
        }
        // Jackpot Treasure!
        const items = [
          generateEquipment(expedition.floor + 1, save.worldTier, lootBonuses.magicFind + 65, 'boss'),
          generateEquipment(expedition.floor, save.worldTier, lootBonuses.magicFind + 45, 'gold_chest'),
        ];
        const bonusGold = Math.round(90 * (1 + expedition.floor * 0.35) * Math.pow(2.1, save.worldTier - 1));
        const bonusStones = Math.round((7 + expedition.floor * 0.4) * (1 + (save.worldTier - 1) * 0.4));
        const res = grantLootItems(items, bonusGold, bonusStones, true);
        showToast(
          `大当たり秘宝！${res.kept[0] ? `[${RARITY_META[res.kept[0].rarity].label}]${res.kept[0].name}` : ''} 💎石+${bonusStones} ${bonusGold}G！`,
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
            lootBonuses.magicFind + 40,
            'gold_chest',
          );
          const stones = Math.round((9 + expedition.floor * 0.5) * (1 + (save.worldTier - 1) * 0.45));
          setSave((prev) => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
          const res = grantLootItems([item], 0, stones, false);
          showToast(
            `行商人と取引！💎鍛冶石+${stones}＆${res.kept[0] ? `[${RARITY_META[res.kept[0].rarity].label}]${res.kept[0].name}` : '装備'}を購入！`,
          );
        } else {
          healAllParty(0.4, true);
          showToast('金貨が足りなかったが、行商人が薬草を分けてくれた（HP/MP 40%回復）！');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // ===== NEW EVENT 4: 旅の鍛冶師 (Wandering Blacksmith Free +1) =====
      if (choice.kind === 'wandering_smith') {
        // Find an equipped item under +15 on party (Hero first)
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
            stats: { ...prev.stats, totalForgeUpgrades: prev.stats.totalForgeUpgrades + 1 },
          }));
          showToast(
            isBreakthrough
              ? `旅の鍛冶師の妙技！${upgraded.name}が★+${upgraded.enhanceLevel}突破（全OP底上げ）！`
              : `旅の鍛冶師が ${upgraded.name} を無料で +${upgraded.enhanceLevel} に鍛えてくれた！`,
          );
        } else {
          const giftStones = 8 + save.worldTier * 3;
          setSave((prev) => ({ ...prev, forgeStones: prev.forgeStones + giftStones }));
          showToast(`旅の鍛冶師から💎鍛冶石+${giftStones}をもらった！`);
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // Regular / Gold Chest
      if (choice.kind === 'chest' || choice.kind === 'gold_chest') {
        const isGold = choice.kind === 'gold_chest';
        const itemCount = isGold ? 2 : 1;
        const generated: EquipmentItem[] = [];
        for (let i = 0; i < itemCount; i += 1) {
          generated.push(
            generateEquipment(
              expedition.floor,
              save.worldTier,
              lootBonuses.magicFind + (isGold ? 35 : 12),
              isGold ? 'gold_chest' : 'chest',
            ),
          );
        }
        const bonusGold = Math.round(
          (isGold ? 65 : 28) *
            (1 + expedition.floor * 0.35) *
            Math.pow(2.1, save.worldTier - 1),
        );
        const bonusStones = Math.round(
          (isGold ? 5 : 2) * (1 + (save.worldTier - 1) * 0.4) * (1 + lootBonuses.stoneFind / 100),
        );
        const res = grantLootItems(generated, bonusGold, bonusStones, true);
        const topItem = res.kept[0];
        if (topItem) {
          showToast(
            `${isGold ? '黄金の宝箱' : '宝箱'}！[${RARITY_META[topItem.rarity].label}] ${topItem.name}・💎石+${bonusStones}・${bonusGold}G！`,
          );
        } else {
          showToast(
            `宝箱開封！（${res.mode === 'salvage' ? `自動分解→💎石+${bonusStones + res.autoStones}` : `自動売却→+${bonusGold + res.autoGold}G`}）`,
          );
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // Battle / Elite / Boss / Rare Encounter (EVENT 5: Gold Slime & Void Herald!)
      if (
        choice.kind === 'battle' ||
        choice.kind === 'elite' ||
        choice.kind === 'boss' ||
        choice.kind === 'rare_encounter'
      ) {
        const entity: MapEntity = {
          id: choice.id,
          kind:
            choice.kind === 'battle'
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
        const bState = createBattleState(save, entity, expedition.floor, shrineBuffs);
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
        setSave(nextSave);
        setBattle({ ...next, reward });
        advanceExpeditionStep(
          nextSave.worldTier,
          next.isBossBattle,
          false,
          pendingAdvanceOnWin,
        );
        return;
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
    const shouldAutoStep = !active || !active.isAlly || save.settings.autoBattle || autoAdvance;
    if (!shouldAutoStep) return;

    const delayMs =
      save.settings.battleSpeed === 4
        ? 140
        : save.settings.battleSpeed === 2
          ? 300
          : 580;

    const timer = window.setTimeout(() => {
      const next = stepEnemyOrAutoTurn(
        battle,
        save.settings.autoBattle || autoAdvance,
        save.settings.battleTactic,
      );
      applyBattleTransition(next);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    applyBattleTransition,
    autoAdvance,
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
    if (battle.phase === 'defeat') {
      returnToVillage('全滅したため始まりの村へ帰還した。泉で全回復！');
      return;
    }
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
  }, [battle, returnToVillage]);

  useEffect(() => {
    if (!autoAdvance || !battle || battle.phase !== 'victory' || !battle.reward) return;
    const delay = save.settings.battleSpeed === 4 ? 700 : 1200;
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
      showToast('装備を変更した！');
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
      showToast('装備を売却した！');
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
      showToast(`装備を分解！💎鍛冶石 +${stones} を獲得！`);
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
      setSave((prev) => ({
        ...prev,
        gold: prev.gold - cost.gold,
        forgeStones: prev.forgeStones - cost.stones,
        inventory: prev.inventory.map((i) => (i.id === itemId ? upgraded : i)),
        stats: {
          ...prev.stats,
          totalForgeUpgrades: prev.stats.totalForgeUpgrades + 1,
        },
      }));
      showToast(
        isBreakthrough
          ? `★ブレイクスルー！${upgraded.name} +${upgraded.enhanceLevel}（全OPが+25%底上げ！）`
          : `🔨 鍛冶強化成功！${upgraded.name} +${upgraded.enhanceLevel}！`,
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
          `🔄 OP再鍛造！「${newAffix.label}+${newAffix.value}${newAffix.isPercent ? '%' : ''}」に変化！`,
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
        showToast('対象の未ロック・未装備アイテムがありません。');
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
          ? `${count}個の装備を一括分解 → 💎鍛冶石+${stoneGain}！`
          : `${count}個の装備を一括売却 → +${goldGain.toLocaleString()}G！`,
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
      showToast(`世界ランクを Tier ${toRoman(tier)} に切り替えた！`);
    },
    [showToast],
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
      showToast(`${target.name} を購入した！`);
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
    showToast('商店の品揃えを更新した！');
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
    showToast(`ミステリー箱から [${RARITY_META[item.rarity].label}] ${item.name} が出現！`);
  }, [save, showToast]);

  const handleImportSave = useCallback(
    (code: string) => {
      const res = importSaveCode(code);
      if (!res.ok) return { ok: false, error: res.error };
      setSave(res.save);
      setBattle(null);
      setExpedition(createVillageExpedition());
      setActiveTab('explore');
      showToast('セーブコードを復元しました！');
      return { ok: true };
    },
    [showToast],
  );

  const handleResetSave = useCallback(() => {
    clearLocalSave();
    const fresh = createInitialSave();
    setSave(fresh);
    setBattle(null);
    setAutoAdvance(false);
    setShrineBuffs(EMPTY_SHRINE_BUFFS);
    setExpedition(createVillageExpedition());
    setActiveTab('explore');
    showToast('セーブデータを初期化しました。新たな冒険の始まり！');
  }, [showToast]);

  const biomeDef = BIOMES[expedition.biome];
  const inVillage = expedition.inVillage;
  const highestFloorThisTier = save.highestFloorByTier[save.worldTier] ?? 1;
  const defaultEntryFloor =
    highestFloorThisTier >= 6 ? Math.floor((highestFloorThisTier - 1) / 5) * 5 + 1 : 1;

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
              {inVillage ? biomeDef.shortName : `${biomeDef.shortName} ${expedition.floor}F`}
            </h1>
            <span className="tier-badge">T{toRoman(save.worldTier)}</span>
          </div>
          <div className="hud-right">
            <span className="gold-pill" style={{ color: '#8ae8ff', borderColor: 'rgba(138, 232, 255, 0.45)' }}>
              💎{save.forgeStones.toLocaleString()}
            </span>
            <span className="gold-pill">{save.gold.toLocaleString()}G</span>
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

          {(shrineBuffs.powerBonus > 0 ||
            shrineBuffs.fortuneBonus > 0 ||
            shrineBuffs.curseEnemyBonus > 0) &&
            !inVillage && (
              <div className="stage-buff-strip">
                {shrineBuffs.powerBonus > 0 && (
                  <span className="buff-tag">
                    剛力 +{Math.round(shrineBuffs.powerBonus * 100)}%
                  </span>
                )}
                {shrineBuffs.fortuneBonus > 0 && (
                  <span className="buff-tag">幸運 MF+{shrineBuffs.fortuneBonus}%</span>
                )}
                {shrineBuffs.curseEnemyBonus > 0 && (
                  <span className="buff-tag" style={{ borderColor: '#ff7084', color: '#ff9cab' }}>
                    呪い 敵+{Math.round(shrineBuffs.curseEnemyBonus * 100)}%
                  </span>
                )}
              </div>
            )}

          {toast && <div className="stage-toast">{toast}</div>}
        </section>

        {/* Bottom Half: One-Handed Command Selection Zone */}
        <section className="bottom-shell">
          {battle ? (
            <BattlePanel
              battle={battle}
              settings={{
                ...save.settings,
                autoBattle: save.settings.autoBattle || autoAdvance,
              }}
              selectedEnemyUid={effectiveSelectedEnemyUid}
              onCommand={handleBattleCommand}
              onToggleAuto={() => {
                if (autoAdvance) setAutoAdvance(false);
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
                            <PixelIcon spriteKey={sp.spriteKey} size={18} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 8.5,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <button
                        id="btn-enter-labyrinth"
                        type="button"
                        className="choice-card stairs-choice"
                        onClick={() => enterDungeonFloor(defaultEntryFloor)}
                      >
                        <PixelIcon spriteKey="hero" size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: '#eafff0' }}>
                            ⚔ 迷宮へ出撃する（{defaultEntryFloor}F〜）
                          </div>
                          <div className="muted-text">
                            コマンド選択でサクサク進行！装備厳選＆仲間集めへ
                          </div>
                        </div>
                        <span className="choice-tag" style={{ background: '#2e8a4e' }}>
                          出撃
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
                          style={{ padding: '9px 6px' }}
                          onClick={() => healAllParty(1, false)}
                        >
                          💧 回復の泉
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '9px 6px' }}
                          onClick={() => setActiveTab('party')}
                        >
                          🐾 パーティ・牧場
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '9px 6px' }}
                          onClick={() => setActiveTab('gear')}
                        >
                          🔨 装備・鍛冶 ({save.inventory.length})
                        </button>
                        <button
                          type="button"
                          className="rpg-btn primary"
                          style={{ padding: '9px 6px' }}
                          onClick={() => setActiveTab('world')}
                        >
                          ✦ 世界ランク・商店
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span
                          className="section-heading"
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {expedition.step >= expedition.maxSteps && !expedition.bossDefeated
                            ? `${expedition.floor}F 階層ボス出現！`
                            : `進むルート (${expedition.step}/${expedition.maxSteps})`}
                        </span>
                        <button
                          id="btn-auto-advance"
                          type="button"
                          className={`rpg-btn sm ${autoAdvance ? 'active-toggle' : ''}`}
                          onClick={() => setAutoAdvance((v) => !v)}
                        >
                          {autoAdvance ? '⏹オート中' : '▶オート進行'}
                        </button>
                        <button
                          id="btn-return-village"
                          type="button"
                          className="rpg-btn sm"
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
                              : ch.kind === 'stairs'
                                ? 'stairs-choice'
                                : ch.kind === 'gold_chest' ||
                                    ch.kind === 'elite' ||
                                    ch.kind === 'rare_encounter' ||
                                    ch.kind === 'suspicious_chest'
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
                              <PixelIcon spriteKey={ch.spriteKey} size={26} />
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

              {activeTab === 'compendium' && <CompendiumPanel save={save} />}

              {activeTab === 'world' && (
                <WorldPanel
                  save={save}
                  inVillage={inVillage}
                  onSelectWorldTier={handleSelectWorldTier}
                  onEnterDungeonFloor={enterDungeonFloor}
                  onBuyShopItem={handleBuyShopItem}
                  onRefreshShop={handleRefreshShop}
                  onBuyMysteryBox={handleBuyMysteryBox}
                  onImportSaveCode={handleImportSave}
                  onResetSave={handleResetSave}
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
                </button>
                <button
                  id="tab-gear"
                  type="button"
                  className={`tab-btn ${activeTab === 'gear' ? 'active' : ''}`}
                  onClick={() => setActiveTab('gear')}
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
                  <span>図鑑</span>
                </button>
                <button
                  id="tab-world"
                  type="button"
                  className={`tab-btn ${activeTab === 'world' ? 'active' : ''}`}
                  onClick={() => setActiveTab('world')}
                >
                  <span>✦</span>
                  <span>世界</span>
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
