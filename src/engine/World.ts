import { IWorld, TerrainType, Tile } from '../types'

const DEFAULT_TERRAIN: TerrainType = 'grass'

const PASSABLE_TERRAIN: Record<TerrainType, boolean> = {
  grass: true,
  dirt: true,
  sand: true,
  water: false,
  wall: false,
}

// The World owns tile data and offers spatial queries, with no rendering knowledge.
export class World implements IWorld {
  private tiles: Tile[][]

  // Pre-allocates the grid so lookups are fast and deterministic.
  constructor(public readonly rows: number, public readonly cols: number) {
    this.tiles = this.createTiles(rows, cols)
  }

  // Safely return a tile or null for out-of-bounds access.
  getTile(row: number, col: number): Tile | null {
    if (!this.isInBounds(row, col)) {
      return null
    }

    return this.tiles[row][col]
  }

  // Cardinal neighbors only, keeping movement logic simple.
  getAdjacentTiles(row: number, col: number): Tile[] {
    const neighbors: Array<[number, number]> = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ]

    return neighbors
      .map(([r, c]) => this.getTile(r, c))
      .filter((tile): tile is Tile => Boolean(tile))
  }

  // Manhattan range query for basic area-of-effect or visibility checks.
  getTilesInRange(row: number, col: number, range: number): Tile[] {
    const tiles: Tile[] = []

    for (let r = row - range; r <= row + range; r += 1) {
      for (let c = col - range; c <= col + range; c += 1) {
        const distance = Math.abs(row - r) + Math.abs(col - c)
        if (distance > range) {
          continue
        }

        const tile = this.getTile(r, c)
        if (tile) {
          tiles.push(tile)
        }
      }
    }

    return tiles
  }

  // Overwrite a tile's terrain while keeping passability in sync.
  setTerrain(row: number, col: number, terrain: TerrainType): void {
    if (!this.isInBounds(row, col)) {
      return
    }

    this.tiles[row][col] = {
      row,
      col,
      terrain,
      passable: PASSABLE_TERRAIN[terrain],
    }
  }

  // Load a terrain map, clamping to the world size instead of throwing.
  loadMap(map: TerrainType[][]): void {
    this.tiles = this.createTiles(this.rows, this.cols)

    map.forEach((rowData, rowIndex) => {
      if (rowIndex >= this.rows) {
        return
      }
      rowData.forEach((terrain, colIndex) => {
        if (colIndex >= this.cols) {
          return
        }
        this.setTerrain(rowIndex, colIndex, terrain)
      })
    })
  }

  // Initialize tiles with default terrain to avoid undefined access.
  private createTiles(rows: number, cols: number): Tile[][] {
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: cols }, (_, colIndex) => ({
        row: rowIndex,
        col: colIndex,
        terrain: DEFAULT_TERRAIN,
        passable: PASSABLE_TERRAIN[DEFAULT_TERRAIN],
      })),
    )
  }

  // Central bounds check used by all public queries.
  private isInBounds(row: number, col: number): boolean {
    return row >= 0 && col >= 0 && row < this.rows && col < this.cols
  }
}
