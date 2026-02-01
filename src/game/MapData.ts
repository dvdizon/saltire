import type { TerrainType, EntityPosition } from '../types'

export interface InitialEntityData {
  id: string
  type: string
  position: EntityPosition
  health?: number
  maxHealth?: number
}

type BiomeType = 'forest' | 'desert' | 'beach' | 'island'

const MIN_MAP_SIZE = 10
const MAX_MAP_SIZE = 50
const MAX_GENERATION_ATTEMPTS = 8
const MIN_ENEMIES = 3
const MAX_ENEMIES = 8
const MIN_REGION_TILES = 25
const MIN_REGION_SHARE = 0.45
const MIN_PLAYER_NEIGHBORS = 2
const MIN_ENEMY_NEIGHBORS = 1
const PATCH_SIZE_MIN = 6
const PATCH_SIZE_MAX = 18
const RIVER_MAX_STEPS = 120

const BIOMES: BiomeType[] = ['forest', 'desert', 'beach', 'island']

const BIOME_BASE_TERRAIN: Record<BiomeType, TerrainType> = {
  forest: 'grass',
  desert: 'sand',
  beach: 'sand',
  island: 'grass',
}

const BIOME_PATCH_TERRAINS: Record<BiomeType, TerrainType[]> = {
  forest: ['dirt', 'sand'],
  desert: ['dirt'],
  beach: ['grass', 'dirt'],
  island: ['sand', 'dirt'],
}

const PASSABLE_TERRAIN: Record<TerrainType, boolean> = {
  grass: true,
  dirt: true,
  sand: true,
  water: false,
  wall: false,
}

function isPassable(terrain: TerrainType): boolean {
  return PASSABLE_TERRAIN[terrain]
}

function getCardinalNeighbors(row: number, col: number, rows: number, cols: number): EntityPosition[] {
  const candidates = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ]

  return candidates.filter(
    (candidate) =>
      candidate.row >= 0 &&
      candidate.col >= 0 &&
      candidate.row < rows &&
      candidate.col < cols,
  )
}

function randomInt(min: number, max: number): number {
  const minValue = Math.ceil(min)
  const maxValue = Math.floor(max)
  return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function pickWeighted<T>(entries: Array<{ value: T; weight: number }>): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  const roll = Math.random() * total
  let threshold = 0

  for (const entry of entries) {
    threshold += entry.weight
    if (roll <= threshold) {
      return entry.value
    }
  }

  return entries[entries.length - 1].value
}

function createBiomeSeeds(rows: number, cols: number): Array<{ type: BiomeType; row: number; col: number }> {
  const biomeCount = randomInt(2, 4)
  const selected = shuffle(BIOMES).slice(0, biomeCount)

  return selected.map((type) => ({
    type,
    row: randomInt(0, rows - 1),
    col: randomInt(0, cols - 1),
  }))
}

function assignBiomeMap(rows: number, cols: number, seeds: Array<{ type: BiomeType; row: number; col: number }>): BiomeType[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      let bestSeed = seeds[0]
      let bestDistance = Number.POSITIVE_INFINITY

      for (const seed of seeds) {
        const distance = Math.abs(seed.row - row) + Math.abs(seed.col - col)
        if (distance < bestDistance) {
          bestDistance = distance
          bestSeed = seed
        }
      }

      return bestSeed.type
    }),
  )
}

function createBaseTerrain(rows: number, cols: number, biomeMap: BiomeType[][]): TerrainType[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => BIOME_BASE_TERRAIN[biomeMap[row][col]]),
  )
}

function addBiomePatches(map: TerrainType[][], biomeMap: BiomeType[][]): void {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const biomeTiles: Record<BiomeType, EntityPosition[]> = {
    forest: [],
    desert: [],
    beach: [],
    island: [],
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      biomeTiles[biomeMap[row][col]].push({ row, col })
    }
  }

  for (const biome of BIOMES) {
    const tiles = biomeTiles[biome]
    if (tiles.length === 0) {
      continue
    }

    const patchCount = Math.max(1, Math.floor(tiles.length / 60))
    const patchTerrains = BIOME_PATCH_TERRAINS[biome]

    for (let patch = 0; patch < patchCount; patch += 1) {
      const terrain = patchTerrains[randomInt(0, patchTerrains.length - 1)]
      const size = randomInt(PATCH_SIZE_MIN, PATCH_SIZE_MAX)
      scatterPatch(map, biomeMap, biome, tiles, terrain, size)
    }
  }
}

