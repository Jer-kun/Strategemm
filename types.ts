export type Player = 'player1' | 'player2';

export enum UnitType {
  TROOPER = 'TROOPER',
  ELITE_TROOPER = 'ELITE_TROOPER',
  GHILLIE_RECON = 'GHILLIE_RECON',
  COMMANDER = 'COMMANDER',
  APC = 'APC',
  HOWITZER = 'HOWITZER',
  IFV = 'IFV',
  MORTAR = 'MORTAR',
  FIELD_GUN = 'FIELD_GUN',
  MBT = 'MBT',
  ROCKET_ARTILLERY = 'ROCKET_ARTILLERY'
}

export enum UnitCategory {
  INFANTRY = 'INFANTRY',
  PANZER = 'PANZER',
  ARTILLERY = 'ARTILLERY'
}

export enum ObstacleType {
  TRENCH = 'TRENCH',
  LAND_MINE = 'LAND_MINE',
  BARBED_WIRE = 'BARBED_WIRE',
  FLAG = 'FLAG',
  TANK_TRAP = 'TANK_TRAP'
}

export interface Unit {
  id: string;
  type: UnitType;
  category: UnitCategory;
  player: Player;
  range: number;
  movement: number;
  isCamouflaged?: boolean;
  isImmobilized?: boolean;
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  player: Player;
  isHidden: boolean;
  isTriggered: boolean;
}

export interface Cell {
  x: number;
  y: number;
  unit: Unit | null;
  obstacle: Obstacle | null;
  zone: 'territory' | 'frontier' | 'supply_line';
}

export type GamePhase = 'menu' | 'placement' | 'battle';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type PlacementSubPhase = 'obstacles' | 'units';

export interface HistoryItem {
  text: string;
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'white';
}

export interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  actionsRemaining: number;
  winner: Player | null;
  history: HistoryItem[];
  selectedCell: { x: number; y: number } | null;
  turn: number;
  phase: GamePhase;
  placementSubPhase: PlacementSubPhase;
  placementCounts: {
    [key in Player]: {
      [key in ObstacleType]: number;
    }
  };
  unitPlacementCounts: {
    [key in Player]: {
      [key in UnitType]?: number;
    }
  };
  selectedObstacleType: ObstacleType | null;
  selectedUnitType: UnitType | null;
  flippedTiles: { x: number; y: number }[];
  interactionMode: 'normal' | 'elimination' | 'reveal' | 'mobility';
  freeRevealsRemaining: number;
  commanderSupplyActions: {
    [key in Player]: number;
  };
  flagOccupiedActions: {
    [key in Player]: number;
  };
  randomizationUsed?: {
    obstacles: boolean;
    units: boolean;
  };
  showPlacementConfirm?: boolean;
  isSinglePlayer: boolean;
  playerSide: Player;
  botDifficulty: BotDifficulty | null;
}
