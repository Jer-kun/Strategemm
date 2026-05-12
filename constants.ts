import { UnitType, ObstacleType, UnitCategory } from './types';

export const BOARD_SIZE = 15;

export const UNIT_STATS = {
  [UnitType.TROOPER]: {
    category: UnitCategory.INFANTRY,
    range: 1,
    movement: 1,
    count: 7
  },
  [UnitType.ELITE_TROOPER]: {
    category: UnitCategory.INFANTRY,
    range: 1,
    movement: 1,
    count: 4
  },
  [UnitType.GHILLIE_RECON]: {
    category: UnitCategory.INFANTRY,
    range: 1,
    movement: 1,
    count: 2,
    isCamouflaged: true
  },
  [UnitType.COMMANDER]: {
    category: UnitCategory.INFANTRY,
    range: 1,
    movement: 1,
    count: 1
  },
  [UnitType.APC]: {
    category: UnitCategory.PANZER,
    range: 1,
    movement: 3, // mobility is a free choice of 1, 2, and 3 tiles
    count: 3
  },
  [UnitType.HOWITZER]: {
    category: UnitCategory.ARTILLERY,
    range: 2, // Choice of 1 or 2 (linear)
    movement: 1,
    count: 2
  },
  [UnitType.IFV]: {
    category: UnitCategory.PANZER,
    range: 2, // Choice of 1 or 2
    movement: 2, // Choice of 1 or 2
    count: 3
  },
  [UnitType.MORTAR]: {
    category: UnitCategory.ARTILLERY,
    range: 2,
    movement: 1,
    count: 2
  },
  [UnitType.FIELD_GUN]: {
    category: UnitCategory.ARTILLERY,
    range: 3, // High arc
    movement: 1,
    count: 2
  },
  [UnitType.MBT]: {
    category: UnitCategory.PANZER,
    range: 2,
    movement: 2,
    count: 2
  },
  [UnitType.ROCKET_ARTILLERY]: {
    category: UnitCategory.ARTILLERY,
    range: 3, // Logic will handle the "2 and 3" requirement
    movement: 2,
    count: 2
  }
};

export const OBSTACLE_STATS = {
  [ObstacleType.TRENCH]: { description: 'Defensive cover, protects infantry from range elimination.' },
  [ObstacleType.LAND_MINE]: { description: 'Explodes when stepped on, eliminates any unit.' },
  [ObstacleType.BARBED_WIRE]: { description: 'Immobilizes infantry and artillery.' },
  [ObstacleType.TANK_TRAP]: { description: 'Immobilizes panzer units.' },
  [ObstacleType.FLAG]: { description: 'Capture to win.' }
};
