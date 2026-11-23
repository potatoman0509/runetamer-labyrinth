import { getBiomeBossId, getBiomeForFloor, isBossFloor } from './data/biomes';
import { getBiomeNormalMonsters, getSpecies } from './data/monsters';
import type { DungeonMap, MapEntity, TileKind } from './types';
import { getActiveTierModifiers } from './worldTier';

export function isWalkableTile(tile: TileKind): boolean {
  return (
    tile === 'floor' ||
    tile === 'floor_alt' ||
    tile === 'road' ||
    tile === 'stairs_down' ||
    tile === 'dungeon_gate'
  );
}

/**
 * Handcrafted charming 17x13 sunlit hub village!
 * Player can walk right up to the Healing Fountain, Monster Ranch, Shop, World Tier Altar, or Labyrinth Gate.
 */
export function createHubMap(): DungeonMap {
  const width = 17;
  const height = 13;
  const tiles: TileKind[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'floor' as TileKind),
  );
  const explored: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => true),
  );

  // Border trees
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y]![x] = 'tree';
      } else if ((x + y) % 5 === 0) {
        tiles[y]![x] = 'floor_alt'; // wildflowers
      }
    }
  }

  // Cobblestone cross roads
  for (let y = 2; y <= 10; y += 1) {
    tiles[y]![8] = 'road';
  }
  for (let x = 3; x <= 13; x += 1) {
    tiles[6]![x] = 'road';
  }
  // Central plaza
  for (let y = 5; y <= 7; y += 1) {
    for (let x = 7; x <= 9; x += 1) {
      tiles[y]![x] = 'road';
    }
  }

  // Labyrinth Gate at north center (8, 1)
  tiles[1]![7] = 'wall';
  tiles[1]![8] = 'dungeon_gate';
  tiles[1]![9] = 'wall';
  tiles[2]![8] = 'road';

  // Left House (Shop / Blacksmith) around x=2..4, y=2..4
  for (let x = 2; x <= 4; x += 1) {
    tiles[2]![x] = 'house_roof';
    tiles[3]![x] = 'house_wall';
  }
  tiles[4]![3] = 'shop';
  tiles[5]![3] = 'road';

  // Right House (Monster Ranch) around x=12..14, y=2..4
  for (let x = 12; x <= 14; x += 1) {
    tiles[2]![x] = 'house_roof';
    tiles[3]![x] = 'house_wall';
  }
  tiles[4]![13] = 'ranch';
  tiles[5]![13] = 'road';

  // Healing Fountain at bottom-left plaza (4, 8)
  tiles[8]![4] = 'fountain';
  tiles[7]![4] = 'road';

  // World Tier Altar at bottom-right plaza (12, 8)
  tiles[8]![12] = 'altar';
  tiles[7]![12] = 'road';

  // Decorative pond
  tiles[10]![2] = 'water';
  tiles[10]![3] = 'water';
  tiles[10]![13] = 'water';
  tiles[10]![14] = 'water';

  const entities: MapEntity[] = [
    {
      id: 'hub_gate',
      kind: 'npc',
      x: 8,
      y: 1,
      spriteKey: 'gate',
      name: '迷宮の入口',
      interacted: false,
      npcAction: 'gate',
    },
    {
      id: 'hub_shop',
      kind: 'npc',
      x: 3,
      y: 4,
      spriteKey: 'npc_smith',
      name: '鍛冶＆商店',
      interacted: false,
      npcAction: 'shop',
    },
    {
      id: 'hub_ranch',
      kind: 'npc',
      x: 13,
      y: 4,
      spriteKey: 'npc_ranch',
      name: 'モンスター牧場',
      interacted: false,
      npcAction: 'ranch',
    },
    {
      id: 'hub_fountain',
      kind: 'npc',
      x: 4,
      y: 8,
      spriteKey: 'fountain',
      name: '回復の泉',
      interacted: false,
      npcAction: 'fountain',
    },
    {
      id: 'hub_altar',
      kind: 'npc',
      x: 12,
      y: 8,
      spriteKey: 'altar',
      name: '世界ランクの祭壇',
      interacted: false,
      npcAction: 'altar',
    },
  ];

  return {
    biome: 'village',
    floor: 0,
    width,
    height,
    tiles,
    explored,
    entities,
    playerX: 8,
    playerY: 6,
    stairsX: 8,
    stairsY: 1,
    bossDefeated: true,
  };
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Generates a compact, fun-to-explore 23x19 tile dungeon floor with rooms, corridors,
 * symbol enemies (normal + golden elites + floor boss every 5F), chests, blessing shrine, and stairs!
 */