function scatterPatch(
  map: TerrainType[][],
  biomeMap: BiomeType[][],
  biome: BiomeType,
  tiles: EntityPosition[],
  terrain: TerrainType,
  size: number,
): void {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  let current = tiles[randomInt(0, tiles.length - 1)]

  for (let step = 0; step < size; step += 1) {
    map[current.row][current.col] = terrain
    const neighbors = getCardinalNeighbors(current.row, current.col, rows, cols).filter(
      (candidate) => biomeMap[candidate.row][candidate.col] === biome,
    )

    if (neighbors.length === 0) {
      break
    }

    current = neighbors[randomInt(0, neighbors.length - 1)]
  }
}

function addWaterFeatures(map: TerrainType[][]): void {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const area = rows * cols
  const riverCount = Math.min(2, Math.floor(area / 220))
  const lakeCount = Math.max(1, Math.floor(area / 350))

  for (let index = 0; index < riverCount; index += 1) {
    carveRiver(map, rows, cols)
  }

  for (let index = 0; index < lakeCount; index += 1) {
    const center = { row: randomInt(1, rows - 2), col: randomInt(1, cols - 2) }
    const radius = randomInt(1, 3)
    carveLake(map, center, radius)
  }
}

function carveRiver(map: TerrainType[][], rows: number, cols: number): void {
  const startEdge = randomInt(0, 3)
  let row = 0
  let col = 0
  let target = { row: rows - 1, col: cols - 1 }

  if (startEdge === 0) {
    row = 0
    col = randomInt(0, cols - 1)
    target = { row: rows - 1, col }
  } else if (startEdge === 1) {
    row = rows - 1
    col = randomInt(0, cols - 1)
    target = { row: 0, col }
  } else if (startEdge === 2) {
    row = randomInt(0, rows - 1)
    col = 0
    target = { row, col: cols - 1 }
  } else {
    row = randomInt(0, rows - 1)
    col = cols - 1
    target = { row, col: 0 }
  }

  const maxSteps = Math.min(RIVER_MAX_STEPS, rows * cols)
  let steps = 0
  while (steps < maxSteps) {
    map[row][col] = 'water'
    if (Math.random() < 0.3) {
      const neighbors = getCardinalNeighbors(row, col, rows, cols)
      neighbors.forEach((neighbor) => {
        if (Math.random() < 0.35) {
          map[neighbor.row][neighbor.col] = 'water'
        }
      })
    }

    if (row === target.row && col === target.col) {
      break
    }

    const options = getCardinalNeighbors(row, col, rows, cols)
    const next = pickNextRiverStep(options, target)
    row = next.row
    col = next.col
    steps += 1
  }
}

function pickNextRiverStep(options: EntityPosition[], target: EntityPosition): EntityPosition {
  const scored = options.map((option) => ({
    option,
    distance: Math.abs(option.row - target.row) + Math.abs(option.col - target.col),
  }))

  if (Math.random() < 0.65) {
    const minDistance = Math.min(...scored.map((entry) => entry.distance))
    const best = scored.filter((entry) => entry.distance === minDistance)
    return best[randomInt(0, best.length - 1)].option
  }

  return pickWeighted(
    scored.map((entry) => ({ value: entry.option, weight: 1 / (entry.distance + 1) })),
  )
}

function carveLake(map: TerrainType[][], center: EntityPosition, radius: number): void {
  for (let row = center.row - radius; row <= center.row + radius; row += 1) {
    for (let col = center.col - radius; col <= center.col + radius; col += 1) {
      const distance = Math.abs(row - center.row) + Math.abs(col - center.col)
      if (distance <= radius && map[row]?.[col] !== undefined) {
        map[row][col] = 'water'
      }
    }
  }
}

