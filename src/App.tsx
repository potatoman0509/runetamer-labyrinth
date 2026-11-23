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
import { generateEquipment, RARITY_META } from './game/data/equipment';
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

export function App() {
  const [save, setSave] = useState<GameSave>(() => loadGameFromLocal() ?? createInitialSave());
  const [expedition, setExpedition] = useState<ExpeditionState>(() => createVillageExpedition());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [pendingAdvanceOnWin, setPendingAdvanceOnWin] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [selectedEnemyUid, setSelectedEnemyUid] = useState<string | null>(null);
  const [shrineBuffs, setShrineBuffs] = useState<ActiveShrineBuffs>({
    powerBonus: 0,
    fortuneBonus: 0,
  });

  const [autoAdvance, setAutoAdvance] = useState(false);
  const [toast, setToast] = useState<string | null>(
    'コマンドを選んで迷宮を進もう！まずは「迷宮へ出撃」をタップ！',
  );

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3400);
  }, []);

  // Auto-save to localStorage
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
      setShrineBuffs({ powerBonus: 0, fortuneBonus: 0 });
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

  // Execute a selected Expedition Command Choice!
  const handleSelectChoice = useCallback(
    (choice: ExpeditionChoice) => {
      if (battle || expedition.inVillage) return;

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
          setShrineBuffs((b) => ({ ...b, fortuneBonus: Math.min(180, b.fortuneBonus + 45) }));
          showToast('幸運の祠の祝福！この探索中、トレハン（レア率）+45%！');
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      if (choice.kind === 'chest' || choice.kind === 'gold_chest') {
        const isGold = choice.kind === 'gold_chest';
        const lootBonuses = getPartyAggregatedLootBonuses(save, shrineBuffs);
        const itemCount = isGold ? 2 : 1;
        const gainedItems: EquipmentItem[] = [];
        let autoSoldCount = 0;
        let autoSoldGold = 0;
        let mythics = 0;

        for (let i = 0; i < itemCount; i += 1) {
          const it = generateEquipment(
            expedition.floor,
            save.worldTier,
            lootBonuses.magicFind + (isGold ? 35 : 12),
            isGold ? 'gold_chest' : 'chest',
          );
          if (it.rarity === 'mythic') mythics += 1;
          if (!it.uniqueId && shouldAutoSell(it.rarity, save.settings.autoSell)) {
            autoSoldCount += 1;
            autoSoldGold += it.sellValue;
          } else {
            gainedItems.push(it);
          }
        }
        const bonusGold = Math.round(
          (isGold ? 65 : 28) *
            (1 + expedition.floor * 0.35) *
            Math.pow(2.1, save.worldTier - 1),
        );

        setSave((prev) => {
          const uniques = new Set(prev.discoveredUniques);
          for (const it of gainedItems) {
            if (it.uniqueId) uniques.add(it.uniqueId);
          }
          return {
            ...prev,
            gold: prev.gold + bonusGold + autoSoldGold,
            inventory: [...gainedItems, ...prev.inventory].slice(0, 140),
            discoveredUniques: Array.from(uniques),
            stats: {
              ...prev.stats,
              totalChestsOpened: prev.stats.totalChestsOpened + 1,
              totalItemsLooted: prev.stats.totalItemsLooted + itemCount,
              totalMythicsFound: prev.stats.totalMythicsFound + mythics,
            },
          };
        });

        const topItem = gainedItems[0];
        if (topItem) {
          showToast(
            `${isGold ? '黄金の宝箱' : '宝箱'}！[${RARITY_META[topItem.rarity].label}] ${topItem.name} と ${bonusGold}G を獲得！`,
          );
        } else {
          showToast(
            `宝箱を開封！（自動売却 ${autoSoldCount}個 → 計+${bonusGold + autoSoldGold}G）`,
          );
        }
        advanceExpeditionStep(save.worldTier, false, false, choice.advancesStep);
        return;
      }

      // Battle / Elite / Boss choice!
      if (choice.kind === 'battle' || choice.kind === 'elite' || choice.kind === 'boss') {
        const entity: MapEntity = {
          id: choice.id,
          kind: choice.kind === 'battle' ? 'enemy' : choice.kind,
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
      healAllParty,
      returnToVillage,
      save,
      shrineBuffs,
      showToast,
    ],
  );

  // Auto-Advance timer while exploring dungeon commands
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

  // Enemy turn & Auto-battle tick timer
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

  // If Auto-Advance is ON, seamlessly close victory screen after a brief moment to continue farming!
  useEffect(() => {
    if (!autoAdvance || !battle || battle.phase !== 'victory' || !battle.reward) return;
    const delay = save.settings.battleSpeed === 4 ? 700 : 1200;
    const timer = window.setTimeout(() => {
      handleFinishBattle();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, battle, handleFinishBattle, save.settings.battleSpeed]);

  // Equipment handlers
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

  const handleBulkSell = useCallback(
    (maxRarity: 'uncommon' | 'rare') => {
      const maxRank = RARITY_META[maxRarity].rank;
      let soldCount = 0;
      let soldGold = 0;

      setSave((prev) => {
        const equippedSet = new Set<string>();
        for (const u of Object.values(prev.roster)) {
          for (const eid of Object.values(u.equipped)) {
            if (eid) equippedSet.add(eid);
          }
        }

        const remaining = prev.inventory.filter((it) => {
          if (it.locked || equippedSet.has(it.id) || it.uniqueId) return true;
          if (RARITY_META[it.rarity].rank <= maxRank) {
            soldCount += 1;
            soldGold += it.sellValue;
            return false;
          }
          return true;
        });

        return {
          ...prev,
          gold: prev.gold + soldGold,
          inventory: remaining,
        };
      });

      if (soldCount > 0) {
        showToast(`${soldCount}個の装備を一括売却 → +${soldGold.toLocaleString()}G！`);
      } else {
        showToast('売却対象の未ロック・未装備アイテムがありません。');
      }
    },
    [showToast],
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

  // World Tier & Shop handlers
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
    setShrineBuffs({ powerBonus: 0, fortuneBonus: 0 });
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
            <span className="tier-badge">Tier {toRoman(save.worldTier)}</span>
          </div>
          <div className="hud-right">
            <span className="gold-pill">{save.gold.toLocaleString()} G</span>
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

          {(shrineBuffs.powerBonus > 0 || shrineBuffs.fortuneBonus > 0) && !inVillage && (
            <div className="stage-buff-strip">
              {shrineBuffs.powerBonus > 0 && (
                <span className="buff-tag">
                  剛力 +{Math.round(shrineBuffs.powerBonus * 100)}%
                </span>
              )}
              {shrineBuffs.fortuneBonus > 0 && (
                <span className="buff-tag">幸運 MF+{shrineBuffs.fortuneBonus}%</span>
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
                <div className="panel-body" style={{ gap: 8 }}>
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
                            <PixelIcon spriteKey={sp.spriteKey} size={20} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {sp.name}
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--accent-amber)' }}>
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
                    /* ===== VILLAGE COMMAND MENU ===== */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        id="btn-enter-labyrinth"
                        type="button"
                        className="choice-card stairs-choice"
                        onClick={() => enterDungeonFloor(defaultEntryFloor)}
                      >
                        <PixelIcon spriteKey="hero" size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, color: '#eafff0' }}>
                            ⚔ 迷宮へ出撃する（{defaultEntryFloor}F〜）
                          </div>
                          <div className="muted-text">
                            コマンド選択でサクサク進行！装備厳選＆モンスター収集へ出発
                          </div>
                        </div>
                        <span className="choice-tag" style={{ background: '#2e8a4e' }}>
                          出撃
                        </span>
                      </button>

                      {quickCheckpoints.length > 1 && (
                        <div className="filter-row">
                          <span className="muted-text">開始階層:</span>
                          {quickCheckpoints.map((fl) => (
                            <button
                              key={fl}
                              type="button"
                              className="pill-chip active"
                              onClick={() => enterDungeonFloor(fl)}
                            >
                              {fl}Fから
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="village-cmd-grid">
                        <button
                          id="btn-village-heal"
                          type="button"
                          className="rpg-btn emerald"
                          style={{ padding: '11px 8px' }}
                          onClick={() => healAllParty(1, false)}
                        >
                          💧 回復の泉（全回復）
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '11px 8px' }}
                          onClick={() => setActiveTab('party')}
                        >
                          🐾 パーティ・牧場
                        </button>
                        <button
                          type="button"
                          className="rpg-btn"
                          style={{ padding: '11px 8px' }}
                          onClick={() => setActiveTab('gear')}
                        >
                          ⚔ 装備厳選 ({save.inventory.length})
                        </button>
                        <button
                          type="button"
                          className="rpg-btn primary"
                          style={{ padding: '11px 8px' }}
                          onClick={() => setActiveTab('world')}
                        >
                          ✦ 世界ランク・商店
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ===== DUNGEON COMMAND CHOICE MENU ===== */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="section-heading" style={{ flex: 1 }}>
                          {expedition.step >= expedition.maxSteps && !expedition.bossDefeated
                            ? `${expedition.floor}F 最奥：階層ボス出現！`
                            : `進むコマンドを選択 (${expedition.step}/${expedition.maxSteps})`}
                        </span>
                        <button
                          id="btn-auto-advance"
                          type="button"
                          className={`rpg-btn sm ${autoAdvance ? 'active-toggle' : ''}`}
                          onClick={() => setAutoAdvance((v) => !v)}
                        >
                          {autoAdvance ? '⏹ オート中' : '▶ オート進行'}
                        </button>
                        <button
                          id="btn-return-village"
                          type="button"
                          className="rpg-btn sm"
                          onClick={() => returnToVillage()}
                        >
                          🏠 帰還
                        </button>
                      </div>

                      <div className="choice-list">
                        {expedition.choices.map((ch, idx) => {
                          const extraClass =
                            ch.kind === 'boss'
                              ? 'boss-choice'
                              : ch.kind === 'stairs'
                                ? 'stairs-choice'
                                : ch.kind === 'gold_chest' || ch.kind === 'elite'
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
                              <PixelIcon spriteKey={ch.spriteKey} size={32} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-pixel)',
                                    fontSize: 13,
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
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                    marginTop: 2,
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
                  onBulkSell={handleBulkSell}
                  onChangeAutoSell={(threshold: AutoSellThreshold) =>
                    setSave((p) => ({
                      ...p,
                      settings: { ...p.settings, autoSell: threshold },
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
                  <span>⚔</span>
                  <span>装備</span>
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