export function generateDungeonFloor(floor: number, worldTier: number): DungeonMap {
  const width = 23;
  const height = 19;
  const biome = getBiomeForFloor(floor);
  const bossFloor = isBossFloor(floor);
  const tierMods = getActiveTierModifiers(worldTier);

  const tiles: TileKind[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'wall' as TileKind),
  );
  const explored: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );

  const rooms: Room[] = [];
  const targetRooms = bossFloor ? 5 : 6;

  for (let attempt = 0; attempt < 60 && rooms.length < targetRooms; attempt += 1) {
    const w = randInt(4, 6);
    const h = randInt(4, 5);
    const x = randInt(1, width - w - 2);
    const y = randInt(1, height - h - 2);

    const overlaps = rooms.some(
      (r) =>
        x <= r.x + r.w + 1 &&
        x + w + 1 >= r.x &&
        y <= r.y + r.h + 1 &&
        y + h + 1 >= r.y,
    );
    if (!overlaps) {
      rooms.push({
        x,
        y,
        w,
        h,
        cx: Math.floor(x + w / 2),
        cy: Math.floor(y + h / 2),
      });
    }
  }

  // Fallback rooms if RNG got unlucky
  if (rooms.length < 3) {
    rooms.length = 0;
    rooms.push(
      { x: 2, y: 2, w: 5, h: 5, cx: 4, cy: 4 },
      { x: 9, y: 7, w: 5, h: 5, cx: 11, cy: 9 },
      { x: 16, y: 12, w: 5, h: 5, cx: 18, cy: 14 },
    );
  }

  // Carve rooms
  for (const r of rooms) {
    for (let ry = r.y; ry < r.y + r.h; ry += 1) {
      for (let rx = r.x; rx < r.x + r.w; rx += 1) {
        tiles[ry]![rx] = Math.random() < 0.16 ? 'floor_alt' : 'floor';
      }
    }
  }

  // Carve L-shaped corridors connecting rooms sequentially + 1 extra loop corridor
  const carveCorridor = (x1: number, y1: number, x2: number, y2: number) => {
    let cx = x1;
    let cy = y1;
    while (cx !== x2) {
      tiles[cy]![cx] = 'floor';
      cx += cx < x2 ? 1 : -1;
    }
    while (cy !== y2) {
      tiles[cy]![cx] = 'floor';
      cy += cy < y2 ? 1 : -1;
    }
    tiles[cy]![cx] = 'floor';
  };

  for (let i = 1; i < rooms.length; i += 1) {
    const prev = rooms[i - 1]!;
    const curr = rooms[i]!;
    carveCorridor(prev.cx, prev.cy, curr.cx, curr.cy);
  }
  if (rooms.length >= 4) {
    carveCorridor(rooms[0]!.cx, rooms[0]!.cy, rooms[rooms.length - 1]!.cx, rooms[rooms.length - 1]!.cy);
  }

  // Pick farthest room from rooms[0] as the Stairs / Boss room
  const startRoom = rooms[0]!;
  let goalRoom = rooms[rooms.length - 1]!;
  let bestDist = -1;
  for (const r of rooms.slice(1)) {
    const d = Math.abs(r.cx - startRoom.cx) + Math.abs(r.cy - startRoom.cy);
    if (d > bestDist) {
      bestDist = d;
      goalRoom = r;
    }
  }

  const playerX = startRoom.cx;
  const playerY = startRoom.cy;
  const stairsX = goalRoom.cx;
  const stairsY = goalRoom.cy;
  tiles[stairsY]![stairsX] = 'stairs_down';

  const occupied = new Set<string>([
    `${playerX},${playerY}`,
    `${stairsX},${stairsY}`,
  ]);

  const findFreeTileInRoom = (room: Room): { x: number; y: number } | null => {
    for (let tries = 0; tries < 20; tries += 1) {
      const tx = randInt(room.x, room.x + room.w - 1);
      const ty = randInt(room.y, room.y + room.h - 1);
      const key = `${tx},${ty}`;
      if (!occupied.has(key) && isWalkableTile(tiles[ty]![tx]!)) {
        occupied.add(key);
        return { x: tx, y: ty };
      }
    }
    return null;
  };

  const entities: MapEntity[] = [];
  const normalPool = getBiomeNormalMonsters(biome);

  // Place Boss on boss floors right next to or on stairs approach
  if (bossFloor) {
    const bossId = getBiomeBossId(biome);
    const bossSp = getSpecies(bossId);
    const pos = findFreeTileInRoom(goalRoom) ?? { x: Math.max(1, stairsX - 1), y: stairsY };
    const escort1 = pick(normalPool).id;
    const escort2 = pick(normalPool).id;
    entities.push({
      id: `boss_${floor}`,
      kind: 'boss',
      x: pos.x,
      y: pos.y,
      spriteKey: bossSp.spriteKey,
      name: `【BOSS】${bossSp.name}`,
      speciesIds: floor >= 10 ? [escort1, bossId, escort2] : [bossId, escort1],
      interacted: false,
    });
  }

  // Place Chests (2 chests, occasionally gold!)
  const otherRooms = rooms.filter((r) => r !== startRoom);
  for (let c = 0; c < 2 && otherRooms.length > 0; c += 1) {
    const room = otherRooms[c % otherRooms.length]!;
    const pos = findFreeTileInRoom(room);
    if (pos) {
      const isGold = Math.random() < 0.28 + (worldTier - 1) * 0.08;
      entities.push({
        id: `chest_${floor}_${c}`,
        kind: isGold ? 'gold_chest' : 'chest',
        x: pos.x,
        y: pos.y,
        spriteKey: isGold ? 'gold_chest' : 'chest',
        name: isGold ? '黄金の宝箱' : '宝箱',
        interacted: false,
      });
    }
  }

  // Place 1 Blessing Shrine
  const shrineRoom = otherRooms[otherRooms.length - 1] ?? startRoom;
  const shrinePos = findFreeTileInRoom(shrineRoom);
  if (shrinePos) {
    const shrineType = pick<'heal' | 'power' | 'fortune'>(['heal', 'power', 'fortune']);
    const shrineNames = {
      heal: '癒しの祠（HP/MP全回復）',
      power: '剛力の祠（攻撃/魔力+25%）',
      fortune: '幸運の祠（トレハン+45%）',
    };
    entities.push({
      id: `shrine_${floor}`,
      kind: 'shrine',
      x: shrinePos.x,
      y: shrinePos.y,
      spriteKey: 'shrine',
      name: shrineNames[shrineType],
      shrineType,
      interacted: false,
    });
  }

  // Place 4-6 Symbol Enemies (with Elite Golden Aura chance!)
  const enemyCount = bossFloor ? 3 : randInt(4, 6);
  for (let i = 0; i < enemyCount; i += 1) {
    const room = otherRooms[i % Math.max(1, otherRooms.length)] ?? startRoom;
    const pos = findFreeTileInRoom(room);
    if (!pos) continue;
    const isElite = i === 0 || Math.random() < tierMods.eliteChance;
    const lead = pick(normalPool);
    const packSize = isElite ? randInt(2, 3) : randInt(1, 3);
    const speciesIds: string[] = [lead.id];
    for (let p = 1; p < packSize; p += 1) {
      speciesIds.push(pick(normalPool).id);
    }
    entities.push({
      id: `enemy_${floor}_${i}`,
      kind: isElite ? 'elite' : 'enemy',
      x: pos.x,
      y: pos.y,
      spriteKey: lead.spriteKey,
      name: isElite ? `★強敵 ${lead.name}` : lead.name,
      speciesIds,
      interacted: false,
    });
  }

  const map: DungeonMap = {
    biome,
    floor,
    width,
    height,
    tiles,
    explored,
    entities,
    playerX,
    playerY,
    stairsX,
    stairsY,
    bossDefeated: !bossFloor,
  };

  revealAround(map, playerX, playerY, 4);
  return map;
}