function applyIslandRing(map: TerrainType[][], rows: number, cols: number): void {
  const ringThickness = randomInt(2, 4)
  const shoreThickness = 1

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const edgeDistance = Math.min(row, col, rows - 1 - row, cols - 1 - col)
      if (edgeDistance < ringThickness) {
        map[row][col] = 'water'
        continue
      }
      if (edgeDistance === ringThickness) {
        map[row][col] = 'sand'
        continue
      }
      if (edgeDistance === ringThickness + shoreThickness && map[row][col] === 'water') {
        map[row][col] = 'sand'
      }
    }
  }
}

function addWallClusters(map: TerrainType[][], rows: number, cols: number): void {
  const totalTiles = rows * cols
  const wallBudget = Math.max(6, Math.floor(totalTiles * 0.04))
  const clusterCount = Math.max(3, Math.floor(totalTiles / 250))
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ]

  let placed = 0

  for (let cluster = 0; cluster < clusterCount && placed < wallBudget; cluster += 1) {
    let row = randomInt(1, rows - 2)
    let col = randomInt(1, cols - 2)

    for (let length = 0; length < randomInt(4, 10) && placed < wallBudget; length += 1) {
      if (PASSABLE_TERRAIN[map[row][col]] && Math.random() < 0.85) {
        map[row][col] = 'wall'
        placed += 1
      }

      const direction = directions[randomInt(0, directions.length - 1)]
      row = Math.max(1, Math.min(rows - 2, row + direction.row))
      col = Math.max(1, Math.min(cols - 2, col + direction.col))
    }
  }
}

function generateTerrainMap(rows: number, cols: number): TerrainType[][] {
  const seeds = createBiomeSeeds(rows, cols)
  const biomeMap = assignBiomeMap(rows, cols, seeds)
  const map = createBaseTerrain(rows, cols, biomeMap)

  const hasIsland = seeds.some((seed) => seed.type === 'island')
  addBiomePatches(map, biomeMap)
  addWaterFeatures(map)
  if (hasIsland) {
    applyIslandRing(map, rows, cols)
  }

  addWallClusters(map, rows, cols)
  return map
}

function getPassableTiles(map: TerrainType[][]): EntityPosition[] {
  const positions: EntityPosition[] = []
  for (let row = 0; row < map.length; row += 1) {
    for (let col = 0; col < map[row].length; col += 1) {
      if (isPassable(map[row][col])) {
        positions.push({ row, col })
      }
    }
  }
  return positions
}

function getPassableNeighborCount(map: TerrainType[][], position: EntityPosition): number {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const neighbors = getCardinalNeighbors(position.row, position.col, rows, cols)
  return neighbors.filter((neighbor) => isPassable(map[neighbor.row][neighbor.col])).length
}

function getPassableRegions(map: TerrainType[][]): EntityPosition[][] {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false))
  const regions: EntityPosition[][] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (visited[row][col] || !isPassable(map[row][col])) {
        continue
      }

      const region: EntityPosition[] = []
      const queue: EntityPosition[] = [{ row, col }]
      visited[row][col] = true

      while (queue.length > 0) {
        const current = queue.shift()
        if (!current) {
          continue
        }

        region.push(current)
        const neighbors = getCardinalNeighbors(current.row, current.col, rows, cols)
        for (const neighbor of neighbors) {
          if (visited[neighbor.row][neighbor.col]) {
            continue
          }
          if (!isPassable(map[neighbor.row][neighbor.col])) {
            continue
          }
          visited[neighbor.row][neighbor.col] = true
          queue.push(neighbor)
        }
      }

      regions.push(region)
    }
  }

  regions.sort((a, b) => b.length - a.length)
  return regions
}

function selectPlayerSpawn(tiles: EntityPosition[], map: TerrainType[][]): EntityPosition {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const centerRow = Math.floor(rows / 2)
  const centerCol = Math.floor(cols / 2)
  const candidates = tiles.filter(
    (tile) => getPassableNeighborCount(map, tile) >= MIN_PLAYER_NEIGHBORS,
  )
  const pool = candidates.length > 0 ? candidates : tiles
  let best = pool[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const tile of pool) {
    const distance = Math.abs(tile.row - centerRow) + Math.abs(tile.col - centerCol)
    if (distance < bestDistance) {
      bestDistance = distance
      best = tile
    }
  }

  return best
}

