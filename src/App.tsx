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
  createHubMap,
  findAutoExploreTarget,
  findPathBFS,
  generateDungeonFloor,
  getEntityAt,
  isWalkableTile,
  revealAround,
} from './game/dungeon';
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
  DungeonMap,
  EquipmentItem,
  EquipSlot,
  GameSave,
  MapEntity,
} from './game/types';
import { generateShopInventory, getShopPrice, toRoman } from './game/worldTier';

type ActiveTab = 'explore' | 'party' | 'gear' | 'compendium' | 'world';

export function App() {
  const [save, setSave] = useState<GameSave>(() => loadGameFromLocal() ?? createInitialSave());
  const [map, setMap] = useState<DungeonMap>(() => createHubMap());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [selectedEnemyUid, setSelectedEnemyUid] = useState<string | null>(null);
  const [shrineBuffs, setShrineBuffs] = useState<ActiveShrineBuffs>({
    powerBonus: 0,
    fortuneBonus: 0,
  });

  const [heroFacingLeft, setHeroFacingLeft] = useState(false);
  const [moveQueue, setMoveQueue] = useState<{ x: number; y: number }[]>([]);
  const [autoExplore, setAutoExplore] = useState(false);
  const [toast, setToast] = useState<string | null>(
    'ようこそ！北の「迷宮の入口」または下のボタンからダンジョンへ出発しよう！',
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

  // Heal all roster units to full max HP/MP
  const healAllParty = useCallback(
    (silent = false) => {
      setSave((prev) => {
        const nextRoster = { ...prev.roster };
        const mapInv = new Map(prev.inventory.map((it) => [it.id, it]));
        for (const id of Object.keys(nextRoster)) {
          const u = nextRoster[id]!;
          const st = computeUnitStats(u, prev, shrineBuffs, mapInv);
          nextRoster[id] = { ...u, hp: st.maxHp, mp: st.maxMp };
        }
        return { ...prev, roster: nextRoster };
      });
      if (!silent) showToast('回復の泉の清らかな水で、パーティ全員のHP/MPが全回復した！');
    },
    [shrineBuffs, showToast],
  );

  const returnToVillage = useCallback(
    (msg?: string) => {
      setMoveQueue([]);
      setAutoExplore(false);
      setBattle(null);
      setShrineBuffs({ powerBonus: 0, fortuneBonus: 0 });
      setMap(createHubMap());
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
      showToast(msg ?? '始まりの村へ帰還し、全員の体力が回復した！');
    },
    [showToast],
  );

  const enterDungeonFloor = useCallback(
    (floor: number) => {
      const targetFloor = Math.max(1, floor);
      setMoveQueue([]);
      setBattle(null);
      setActiveTab('explore');
      const nextMap = generateDungeonFloor(targetFloor, save.worldTier);
      setMap(nextMap);
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
      showToast(`${b.name} ${targetFloor}F へ降りた！（Tier ${toRoman(save.worldTier)}）`);
    },
    [save.worldTier, showToast],
  );

  // Trigger interaction with an entity (enemy, chest, shrine, village NPC)
  const triggerEntity = useCallback(
    (ent: MapEntity, currentMap: DungeonMap) => {
      if (ent.interacted) return;

      if (ent.kind === 'npc') {
        setMoveQueue([]);
        if (ent.npcAction === 'fountain') {
          healAllParty(false);
        } else if (ent.npcAction === 'ranch') {
          setActiveTab('party');
          showToast('モンスター牧場を開いた！');
        } else if (ent.npcAction === 'shop') {
          setActiveTab('world');
          showToast('村の鍛冶・商店を開いた！');
        } else if (ent.npcAction === 'altar') {
          setActiveTab('world');
          showToast('世界ランクの祭壇を開いた！');
        } else if (ent.npcAction === 'gate') {
          const bestFloor = save.highestFloorByTier[save.worldTier] ?? 1;
          // Start at latest 5-floor biome start or 1F
          const entryFloor = bestFloor >= 6 ? Math.floor((bestFloor - 1) / 5) * 5 + 1 : 1;
          enterDungeonFloor(entryFloor);
        }
        return;
      }

      if (ent.kind === 'chest' || ent.kind === 'gold_chest') {
        setMoveQueue([]);
        const isGold = ent.kind === 'gold_chest';
        const lootBonuses = getPartyAggregatedLootBonuses(save, shrineBuffs);
        const itemCount = isGold ? 2 : 1;
        const gainedItems: EquipmentItem[] = [];
        let autoSoldCount = 0;
        let autoSoldGold = 0;
        let mythics = 0;

        for (let i = 0; i < itemCount; i += 1) {
          const it = generateEquipment(
            currentMap.floor,
            save.worldTier,
            lootBonuses.magicFind + (isGold ? 35 : 10),
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
          (isGold ? 60 : 25) *
            (1 + currentMap.floor * 0.35) *
            Math.pow(2.1, save.worldTier - 1),
        );

        setMap((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.id === ent.id ? { ...e, interacted: true } : e,
          ),
        }));

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
        return;
      }

      if (ent.kind === 'shrine') {
        setMoveQueue([]);
        setMap((prev) => ({
          ...prev,
          entities: prev.entities.map((e) =>
            e.id === ent.id ? { ...e, interacted: true } : e,
          ),
        }));
        if (ent.shrineType === 'heal') {
          healAllParty(true);
          showToast('癒しの祠の祝福！パーティ全員のHP/MPが全回復した！');
        } else if (ent.shrineType === 'power') {
          setShrineBuffs((b) => ({ ...b, powerBonus: Math.min(0.75, b.powerBonus + 0.25) }));
          showToast('剛力の祠の祝福！この探索中、味方全体の攻撃・魔力+25%！');
        } else {
          setShrineBuffs((b) => ({ ...b, fortuneBonus: Math.min(180, b.fortuneBonus + 45) }));
          showToast('幸運の祠の祝福！この探索中、トレハン（レア率）+45%！');
        }
        return;
      }

      // Enemy / Elite / Boss Encounter!
      if (ent.kind === 'enemy' || ent.kind === 'elite' || ent.kind === 'boss') {
        setMoveQueue([]);
        const bState = createBattleState(save, ent, currentMap.floor, shrineBuffs);
        setSelectedEnemyUid(bState.enemies[0]?.uid ?? null);
        setBattle(bState);
      }
    },
    [enterDungeonFloor, healAllParty, save, shrineBuffs, showToast],
  );

  // Move player by 1 tile step (dx, dy)
  const stepMove = useCallback(
    (dx: number, dy: number) => {
      if (battle) return;
      if (dx < 0) setHeroFacingLeft(true);
      if (dx > 0) setHeroFacingLeft(false);

      const nx = map.playerX + dx;
      const ny = map.playerY + dy;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) {
        setMoveQueue([]);
        return;
      }

      // Check entity at target tile first
      const ent = getEntityAt(map, nx, ny);
      if (ent) {
        if (ent.kind === 'npc') {
          triggerEntity(ent, map);
          return;
        }
        // Step onto chest/shrine/enemy tile and trigger
        const nextExplored = map.explored.map((row) => [...row]);
        const nextMap: DungeonMap = {
          ...map,
          playerX: nx,
          playerY: ny,
          explored: nextExplored,
        };
        revealAround(nextMap, nx, ny, 4);
        setMap(nextMap);
        triggerEntity(ent, nextMap);
        return;
      }

      const tile = map.tiles[ny]![nx]!;
      if (!isWalkableTile(tile)) {
        setMoveQueue([]);
        return;
      }

      const nextExplored = map.explored.map((row) => [...row]);
      const nextMap: DungeonMap = {
        ...map,
        playerX: nx,
        playerY: ny,
        explored: nextExplored,
      };
      revealAround(nextMap, nx, ny, 4);
      setMap(nextMap);

      // Stepping onto Dungeon Gate or Stairs Down!
      if (tile === 'dungeon_gate') {
        const bestFloor = save.highestFloorByTier[save.worldTier] ?? 1;
        const entryFloor = bestFloor >= 6 ? Math.floor((bestFloor - 1) / 5) * 5 + 1 : 1;
        enterDungeonFloor(entryFloor);
      } else if (tile === 'stairs_down') {
        if (!nextMap.bossDefeated) {
          showToast('この階層のボスを撃破するまで階段は封印されている！');
          setMoveQueue([]);
        } else {
          enterDungeonFloor(nextMap.floor + 1);
        }
      }
    },
    [battle, enterDungeonFloor, map, save.highestFloorByTier, save.worldTier, showToast, triggerEntity],
  );

  // Interact with adjacent entity or standing stairs
  const interactNearby = useCallback(() => {
    if (battle) return;
    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [0, 0],
    ];
    for (const [dx, dy] of dirs) {
      const ent = getEntityAt(map, map.playerX + dx!, map.playerY + dy!);
      if (ent) {
        triggerEntity(ent, map);
        return;
      }
    }
    if (map.tiles[map.playerY]![map.playerX] === 'stairs_down') {
      if (map.bossDefeated) {
        enterDungeonFloor(map.floor + 1);
      } else {
        showToast('ボスを倒すと次の階層へ進めます！');
      }
    }
  }, [battle, enterDungeonFloor, map, showToast, triggerEntity]);

  // Tap-to-move on Map Canvas
  const handleMapTap = useCallback(
    (tileX: number, tileY: number) => {
      if (battle) return;
      setAutoExplore(false);
      if (tileX === map.playerX && tileY === map.playerY) {
        interactNearby();
        return;
      }
      const path = findPathBFS(map, map.playerX, map.playerY, tileX, tileY);
      if (path.length > 0) {
        setMoveQueue(path);
      }
    },
    [battle, interactNearby, map],
  );

  // Execute queued BFS path steps smoothly
  useEffect(() => {
    if (battle || moveQueue.length === 0) return;
    const timer = window.setTimeout(() => {
      const [next, ...rest] = moveQueue;
      setMoveQueue(rest);
      if (next) {
        stepMove(next.x - map.playerX, next.y - map.playerY);
      }
    }, 115);
    return () => window.clearTimeout(timer);
  }, [battle, map.playerX, map.playerY, moveQueue, stepMove]);

  // Auto-Explore loop inside Dungeon
  useEffect(() => {
    if (!autoExplore || battle || map.floor === 0 || moveQueue.length > 0) return;
    const timer = window.setTimeout(() => {
      const target = findAutoExploreTarget(map);
      if (!target) {
        setAutoExplore(false);
        return;
      }
      const path = findPathBFS(map, map.playerX, map.playerY, target.x, target.y);
      if (path.length > 0) {
        setMoveQueue(path);
      } else {
        setAutoExplore(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [autoExplore, battle, map, moveQueue.length]);

  // Keyboard support (WASD / Arrow keys / Space) for PC users
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (battle) return;
      if (activeTab !== 'explore') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setAutoExplore(false);
        setMoveQueue([]);
        stepMove(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setAutoExplore(false);
        setMoveQueue([]);
        stepMove(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setAutoExplore(false);
        setMoveQueue([]);
        stepMove(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setAutoExplore(false);
        setMoveQueue([]);
        stepMove(1, 0);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        interactNearby();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, battle, interactNearby, stepMove]);

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
        setMap((prev) => ({
          ...prev,
          bossDefeated: prev.bossDefeated || next.isBossBattle,
          entities: prev.entities.map((e) =>
            e.id === next.entityId ? { ...e, interacted: true } : e,
          ),
        }));
        setBattle({ ...next, reward });
        return;
      }
      setBattle(next);
    },
    [save, shrineBuffs],
  );

  // Enemy turn & Auto-battle tick timer
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
        ? 140
        : save.settings.battleSpeed === 2
          ? 300
          : 580;

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
    if (battle.phase === 'defeat') {
      returnToVillage('全滅したため始まりの村へ帰還した。泉で全回復！');
      return;
    }
    if (battle.phase === 'fled') {
      // Sync remaining HP/MP back to roster
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
  }, [battle, returnToVillage]);

  // Equipment handlers
  const handleEquip = useCallback(
    (unitId: string, itemId: string) => {
      setSave((prev) => {
        const item = prev.inventory.find((i) => i.id === itemId);
        if (!item || !prev.roster[unitId]) return prev;
        const nextRoster = { ...prev.roster };

        // Remove from any previous owner
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
        // Verify not equipped by anyone
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

  const handleTogglePartyMember = useCallback(
    (unitId: string) => {
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
    },
    [],
  );

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
      setMap(createHubMap());
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
    setShrineBuffs({ powerBonus: 0, fortuneBonus: 0 });
    setMap(createHubMap());
    setActiveTab('explore');
    showToast('セーブデータを初期化しました。新たな冒険の始まり！');
  }, [showToast]);

  const biomeDef = BIOMES[map.biome];
  const inVillage = map.floor === 0;
  const targetTile = moveQueue.length > 0 ? moveQueue[moveQueue.length - 1]! : null;
  const highestFloorThisTier = save.highestFloorByTier[save.worldTier] ?? 1;
  const canQuickDescend =
    !inVillage && map.bossDefeated && map.playerX === map.stairsX && map.playerY === map.stairsY;

  return (
    <div className="app-viewport">
      <main className="game-shell">
        {/* Top RPG HUD Header */}
        <header className="top-hud">
          <div className="hud-location">
            <h1 className="hud-title">
              {inVillage ? biomeDef.shortName : `${biomeDef.shortName} ${map.floor}F`}
            </h1>
            <span className="tier-badge">Tier {toRoman(save.worldTier)}</span>
          </div>
          <div className="hud-right">
            <span className="gold-pill">{save.gold.toLocaleString()} G</span>
          </div>
        </header>

        {/* Top Half: Crisp 16-bit Pixel Art Canvas Stage */}
        <section className="stage-wrap" aria-label="ゲーム画面">
          <GameCanvas
            map={map}
            battle={battle}
            targetTile={targetTile}
            heroFacingLeft={heroFacingLeft}
            selectedEnemyUid={effectiveSelectedEnemyUid}
            onMapTap={handleMapTap}
            onEnemyTap={(uid) => setSelectedEnemyUid(uid)}
          />

          {/* Active Shrine Buffs indicator */}
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

        {/* Bottom Half: One-Handed Thumb Control Zone */}
        <section className="bottom-shell">
          {battle ? (
            <BattlePanel
              battle={battle}
              settings={save.settings}
              selectedEnemyUid={effectiveSelectedEnemyUid}
              onCommand={handleBattleCommand}
              onToggleAuto={() =>
                setSave((p) => ({
                  ...p,
                  settings: { ...p.settings, autoBattle: !p.settings.autoBattle },
                }))
              }
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
                setFocusItemId(itemId);
                handleFinishBattle();
                setActiveTab('gear');
              }}
            />
          ) : (
            <>
              {activeTab === 'explore' && (
                <div className="panel-body" style={{ justifyContent: 'space-between' }}>
                  {/* Compact Party HP Strip */}
                  <div className="party-mini-strip">
                    {save.partyIds.map((pid) => {
                      const u = save.roster[pid];
                      if (!u) return null;
                      const sp = getSpecies(u.speciesId);
                      const st = computeUnitStats(u, save, shrineBuffs, invMap);
                      const hpPct = Math.max(0, Math.min(100, (u.hp / st.maxHp) * 100));
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
                        </div>
                      );
                    })}
                  </div>

                  {/* Thumb D-Pad + Quick Actions */}
                  <div className="explore-grid">
                    <div className="dpad-box" aria-label="方向パッド">
                      <div />
                      <button
                        id="btn-dpad-up"
                        type="button"
                        className="dpad-btn"
                        onClick={() => {
                          setAutoExplore(false);
                          setMoveQueue([]);
                          stepMove(0, -1);
                        }}
                      >
                        ▲
                      </button>
                      <div />
                      <button
                        id="btn-dpad-left"
                        type="button"
                        className="dpad-btn"
                        onClick={() => {
                          setAutoExplore(false);
                          setMoveQueue([]);
                          stepMove(-1, 0);
                        }}
                      >
                        ◀
                      </button>
                      <button
                        id="btn-dpad-action"
                        type="button"
                        className="dpad-btn dpad-center"
                        onClick={interactNearby}
                      >
                        決定
                      </button>
                      <button
                        id="btn-dpad-right"
                        type="button"
                        className="dpad-btn"
                        onClick={() => {
                          setAutoExplore(false);
                          setMoveQueue([]);
                          stepMove(1, 0);
                        }}
                      >
                        ▶
                      </button>
                      <div />
                      <button
                        id="btn-dpad-down"
                        type="button"
                        className="dpad-btn"
                        onClick={() => {
                          setAutoExplore(false);
                          setMoveQueue([]);
                          stepMove(0, 1);
                        }}
                      >
                        ▼
                      </button>
                      <div />
                    </div>

                    <div className="explore-actions">
                      {inVillage ? (
                        <>
                          <button
                            id="btn-enter-labyrinth"
                            type="button"
                            className="rpg-btn primary"
                            onClick={() => {
                              const startFloor =
                                highestFloorThisTier >= 6
                                  ? Math.floor((highestFloorThisTier - 1) / 5) * 5 + 1
                                  : 1;
                              enterDungeonFloor(startFloor);
                            }}
                          >
                            ⚔ 迷宮へ出撃 ({highestFloorThisTier >= 6 ? `${Math.floor((highestFloorThisTier - 1) / 5) * 5 + 1}F` : '1F'})
                          </button>
                          <button
                            id="btn-village-heal"
                            type="button"
                            className="rpg-btn emerald"
                            onClick={() => healAllParty(false)}
                          >
                            💧 回復の泉（全回復）
                          </button>
                          <button
                            type="button"
                            className="rpg-btn"
                            onClick={() => setActiveTab('world')}
                          >
                            ✦ 世界ランク・階層選択
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            id="btn-auto-explore"
                            type="button"
                            className={`rpg-btn ${autoExplore ? 'active-toggle' : 'primary'}`}
                            onClick={() => setAutoExplore((v) => !v)}
                          >
                            {autoExplore ? '⏹ オート探索 停止' : '▶ オート探索（宝箱/敵/階段）'}
                          </button>
                          {canQuickDescend && (
                            <button
                              type="button"
                              className="rpg-btn emerald"
                              onClick={() => enterDungeonFloor(map.floor + 1)}
                            >
                              ⬇ 次の階層 ({map.floor + 1}F) へ
                            </button>
                          )}
                          <button
                            id="btn-return-village"
                            type="button"
                            className="rpg-btn"
                            onClick={() => returnToVillage()}
                          >
                            🏠 始まりの村へ帰還
                          </button>
                          <div className="muted-text" style={{ textAlign: 'center', fontSize: 10 }}>
                            マップ直接タップでも移動できます
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'party' && (
                <PartyPanel
                  save={save}
                  shrineBuffs={shrineBuffs}
                  inVillage={inVillage}
                  onTogglePartyMember={handleTogglePartyMember}
                  onHealPartyInVillage={() => healAllParty(false)}
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
                  <span>探索</span>
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