export function revealAround(map: DungeonMap, cx: number, cy: number, radius = 4): void {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
        if (dx * dx + dy * dy <= radius * radius + 1) {
          map.explored[ny]![nx] = true;
        }
      }
    }
  }
}

export function getEntityAt(map: DungeonMap, x: number, y: number): MapEntity | undefined {
  return map.entities.find((e) => !e.interacted && e.x === x && e.y === y);
}

/**
 * BFS pathfinding for 1-tap movement & Auto-Explore.
 * Allows targeting an interactable tile/entity at (goalX, goalY).
 */
export function findPathBFS(
  map: DungeonMap,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
): { x: number; y: number }[] {
  if (startX === goalX && startY === goalY) return [];
  if (goalX < 0 || goalX >= map.width || goalY < 0 || goalY >= map.height) return [];

  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const cameFrom = new Map<string, string | null>();
  const startKey = `${startX},${startY}`;
  cameFrom.set(startKey, null);

  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === goalX && cur.y === goalY) {
      found = true;
      break;
    }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
      const key = `${nx},${ny}`;
      if (cameFrom.has(key)) continue;

      const isGoal = nx === goalX && ny === goalY;
      const tile = map.tiles[ny]![nx]!;
      const blockingEntity = map.entities.find(
        (e) => !e.interacted && e.x === nx && e.y === ny && e.kind === 'npc',
      );

      if (isGoal) {
        // Allow stepping onto walkable goal OR reaching adjacent to NPC/facility
        cameFrom.set(key, `${cur.x},${cur.y}`);
        queue.push({ x: nx, y: ny });
      } else if (isWalkableTile(tile) && !blockingEntity) {
        cameFrom.set(key, `${cur.x},${cur.y}`);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  if (!found) return [];

  const path: { x: number; y: number }[] = [];
  let currKey: string | null = `${goalX},${goalY}`;
  while (currKey && currKey !== startKey) {
    const [xs, ys] = currKey.split(',');
    path.push({ x: Number(xs), y: Number(ys) });
    currKey = cameFrom.get(currKey) ?? null;
  }
  path.reverse();
  return path;
}

/**
 * Picks the next engaging Auto-Explore destination on a dungeon floor:
 * Priority: Chests / Shrines -> Elites / Enemies -> Boss -> Stairs Down.
 */
export function findAutoExploreTarget(map: DungeonMap): { x: number; y: number } | null {
  if (map.floor === 0) return null;
  const active = map.entities.filter((e) => !e.interacted);
  const dist = (x: number, y: number) => Math.abs(x - map.playerX) + Math.abs(y - map.playerY);

  const pickClosest = (list: MapEntity[]) => {
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y));
    return { x: sorted[0]!.x, y: sorted[0]!.y };
  };

  const chestsAndShrines = active.filter(
    (e) => e.kind === 'gold_chest' || e.kind === 'chest' || e.kind === 'shrine',
  );
  if (chestsAndShrines.length > 0) return pickClosest(chestsAndShrines);

  const enemies = active.filter((e) => e.kind === 'elite' || e.kind === 'enemy');
  if (enemies.length > 0) return pickClosest(enemies);

  const bosses = active.filter((e) => e.kind === 'boss');
  if (bosses.length > 0) return pickClosest(bosses);

  return { x: map.stairsX, y: map.stairsY };
}