function selectEnemySpawns(
  tiles: EntityPosition[],
  player: EntityPosition,
  count: number,
  map: TerrainType[][],
): EntityPosition[] {
  const selected: EntityPosition[] = []
  let minDistance = 4
  const viableTiles = tiles.filter(
    (tile) => getPassableNeighborCount(map, tile) >= MIN_ENEMY_NEIGHBORS,
  )
  const pool = viableTiles.length > 0 ? [...viableTiles] : [...tiles]

  while (selected.length < count && pool.length > 0) {
    const candidates = pool.filter(
      (tile) => Math.abs(tile.row - player.row) + Math.abs(tile.col - player.col) >= minDistance,
    )

    if (candidates.length === 0) {
      if (minDistance > 1) {
        minDistance -= 1
        continue
      }

      const fallback = pool[randomInt(0, pool.length - 1)]
      selected.push(fallback)
      pool.splice(pool.indexOf(fallback), 1)
      continue
    }

    const index = randomInt(0, candidates.length - 1)
    const choice = candidates[index]
    selected.push(choice)
    pool.splice(pool.indexOf(choice), 1)
  }

  return selected
}

function buildEntities(map: TerrainType[][], regionTiles: EntityPosition[]): InitialEntityData[] {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const passableTiles = regionTiles

  if (passableTiles.length === 0) {
    return []
  }

  const playerSpawn = selectPlayerSpawn(passableTiles, map)
  const player: InitialEntityData = {
    id: 'player-1',
    type: 'player',
    position: playerSpawn,
    health: 8,
    maxHealth: 8,
  }

  const desiredEnemies = Math.max(
    MIN_ENEMIES,
    Math.min(MAX_ENEMIES, Math.floor((rows * cols) / 140)),
  )
  const enemyCount = Math.min(desiredEnemies, Math.max(0, passableTiles.length - 1))
  const availableForEnemies = passableTiles.filter(
    (tile) => !(tile.row === playerSpawn.row && tile.col === playerSpawn.col),
  )
  const enemySpawns = selectEnemySpawns(availableForEnemies, playerSpawn, enemyCount, map)

  const enemies = enemySpawns.map((spawn, index) => {
    const health = randomInt(2, 4)
    return {
      id: `enemy-${index + 1}`,
      type: 'enemy',
      position: spawn,
      health,
      maxHealth: health,
    }
  })

  return [player, ...enemies]
}

function generateGameData(): { map: TerrainType[][]; entities: InitialEntityData[] } {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rows = randomInt(MIN_MAP_SIZE, MAX_MAP_SIZE)
    const cols = randomInt(MIN_MAP_SIZE, MAX_MAP_SIZE)
    const map = generateTerrainMap(rows, cols)
    const passableTiles = getPassableTiles(map)

    if (passableTiles.length < MIN_ENEMIES + 1) {
      continue
    }

    const regions = getPassableRegions(map)
    if (regions.length === 0) {
      continue
    }

    const largestRegion = regions[0]
    const meetsSize = largestRegion.length >= MIN_REGION_TILES
    const meetsShare = largestRegion.length >= passableTiles.length * MIN_REGION_SHARE

    if (!meetsSize || !meetsShare) {
      continue
    }

    const entities = buildEntities(map, largestRegion)
    if (entities.length >= MIN_ENEMIES + 1) {
      return { map, entities }
    }
  }

  const fallbackMap = generateTerrainMap(MIN_MAP_SIZE, MIN_MAP_SIZE)
  const fallbackRegions = getPassableRegions(fallbackMap)
  const fallbackRegion = fallbackRegions[0] ?? getPassableTiles(fallbackMap)
  return { map: fallbackMap, entities: buildEntities(fallbackMap, fallbackRegion) }
}

const generated = generateGameData()

export const MAP_TERRAIN: TerrainType[][] = generated.map
export const INITIAL_ENTITIES: InitialEntityData[] = generated.entities
