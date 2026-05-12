/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Sword, 
  Move, 
  Flag, 
  Target, 
  Info, 
  Trophy, 
  RotateCcw,
  Zap,
  AlertTriangle,
  ChevronRight,
  User,
  Cpu,
  Eye,
  Crosshair,
  ArrowRight,
  Radar,
  Star,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Player, 
  UnitType, 
  ObstacleType, 
  Unit, 
  Obstacle, 
  Cell, 
  GameState,
  UnitCategory,
  HistoryItem,
  BotDifficulty
} from './types';
import { BOARD_SIZE, UNIT_STATS } from './constants';

const INITIAL_ACTIONS = 2;

const INITIAL_OBSTACLE_COUNTS = {
  [ObstacleType.TRENCH]: 5,
  [ObstacleType.BARBED_WIRE]: 5,
  [ObstacleType.LAND_MINE]: 5,
  [ObstacleType.TANK_TRAP]: 5,
  [ObstacleType.FLAG]: 1
};

const INITIAL_UNIT_COUNTS = {
  [UnitType.TROOPER]: 7,
  [UnitType.ELITE_TROOPER]: 4,
  [UnitType.GHILLIE_RECON]: 2,
  [UnitType.COMMANDER]: 1,
  [UnitType.APC]: 3,
  [UnitType.HOWITZER]: 2,
  [UnitType.IFV]: 3,
  [UnitType.MORTAR]: 2,
  [UnitType.FIELD_GUN]: 2,
  [UnitType.MBT]: 2,
  [UnitType.ROCKET_ARTILLERY]: 2
};

const UNIT_LABELS: Record<string, string> = {
  [UnitType.TROOPER]: 'Trooper',
  [UnitType.ELITE_TROOPER]: 'Elite Trooper',
  [UnitType.GHILLIE_RECON]: 'Ghillie Recon',
  [UnitType.COMMANDER]: 'Commander',
  [UnitType.APC]: 'APC',
  [UnitType.HOWITZER]: 'Field Gun',
  [UnitType.IFV]: 'IFV',
  [UnitType.MORTAR]: 'Mortar',
  [UnitType.FIELD_GUN]: 'Howitzer',
  [UnitType.MBT]: 'MBT',
  [UnitType.ROCKET_ARTILLERY]: 'Mobile Rocket',
  [ObstacleType.TRENCH]: 'Trench',
  [ObstacleType.BARBED_WIRE]: 'Barbed Wire',
  [ObstacleType.LAND_MINE]: 'Landmine',
  [ObstacleType.TANK_TRAP]: 'Tank Trap',
  [ObstacleType.FLAG]: 'Flag'
};

const getUnitShapeStyle = (unit: Unit) => {
  if (unit.category === UnitCategory.PANZER) {
    // Octagon style: slanted corners (Point 2)
    return {
      clipPath: 'polygon(15% 0, 85% 0, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0 85%, 0 15%)'
    };
  }
  
  if (unit.category === UnitCategory.INFANTRY) {
    if (unit.type === UnitType.TROOPER) {
      // Basic Infantry: Rounded Square (Point 1)
      return { borderRadius: '6px' };
    }
    // Special Infantry (Elite, Ghillie, Commander): Hybrid (Point 3)
    // Slanted TL/BR, Rounded BL (simulated in polygon)
    return {
      clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 5% 100%, 2% 98%, 0 95%, 0 15%)'
    };
  }

  if (unit.category === UnitCategory.ARTILLERY) {
    // Artillery: Different roundedness or maybe a circle?
    // Let's use more rounded corners to differentiate from Trooper
    return { borderRadius: '12px' };
  }

  return { borderRadius: '4px' };
};

const IFVIcon = ({ size, className = "" }: { size?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Caterpillar Tracks */}
    <path d="M2 17.5 H20 V20 C20 21 19 21.5 18 21.5 H4 C3 21.5 2 21 2 20 Z" />
    {/* Body - Trapezoid same as APC */}
    <path d="M2 11 V17 H20 L17 11 Z" />
    {/* Head/Turret - same as APC */}
    <path d="M5 11 V9 L7 7 H11 L13 9 V11 Z" />
    {/* Cannon - 1px thicker and 15% longer than APC */}
    <path d="M13 9 H20.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);


const MortarIcon = ({ size = 24, className = "" }: { size?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Base plate */}
    <rect x="6" y="18" width="12" height="3" rx="1" />
    {/* Support legs */}
    <path d="M8 18 L10 13 M16 18 L14 13" stroke="currentColor" strokeWidth="1.5" />
    {/* Mortar tube - high angle */}
    <path d="M10 13 L15 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Tube detail */}
    <circle cx="15" cy="5" r="1.5" />
  </svg>
);

const FieldGunIcon = ({ size = 24, className = "" }: { size?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Steep-angled heavy barrel */}
    <path d="M8 18 L18 4" strokeWidth="2.5" />
    {/* Muzzle Brake detail */}
    <path d="M17 3 L19 5" strokeWidth="3" />
    {/* Main body / mechanical breech area */}
    <rect x="6" y="14" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    <path d="M9 15 L14 8" strokeWidth="1" opacity="0.6" />
    {/* Spaced stabilizer legs for that heavy artillery look */}
    <path d="M7 18 L2 21" strokeWidth="2" />
    <path d="M11 18 L18 21" strokeWidth="2" />
    {/* Foot pads for the legs */}
    <path d="M1 21 H4" strokeWidth="1.5" />
    <path d="M17 21 H21" strokeWidth="1.5" />
    {/* Center mechanical hub / small wheel */}
    <circle cx="9" cy="18.5" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18.5" r="0.8" fill="white" stroke="none" />
  </svg>
);

const MBTIcon = ({ size = 24, className = "" }: { size?: number | string; className?: string }) => {
  const maskId = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" />
          {/* Thinner dashed line to create the "cutout" effect as seen in the user's reference image */}
          <line x1="2" y1="18.5" x2="22" y2="18.5" stroke="black" strokeWidth="1.2" strokeDasharray="3 1.5" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {/* Heavy low-profile chassis */}
        <path d="M2 14.2 H22 V19.2 C22 20.2 21 21 20 21 H4 C3 21 2 20.2 2 19.2 Z" />
        {/* Angular Abrams-style turret - Shifted Left */}
        <path d="M3.2 14.2 L5.2 10.2 H15.2 L17.2 14.2 Z" />
        {/* Long powerful smoothbore gun - Extra Length & Shifted Left */}
        <path d="M15.2 11.8 H23.8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        {/* Muzzle brake detail */}
        <path d="M23.3 10.5 V13.1" stroke="currentColor" strokeWidth="1.6" />
        {/* Turret details */}
        <path d="M13.2 10.2 L14.2 8.2 H16.2 L17.2 10.2" stroke="currentColor" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  );
};

const RocketArtilleryIcon = ({ size = 24, className = "" }: { size?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Chassis - body and cab */}
    <rect x="2" y="14" width="14" height="3" rx="0.5" />
    <path d="M16 14 H22 V18 H16 Z" /> {/* Cab base */}
    <path d="M16 11 H20 L22 14 H16 Z" /> {/* Cab top/windshield */}

    {/* Rocket Pod - Left side slanted */}
    <g transform="rotate(-25 8 14)">
      <rect x="2" y="8" width="14" height="6" rx="1" />
      <line x1="2" y1="10" x2="16" y2="10" stroke="black" strokeWidth="0.5" opacity="0.3" />
      <line x1="2" y1="12" x2="16" y2="12" stroke="black" strokeWidth="0.5" opacity="0.3" />
      <line x1="2" y1="14" x2="16" y2="14" stroke="black" strokeWidth="0.5" opacity="0.3" />
    </g>

    {/* Wheels - Gray circles poking out below the body line (y=17/18) */}
    {/* Sticking together "••" in the rear (left), one in front (right) */}
    <circle cx="5" cy="18.5" r="2.2" fill="#6B7280" />
    <circle cx="8.5" cy="18.5" r="2.2" fill="#6B7280" />
    <circle cx="19" cy="18.5" r="2.2" fill="#6B7280" />
  </svg>
);

const LandmineIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bottom Oval - Cropped for 3D pancake effect */}
    <path 
      d="M4 14C4 11 28 11 28 14V17C28 20 4 20 4 17V14Z" 
      fill="#064E3B" 
    />
    {/* Top Oval */}
    <ellipse cx="16" cy="14" rx="12" ry="4" fill="#065F46" />
    {/* Small Red Oval (Pressure Plate) */}
    <ellipse cx="16" cy="13.5" rx="4" ry="1.5" fill="#EF4444" />
  </svg>
);

const BarbedWireIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Three horizontal core wires */}
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 6H31" />
      <path d="M1 12H31" />
      <path d="M1 18H31" />
    </g>
    
    {/* Spring wire looping around the horizontal ones */}
    <path 
      d="M1 12 C 4 2, 8 22, 12 12 C 16 2, 20 22, 24 12 C 28 2, 32 22, 35 12" 
      stroke="white" 
      strokeWidth="1" 
      strokeLinecap="round" 
      fill="none"
      opacity="0.6"
    />

    {/* Spikes (X shapes) on each line - Black color and 5 per line */}
    <g stroke="black" strokeWidth="1.2" strokeLinecap="round">
      {/* Line 1 Spikes */}
      <path d="M2 5L4 7M4 5L2 7" />
      <path d="M8 5L10 7M10 5L8 7" />
      <path d="M15 5L17 7M17 5L15 7" />
      <path d="M22 5L24 7M24 5L22 7" />
      <path d="M28 5L30 7M30 5L28 7" />
      
      {/* Line 2 Spikes */}
      <path d="M3 11L5 13M5 11L3 13" />
      <path d="M9 11L11 13M11 11L9 13" />
      <path d="M16 11L18 13M18 11L16 13" />
      <path d="M23 11L25 13M25 11L23 13" />
      <path d="M27 11L29 13M29 11L27 13" />
      
      {/* Line 3 Spikes */}
      <path d="M2 17L4 19M4 17L2 19" />
      <path d="M8 17L10 19M10 17L8 19" />
      <path d="M15 17L17 19M17 17L15 19" />
      <path d="M22 17L24 19M24 17L22 19" />
      <path d="M28 17L30 19M30 17L28 19" />
    </g>
  </svg>
);

const TrenchIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Main Trench Walls - increased vertical spacing (y: 6 and 18) */}
    <path d="M1 6H31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M1 18H31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Denser Diagonal Pattern Fill */}
    <g stroke="#581C87" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
      <path d="M4 6L2 18" />
      <path d="M8 6L6 18" />
      <path d="M12 6L10 18" />
      <path d="M16 6L14 18" />
      <path d="M20 6L18 18" />
      <path d="M24 6L22 18" />
      <path d="M28 6L26 18" />
      <path d="M31 6L29 18" />
    </g>
  </svg>
);

const TankTrapIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bottom Bar: 120 degrees */}
    <rect 
      x="14.5" y="2" width="3" height="28" rx="1" 
      fill="#334155" 
      transform="rotate(120 16 16)" 
    />
    <rect 
      x="14" y="2" width="3" height="28" rx="1" 
      fill="#475569" 
      transform="rotate(120 16 16)" 
    />
    
    {/* Middle Bar: 60 degrees */}
    <rect 
      x="14.5" y="2" width="3" height="28" rx="1" 
      fill="#475569" 
      transform="rotate(60 16 16)" 
    />
    <rect 
      x="14" y="2" width="3" height="28" rx="1" 
      fill="#64748B" 
      transform="rotate(60 16 16)" 
    />
    
    {/* Top Bar: 0 degrees */}
    <rect 
      x="14.5" y="2" width="3" height="28" rx="1" 
      fill="#64748B" 
    />
    <rect 
      x="14" y="2" width="3" height="28" rx="1" 
      fill="#94A3B8" 
    />
  </svg>
);


const checkActionValidity = (
  attacker: Unit,
  attackerPos: { x: number; y: number },
  targetCell: Cell,
  board: Cell[][],
  mode: 'elimination' | 'mobility'
): { valid: boolean; reason?: string } => {
  const dx = Math.abs(targetCell.x - attackerPos.x);
  const dy = Math.abs(targetCell.y - attackerPos.y);
  const dist = dx + dy;
  const isOrthogonal = dx === 0 || dy === 0;

  if (mode === 'elimination') {
    let inRange = false;
    if (attacker.type === UnitType.MORTAR) inRange = dist === 2 && isOrthogonal;
    else if (attacker.type === UnitType.FIELD_GUN) inRange = dist === 3 && isOrthogonal;
    else if (attacker.type === UnitType.ROCKET_ARTILLERY) inRange = (dist === 2 || dist === 3) && isOrthogonal;
    else if (attacker.range > 1) inRange = dist <= attacker.range && isOrthogonal;
    else inRange = dist === 1;

    if (!inRange) return { valid: false, reason: 'Out of range.' };
    if (!targetCell.unit) return { valid: false, reason: 'No unit to target.' };
    if (targetCell.unit.player === attacker.player) return { valid: false, reason: 'Cannot hit friendly units.' };

    // Trench protection
    const isTrenchProtected = (targetCell.unit.category === UnitCategory.INFANTRY || targetCell.unit.type === UnitType.MORTAR) && 
                              targetCell.obstacle && targetCell.obstacle.type === ObstacleType.TRENCH && !targetCell.obstacle.isHidden;
    if (isTrenchProtected && attacker.type !== UnitType.MORTAR && attacker.type !== UnitType.FIELD_GUN && attacker.type !== UnitType.ROCKET_ARTILLERY) {
      return { valid: false, reason: 'Target protected by Trench.' };
    }

    // Ghillie Recon Immunity
    const attackerInTerritory = board[attackerPos.y][attackerPos.x].zone !== 'frontier';
    const isHeavyArty = attacker.type === UnitType.FIELD_GUN || 
                       attacker.type === UnitType.ROCKET_ARTILLERY || 
                       (attacker.type === UnitType.HOWITZER && attackerInTerritory);
    if (targetCell.unit.type === UnitType.GHILLIE_RECON && targetCell.zone === 'frontier' && !isHeavyArty) {
      return { valid: false, reason: 'Ghillie hidden in frontier.' };
    }

    // MBT Immunity
    if (targetCell.unit.type === UnitType.MBT) {
      const canHitMBT = isHeavyArty || attacker.type === UnitType.MBT;
      if (!canHitMBT) return { valid: false, reason: `Only MBTs, Howitzers (in territory), Field Guns, and Rockets can hit an MBT.` };
    }

    // Infantry vs Panzer
    const isInfantryVsPanzer = attacker.category === UnitCategory.INFANTRY && targetCell.unit.category === UnitCategory.PANZER;
    const isSpecInfantry = attacker.type === UnitType.ELITE_TROOPER || attacker.type === UnitType.COMMANDER;
    if (isInfantryVsPanzer && !isSpecInfantry) return { valid: false, reason: 'Standard Infantry cannot damage vehicles.' };

    return { valid: true };
  } else if (mode === 'mobility') {
    const maxMob = (attacker.type === UnitType.TROOPER && board[attackerPos.y][attackerPos.x].zone === 'frontier') ? 2 : attacker.movement;
    if (attacker.isImmobilized || dist === 0 || dist > maxMob || !isOrthogonal) return { valid: false };

    // Movement validation is now more about the range and potential impact.
    // Path-based truncation is handled in the execution handler.
    // We check the very first step; if it is blocked by a friendly unit, the move is invalid.
    const dx = Math.abs(targetCell.x - attackerPos.x);
    const dy = Math.abs(targetCell.y - attackerPos.y);
    const stepX = dx === 0 ? 0 : (targetCell.x > attackerPos.x ? 1 : -1);
    const stepY = dy === 0 ? 0 : (targetCell.y > attackerPos.y ? 1 : -1);
    const firstX = attackerPos.x + stepX;
    const firstY = attackerPos.y + stepY;
    const firstStepCell = board[firstY][firstX];
    
    if (firstStepCell.unit && firstStepCell.unit.player === attacker.player) {
       return { valid: false, reason: 'Path immediately blocked by allied unit.' };
    }

    return { valid: true };
  }

  return { valid: false };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [hoveredInstruction, setHoveredInstruction] = useState<string | null>(null);

  const WIN_CONDITIONS = [
    "Eliminate all opponent's forces to win",
    "Occupy enemy flag for 1 action countdown to win",
    "Commander must occupy enemy supply line for 1 action countdown to win",
    "Last Stand: 3 base actions if you have ≤ 10 units left",
    "Efficiency: Gain +1 action if opponent ends turn early"
  ];

  const UNIT_INTEL: Record<string, string> = {
    [UnitType.TROOPER]: "Basic infantry. 1 Range. Can move 2 cells in frontier zone. Vulnerable to all fire.",
    [UnitType.ELITE_TROOPER]: "Special Ops. 1 Range. Can eliminate Panzers in proximity. Immune to Landmines.",
    [UnitType.GHILLIE_RECON]: "Ghost unit. Camouflaged. Reveals adjacent hidden obstacles passively. Grants 2 FREE REVEALS if eliminated.",
    [UnitType.COMMANDER]: "High Value Target. 1 Range. Can eliminate Panzers. Occupying enemy supply line for 1 action countdown wins the game! Grants +2 Actions if eliminated.",
    [UnitType.MBT]: "Main Battle Tank. Massive armor. Can eliminate any target. Only vulnerable to MBT, Mobile Rocket, Howitzer, and Field Gun (only if in own territory). Placement: Supply Line only.",
    [UnitType.APC]: "Armored Personnel Carrier. High mobility. Transports no units (in this version) but acts as a fast scout. Cannot leap over units or enemy obstacles; automatically stops and enters the first enemy obstacle or unit it hits.",
    [UnitType.IFV]: "Infantry Fighting Vehicle. Fast and armed. 2 Range. Efficient against infantry.",
    [UnitType.HOWITZER]: "Field Gun. 2 Range (linear). Can eliminate any unit only if stationed on player’s own territory zone. Vulnerable to land mines and barbed wire.",
    [UnitType.MORTAR]: "High Arc fire. 2 Range (fixed). Bypasses Trench protection. Efficient against entrenched infantry.",
    [UnitType.ROCKET_ARTILLERY]: "Mobile Rocket Artillery. Hits 2 & 3 Range simultaneously (High Arc). Can eliminate any target and bypasses Trench protection. Immune to standard Trooper fire. Explodes if crashed into by Panzers! Vulnerable to Tank Traps. Placement: Supply Line only. Cannot leap over units or enemy obstacles.",
    [UnitType.FIELD_GUN]: "Howitzer. 3 Range (high arc). Can eliminate any target and bypasses Trench protection. Cannot leap over units or enemy obstacles.",
    [ObstacleType.TRENCH]: "Trench: Defensive fortification. Protects Infantry and Mortars from direct ranged fire. (Mortar, Howitzer, and Mobile Rocket Artillery fire bypasses this protection).",
    [ObstacleType.BARBED_WIRE]: "Barbed Wire: Enemy Infantry and Artillery stepping here become Immobilized.",
    [ObstacleType.LAND_MINE]: "Landmine: Explodes when an enemy unit (except Elite Troopers) moves onto it, eliminating the unit.",
    [ObstacleType.TANK_TRAP]: "Tank Trap: Heavy anti-tank obstacle. Immobilizes enemy Panzers (APC, IFV, MBT) and Mobile Rocket Artillery units moving onto it. Blocks pathing for enemy units attempting to move past it.",
    [ObstacleType.FLAG]: "Strategic Flag: Occupy the enemy flag for 1 action countdown to win the game! Blocks pathing for enemy units attempting to move past it.",
    "mobility": "MOBILITY MODE: Move your units across the battlefield. Units stop and enter the first enemy unit/obstacle hit. Crashing into unarmored units eliminates them. Panzers stay operational after crushing unarmored targets.",
    "elimination": "ELIMINATION MODE: Use your unit's ranged fire to destroy enemy forces from a distance.",
    "reveal": "REVEAL MODE: Tactical search. Flip two matching enemy obstacles to reveal them permanently.",
    "ability": "TACTICAL REVEAL: Special Ghillie Recon ability. Reveals a single adjacent obstacle instantly."
  };

  const [defaultInstructionIndex, setDefaultInstructionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDefaultInstructionIndex((prev) => (prev + 1) % WIN_CONDITIONS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [WIN_CONDITIONS.length]);

  const defaultInstruction = WIN_CONDITIONS[defaultInstructionIndex];

  const playBellPing = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }, []);

  const createInitialBoard = () => {
    const board: Cell[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const dy = Math.abs(y - 7);
        let zone: 'territory' | 'frontier' | 'supply_line' = 'frontier';
        
        if (dy === 7) zone = 'supply_line';
        else if (dy >= 3 && dy <= 6) zone = 'territory';
        else zone = 'frontier';

        row.push({ x, y, unit: null, obstacle: null, zone });
      }
      board.push(row);
    }
    return board;
  };

  const initializeGame = useCallback(() => {
    setGameState({
      board: createInitialBoard(),
      currentPlayer: 'player1',
      actionsRemaining: INITIAL_ACTIONS,
      winner: null,
      history: [{ text: 'Placement Phase: Player 1 (Red Attacker), deploy your obstacles.', color: 'white' }],
      selectedCell: null,
      turn: 1,
      phase: 'menu',
      placementSubPhase: 'obstacles',
      isSinglePlayer: false,
      playerSide: 'player1',
      botDifficulty: null,
      placementCounts: {
        player1: { ...INITIAL_OBSTACLE_COUNTS },
        player2: { ...INITIAL_OBSTACLE_COUNTS }
      },
      unitPlacementCounts: {
        player1: { ...INITIAL_UNIT_COUNTS },
        player2: { ...INITIAL_UNIT_COUNTS }
      },
      selectedObstacleType: null,
      selectedUnitType: null,
      flippedTiles: [],
      interactionMode: 'normal',
      freeRevealsRemaining: 0,
      commanderSupplyActions: {
        player1: 0,
        player2: 0
      },
      flagOccupiedActions: {
        player1: 0,
        player2: 0
      },
      randomizationUsed: {
        obstacles: false,
        units: false
      },
      showPlacementConfirm: false
    });
  }, []);

  const startGame = (isSinglePlayer: boolean, side: Player = 'player1', difficulty: BotDifficulty | null = null) => {
    const initialState: GameState = {
      board: createInitialBoard(),
      currentPlayer: 'player1',
      actionsRemaining: INITIAL_ACTIONS,
      winner: null,
      history: [{ text: 'Mission Start: Deployment Phase.', color: 'white' }],
      selectedCell: null,
      turn: 1,
      phase: 'placement',
      placementSubPhase: 'obstacles',
      isSinglePlayer,
      playerSide: side,
      botDifficulty: difficulty,
      placementCounts: {
        player1: { ...INITIAL_OBSTACLE_COUNTS },
        player2: { ...INITIAL_OBSTACLE_COUNTS }
      },
      unitPlacementCounts: {
        player1: { ...INITIAL_UNIT_COUNTS },
        player2: { ...INITIAL_UNIT_COUNTS }
      },
      selectedObstacleType: null,
      selectedUnitType: null,
      flippedTiles: [],
      interactionMode: 'normal',
      freeRevealsRemaining: 0,
      commanderSupplyActions: { player1: 0, player2: 0 },
      flagOccupiedActions: { player1: 0, player2: 0 },
      randomizationUsed: {
        obstacles: false,
        units: false
      },
      showPlacementConfirm: false
    };

    if (isSinglePlayer && side === 'player2') {
      // If player is Blue, Red (Bot) starts first
      initialState.history.unshift({ text: 'Bot (Red Attacker) is deploying...', color: 'white' });
    } else {
      initialState.history.unshift({ text: `Placement Phase: ${side === 'player1' ? 'Red Attacker' : 'Blue Defender'} (You), deploy your obstacles.`, color: 'white' });
    }

    setGameState(initialState);
  };

  const startSinglePlayer = (side: Player, difficulty: BotDifficulty) => {
    startGame(true, side, difficulty);
  };

  const startTwoPlayer = () => {
    startGame(false);
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const checkVictory = (board: Cell[][], commanderSupplyActions: { player1: number; player2: number }, flagOccupiedActions: { player1: number; player2: number }) => {
    const p1Units = board.flat().filter(c => c.unit && c.unit.player === 'player1');
    const p2Units = board.flat().filter(c => c.unit && c.unit.player === 'player2');

    // Condition 1: Commander in supply line survival
    if (commanderSupplyActions.player1 >= 1) return 'player1';
    if (commanderSupplyActions.player2 >= 1) return 'player2';

    // Condition 2: Flag occupation survival
    if (flagOccupiedActions.player1 >= 1) return 'player1';
    if (flagOccupiedActions.player2 >= 1) return 'player2';

    // Condition 3: Eliminate all enemy units
    if (p1Units.length === 0) return 'player2';
    if (p2Units.length === 0) return 'player1';

    return null;
  };

  const applyPassiveEffects = (board: Cell[][], commanderSupplyActions: { player1: number; player2: number }, flagOccupiedActions: { player1: number; player2: number }) => {
    const newBoard = [...board.map(row => [...row])];
    const updatedCommanderActions = { ...commanderSupplyActions };
    const updatedFlagActions = { ...flagOccupiedActions };

    // 1. Ghillie Recon Passive Reveal: Reveal adjacent enemy obstacles
    const revealedMessages: HistoryItem[] = [];
    newBoard.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.unit && cell.unit.type === UnitType.GHILLIE_RECON) {
          const owner = cell.unit.player;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                const targetCell = newBoard[ny][nx];
                if (targetCell.obstacle && targetCell.obstacle.player !== owner && targetCell.obstacle.isHidden) {
                  newBoard[ny][nx].obstacle = { ...targetCell.obstacle, isHidden: false };
                  revealedMessages.push({ text: `Ghillie Intel: ${targetCell.obstacle.type} uncovered at (${nx-7}, ${7-ny}).`, color: 'blue' });
                }
              }
            }
          }
        }
      });
    });

    // 2. Victory Counters are now handled at the END of the turn in endTurn
    // We only check for absolute elimination victory here as it's immediate
    const winner = checkVictory(newBoard, updatedCommanderActions, updatedFlagActions);

    return {
      newBoard,
      updatedCommanderActions,
      updatedFlagActions,
      winner,
      revealedMessages
    };
  };

  const getBaseActionsForPlayer = (board: Cell[][], player: Player) => {
    const unitsCount = board.flat().filter(c => c.unit && c.unit.player === player).length;
    return (unitsCount > 0 && unitsCount <= 10) ? 3 : 2;
  };

  const processTurnTransition = (board: Cell[][], prevPlayer: Player, commanderSupply: { player1: number; player2: number }, flagOccupied: { player1: number; player2: number }) => {
    const nextPlayer = prevPlayer === 'player1' ? 'player2' : 'player1';
    const updatedCommanderActions = { ...commanderSupply };
    const updatedFlagActions = { ...flagOccupied };

    // 1. Check nextPlayer's Commander on prevPlayer's supply line
    const enemySupplyLineY = nextPlayer === 'player1' ? 14 : 0;
    const commanderOnSupply = board.flat().find(c => 
      c.unit && c.unit.player === nextPlayer && c.unit.type === UnitType.COMMANDER && c.y === enemySupplyLineY
    );
    if (commanderOnSupply) {
      updatedCommanderActions[nextPlayer] += 1;
    } else {
      updatedCommanderActions[nextPlayer] = 0;
    }

    // 2. Check nextPlayer's units on prevPlayer's flag
    const onEnemyFlag = board.flat().find(c => 
      c.unit && c.unit.player === nextPlayer && c.obstacle && c.obstacle.type === ObstacleType.FLAG && c.obstacle.player === prevPlayer
    );
    if (onEnemyFlag) {
      updatedFlagActions[nextPlayer] += 1;
    } else {
      updatedFlagActions[nextPlayer] = 0;
    }

    const winner = checkVictory(board, updatedCommanderActions, updatedFlagActions);
    return { updatedCommanderActions, updatedFlagActions, winner };
  };

  const endTurn = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      
      let newBoard = [...prev.board.map(row => [...row])];
      if (prev.flippedTiles.length === 1) {
        const pos = prev.flippedTiles[0];
        const cell = newBoard[pos.y][pos.x];
        if (cell.obstacle) cell.obstacle = { ...cell.obstacle, isHidden: true };
      }

      const { updatedCommanderActions, updatedFlagActions, winner } = processTurnTransition(newBoard, prev.currentPlayer, prev.commanderSupplyActions, prev.flagOccupiedActions);
      
      const nextPlayer = prev.currentPlayer === 'player1' ? 'player2' : 'player1';
      const nextPlayerBaseActions = getBaseActionsForPlayer(newBoard, nextPlayer);
      let nextTurnActions = nextPlayerBaseActions;
      
      const leftoverActions = prev.actionsRemaining > 0;
      if (leftoverActions) {
        nextTurnActions += 1;
      }

      const history: HistoryItem[] = [{ text: `${prev.currentPlayer === 'player1' ? 'Red Attacker' : 'Blue Defender'} ended their turn.`, color: 'white' }];
      if (leftoverActions) history.unshift({ text: `Efficiency Bonus: ${nextPlayer === 'player1' ? 'Red Attacker' : 'Blue Defender'} gains +1 Action!`, color: 'yellow' });
      if (nextPlayerBaseActions === 3) history.unshift({ text: `Last Stand: ${nextPlayer === 'player1' ? 'Red Attacker' : 'Blue Defender'} commands with 3 base actions!`, color: 'green' });

      return {
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        actionsRemaining: nextTurnActions,
        commanderSupplyActions: updatedCommanderActions,
        flagOccupiedActions: updatedFlagActions,
        winner,
        selectedCell: null,
        flippedTiles: [],
        interactionMode: 'normal',
        history: [...history, ...prev.history].slice(0, 10)
      };
    });
  }, [getBaseActionsForPlayer]);

  const randomizeObstacles = () => {
    setGameState(prev => {
      if (!prev || prev.placementSubPhase !== 'obstacles') return prev;
      const { currentPlayer, board } = prev;
      const newBoard = board.map(row => row.map(cell => {
        // Clear current player's existing obstacles
        if (cell.obstacle && cell.obstacle.player === currentPlayer) {
          return { ...cell, obstacle: null };
        }
        return { ...cell };
      }));

      const isP1 = currentPlayer === 'player1';
      const validCells: {x: number, y: number}[] = [];
      for (let y = isP1 ? 0 : 10; y <= (isP1 ? 4 : 14); y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          // Obstacles can't be on other obstacles (but can be on units)
          if (!newBoard[y][x].obstacle) {
            validCells.push({ x, y });
          }
        }
      }

      // Shuffle valid cells
      for (let i = validCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
      }

      let cellIndex = 0;
      Object.entries(INITIAL_OBSTACLE_COUNTS).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
          if (cellIndex < validCells.length) {
            const { x, y } = validCells[cellIndex++];
            newBoard[y][x].obstacle = {
              id: `${currentPlayer}-${type}-${i}`,
              type: type as ObstacleType,
              player: currentPlayer,
              isHidden: false,
              isTriggered: false
            };
          }
        }
      });

      return {
        ...prev,
        board: newBoard,
        randomizationUsed: {
          ...prev.randomizationUsed!,
          obstacles: true
        },
        showPlacementConfirm: true
      };
    });
  };

  const randomizeUnits = () => {
    setGameState(prev => {
      if (!prev || prev.placementSubPhase !== 'units') return prev;
      const { currentPlayer, board } = prev;
      const newBoard = board.map(row => row.map(cell => {
        if (cell.unit && cell.unit.player === currentPlayer) {
          return { ...cell, unit: null };
        }
        return { ...cell };
      }));

      const isP1 = currentPlayer === 'player1';
      const validCells: {x: number, y: number, isSupplyLine: boolean}[] = [];
      for (let y = isP1 ? 0 : 10; y <= (isP1 ? 4 : 14); y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          // Units can't be on other units (but can be on obstacles)
          if (!newBoard[y][x].unit) {
            validCells.push({ x, y, isSupplyLine: board[y][x].zone === 'supply_line' });
          }
        }
      }

      // Shuffle valid cells
      for (let i = validCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
      }

      // Separate counts into Supply Line units (MBT, Rocket Artillery) and others
      const supplyUnitsCount = (INITIAL_UNIT_COUNTS[UnitType.MBT] || 0) + (INITIAL_UNIT_COUNTS[UnitType.ROCKET_ARTILLERY] || 0);
      const otherUnits = Object.entries(INITIAL_UNIT_COUNTS).filter(([type]) => type !== UnitType.MBT && type !== UnitType.ROCKET_ARTILLERY);

      const placedCells = new Set<string>();

      // 1. Place Supply Line units
      let supplyPlaced = 0;
      const supplyTypes = [
          { type: UnitType.MBT, count: INITIAL_UNIT_COUNTS[UnitType.MBT] || 0 },
          { type: UnitType.ROCKET_ARTILLERY, count: INITIAL_UNIT_COUNTS[UnitType.ROCKET_ARTILLERY] || 0 }
      ];

      let currentTypeIndex = 0;
      let currentTypePlaced = 0;

      for (let i = 0; i < validCells.length && supplyPlaced < supplyUnitsCount; i++) {
          const cell = validCells[i];
          if (cell.isSupplyLine) {
              while (currentTypeIndex < supplyTypes.length && currentTypePlaced >= supplyTypes[currentTypeIndex].count) {
                  currentTypeIndex++;
                  currentTypePlaced = 0;
              }
              
              if (currentTypeIndex < supplyTypes.length) {
                  const uType = supplyTypes[currentTypeIndex].type;
                  const stats = UNIT_STATS[uType];
                  newBoard[cell.y][cell.x].unit = {
                      id: `${currentPlayer}-${uType}-${supplyPlaced}`,
                      type: uType,
                      category: stats.category,
                      player: currentPlayer,
                      range: stats.range,
                      movement: stats.movement,
                      isCamouflaged: (stats as any).isCamouflaged
                  };
                  placedCells.add(`${cell.x},${cell.y}`);
                  supplyPlaced++;
                  currentTypePlaced++;
              }
          }
      }

      // 2. Place other units in remaining shuffled cells
      let cellIndex = 0;
      otherUnits.forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
          // Find next available cell that wasn't used by MBT
          while (cellIndex < validCells.length && placedCells.has(`${validCells[cellIndex].x},${validCells[cellIndex].y}`)) {
              cellIndex++;
          }

          if (cellIndex < validCells.length) {
            const { x, y } = validCells[cellIndex++];
            const stats = UNIT_STATS[type as UnitType];
            newBoard[y][x].unit = {
              id: `${currentPlayer}-${type}-${i}`,
              type: type as UnitType,
              category: stats.category,
              player: currentPlayer,
              range: stats.range,
              movement: stats.movement,
              isCamouflaged: (stats as any).isCamouflaged
            };
            placedCells.add(`${x},${y}`);
          }
        }
      });

      return {
        ...prev,
        board: newBoard,
        randomizationUsed: {
          ...prev.randomizationUsed!,
          units: true
        },
        showPlacementConfirm: true,
        history: [{ text: `Player ${currentPlayer === 'player1' ? '1 (Red Attacker)' : '2 (Blue Defender)'} randomized units. Please confirm layout.`, color: 'white' }, ...prev.history].slice(0, 10)
      };
    });
  };

  const confirmRandomization = () => {
    if (!gameState) return;
    const { currentPlayer, placementSubPhase, board, placementCounts, unitPlacementCounts, randomizationUsed } = gameState;
    
    if (placementSubPhase === 'obstacles') {
      const newCounts = {
        ...placementCounts,
        [currentPlayer]: Object.keys(placementCounts[currentPlayer]).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
      };
      
      let nextSubPhase: 'obstacles' | 'units' = 'units';
      let history: HistoryItem[] = [{ text: `Player ${currentPlayer === 'player1' ? '1 (Red Attacker)' : '2 (Blue Defender)'} randomized and confirmed obstacles.`, color: 'white' }, ...gameState.history];

      setGameState({
        ...gameState,
        placementCounts: newCounts,
        placementSubPhase: nextSubPhase,
        showPlacementConfirm: false,
        history: history.slice(0, 10)
      });
    } else {
      const newUnitCounts = {
        ...unitPlacementCounts,
        [currentPlayer]: Object.keys(unitPlacementCounts[currentPlayer]).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
      };

      let nextPlayer = currentPlayer;
      let nextPhase = gameState.phase;
      let nextSubPhase = gameState.placementSubPhase;
      let history: HistoryItem[] = [{ text: `Player ${currentPlayer === 'player1' ? '1 (Red Attacker)' : '2 (Blue Defender)'} randomized and confirmed units.`, color: 'white' }, ...gameState.history];

      if (currentPlayer === 'player1') {
        nextPlayer = 'player2';
        nextSubPhase = 'obstacles';
        history = [{ text: 'Player 1 (Red Attacker) units deployed. Player 2 (Blue Defender), deploy your obstacles.', color: 'white' }, ...history];
      } else {
        nextPhase = 'battle';
        nextPlayer = 'player1';
        history = [{ text: 'All units deployed. Battle Phase: Command your forces!', color: 'white' }, ...history];
      }

      // Also hide the obstacles for the current player when they finish their entire placement
      const finalBoard = board.map(row => row.map(cell => {
        if (cell.obstacle && cell.obstacle.player === currentPlayer) {
          return { ...cell, obstacle: { ...cell.obstacle, isHidden: true } };
        }
        return cell;
      }));

      setGameState({
        ...gameState,
        board: finalBoard,
        unitPlacementCounts: newUnitCounts,
        currentPlayer: nextPlayer,
        phase: nextPhase,
        placementSubPhase: nextSubPhase,
        showPlacementConfirm: false,
        history: history.slice(0, 10)
      });
    }
  };

  const revokeRandomization = () => {
    if (!gameState) return;
    const { currentPlayer, placementSubPhase, board } = gameState;
    
    const newBoard = board.map(row => row.map(cell => {
      const isObstacle = placementSubPhase === 'obstacles' && cell.obstacle && cell.obstacle.player === currentPlayer;
      const isUnit = placementSubPhase === 'units' && cell.unit && cell.unit.player === currentPlayer;
      
      if (isObstacle) return { ...cell, obstacle: null };
      if (isUnit) return { ...cell, unit: null };
      return { ...cell };
    }));

    setGameState({
      ...gameState,
      board: newBoard,
      showPlacementConfirm: false,
      randomizationUsed: {
        ...gameState.randomizationUsed!,
        [placementSubPhase]: false
      },
      placementCounts: placementSubPhase === 'obstacles' ? {
        ...gameState.placementCounts,
        [currentPlayer]: { ...INITIAL_OBSTACLE_COUNTS }
      } : gameState.placementCounts,
      unitPlacementCounts: placementSubPhase === 'units' ? {
        ...gameState.unitPlacementCounts,
        [currentPlayer]: { ...INITIAL_UNIT_COUNTS }
      } : gameState.unitPlacementCounts
    });
  };

  const botAutoPlacement = () => {
    setGameState(prev => {
      if (!prev || prev.phase !== 'placement') return prev;
      const { currentPlayer, board, placementSubPhase } = prev;
      
      // Part 1: Randomization Logic (Combined from randomizeObstacles/Units)
      let newBoard = board.map(row => row.map(cell => ({ ...cell })));
      const isP1 = currentPlayer === 'player1';
      const validCells: any[] = [];
      
      // Clear existing pieces for current player to avoid duplication
      newBoard = newBoard.map(row => row.map(cell => {
        if (placementSubPhase === 'obstacles') {
          if (cell.obstacle && cell.obstacle.player === currentPlayer) return { ...cell, obstacle: null };
        } else {
          if (cell.unit && cell.unit.player === currentPlayer) return { ...cell, unit: null };
        }
        return cell;
      }));

      for (let y = isP1 ? 0 : 10; y <= (isP1 ? 4 : 14); y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (placementSubPhase === 'obstacles') {
            if (!newBoard[y][x].obstacle && !newBoard[y][x].unit) validCells.push({ x, y });
          } else {
            if (!newBoard[y][x].unit && !newBoard[y][x].obstacle) {
              validCells.push({ x, y, isSupplyLine: board[y][x].zone === 'supply_line' });
            }
          }
        }
      }

      // Shuffle
      for (let i = validCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
      }

      if (placementSubPhase === 'obstacles') {
        let cellIndex = 0;
        Object.entries(INITIAL_OBSTACLE_COUNTS).forEach(([type, count]) => {
          for (let i = 0; i < count; i++) {
            if (cellIndex < validCells.length) {
              const { x, y } = validCells[cellIndex++];
              newBoard[y][x].obstacle = {
                id: `${currentPlayer}-${type}-${i}`,
                type: type as ObstacleType,
                player: currentPlayer,
                isHidden: false,
                isTriggered: false
              };
            }
          }
        });
      } else {
        const supplyUnitsCount = (INITIAL_UNIT_COUNTS[UnitType.MBT] || 0) + (INITIAL_UNIT_COUNTS[UnitType.ROCKET_ARTILLERY] || 0);
        const otherUnits = Object.entries(INITIAL_UNIT_COUNTS).filter(([type]) => type !== UnitType.MBT && type !== UnitType.ROCKET_ARTILLERY);
        const placedCells = new Set<string>();
        let supplyPlaced = 0;
        const supplyTypes = [
          { type: UnitType.MBT, count: INITIAL_UNIT_COUNTS[UnitType.MBT] || 0 },
          { type: UnitType.ROCKET_ARTILLERY, count: INITIAL_UNIT_COUNTS[UnitType.ROCKET_ARTILLERY] || 0 }
        ];
        let currentTypeIndex = 0;
        let currentTypePlaced = 0;

        for (let i = 0; i < validCells.length && supplyPlaced < supplyUnitsCount; i++) {
          const cell = validCells[i];
          if (cell.isSupplyLine) {
            while (currentTypeIndex < supplyTypes.length && currentTypePlaced >= supplyTypes[currentTypeIndex].count) {
              currentTypeIndex++;
              currentTypePlaced = 0;
            }
            if (currentTypeIndex < supplyTypes.length) {
              const uType = supplyTypes[currentTypeIndex].type;
              const stats = UNIT_STATS[uType];
              newBoard[cell.y][cell.x].unit = {
                id: `${currentPlayer}-${uType}-${supplyPlaced}`,
                type: uType,
                category: stats.category,
                player: currentPlayer,
                range: stats.range,
                movement: stats.movement,
                isCamouflaged: (stats as any).isCamouflaged
              };
              placedCells.add(`${cell.x},${cell.y}`);
              supplyPlaced++;
              currentTypePlaced++;
            }
          }
        }

        let cellIndex = 0;
        otherUnits.forEach(([type, count]) => {
          for (let i = 0; i < count; i++) {
            while (cellIndex < validCells.length && placedCells.has(`${validCells[cellIndex].x},${validCells[cellIndex].y}`)) cellIndex++;
            if (cellIndex < validCells.length) {
              const { x, y } = validCells[cellIndex++];
              const stats = UNIT_STATS[type as UnitType];
              newBoard[y][x].unit = {
                id: `${currentPlayer}-${type}-${i}`,
                type: type as UnitType,
                category: stats.category,
                player: currentPlayer,
                range: stats.range,
                movement: stats.movement,
                isCamouflaged: (stats as any).isCamouflaged
              };
            }
          }
        });
      }

      // Part 2: State Advancement Logic (Combined from confirmRandomization)
      let nextPlayer = currentPlayer;
      let nextPhase = prev.phase;
      let nextSubPhase = placementSubPhase;
      let nextHist = [...prev.history];

      if (placementSubPhase === 'obstacles') {
        nextSubPhase = 'units';
        nextHist.unshift({ text: `Bot (${currentPlayer === 'player1' ? 'Red' : 'Blue'}) randomized and confirmed obstacles.`, color: 'white' });
      } else {
        // Finished units, transition to next player or battle
        if (currentPlayer === 'player1') {
          nextPlayer = 'player2';
          nextSubPhase = 'obstacles';
          nextHist.unshift({ text: 'Bot (Red Attacker) units deployed. Your turn to deploy obstacles.', color: 'white' });
        } else {
          nextPhase = 'battle';
          nextPlayer = 'player1';
          nextHist.unshift({ text: 'All units deployed. Battle Phase starts!', color: 'white' });
        }
        
        // Hide obstacles for the bot when it finishes its entire placement
        newBoard = newBoard.map(row => row.map(cell => {
          if (cell.obstacle && cell.obstacle.player === currentPlayer) {
            return { ...cell, obstacle: { ...cell.obstacle, isHidden: true } };
          }
          return cell;
        }));
      }

      return {
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        phase: nextPhase,
        placementSubPhase: nextSubPhase,
        showPlacementConfirm: false,
        history: nextHist.slice(0, 10),
        placementCounts: placementSubPhase === 'obstacles' ? {
          ...prev.placementCounts,
          [currentPlayer]: Object.keys(prev.placementCounts[currentPlayer]).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
        } : prev.placementCounts,
        unitPlacementCounts: placementSubPhase === 'units' ? {
          ...prev.unitPlacementCounts,
          [currentPlayer]: Object.keys(prev.unitPlacementCounts[currentPlayer]).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
        } : prev.unitPlacementCounts
      };
    });
  };

  useEffect(() => {
    if (!gameState || gameState.winner || gameState.phase === 'menu') return;

    const isBotTurn = gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide;
    
    if (isBotTurn) {
      // Varied thinking time to simulate processing
      const baseDelay = 1000;
      const randomDelay = Math.random() * 1500;
      const timer = setTimeout(() => {
        if (gameState.phase === 'placement') {
          botAutoPlacement();
        } else if (gameState.phase === 'battle') {
          executeBotTurn();
        }
      }, baseDelay + randomDelay);
      return () => clearTimeout(timer);
    }
  }, [
    gameState?.currentPlayer, 
    gameState?.phase, 
    gameState?.placementSubPhase, 
    gameState?.actionsRemaining, 
    gameState?.interactionMode, 
    gameState?.selectedCell, 
    gameState?.flippedTiles, 
    gameState?.freeRevealsRemaining
  ]);

  const executeBotTurn = () => {
    if (!gameState || gameState.winner) return;
    const { currentPlayer, playerSide, isSinglePlayer, interactionMode, freeRevealsRemaining, board } = gameState;
    
    // Ensure it's the bot's turn
    const isBotTurn = isSinglePlayer && currentPlayer !== playerSide;
    if (!isBotTurn) return;

    const decision = getBotDecision(gameState);
    
    if (!decision) {
      endTurn();
      return;
    }

    // Protection against locked modes: if bot wants to switch but is locked by free reveals
    if (freeRevealsRemaining > 0 && decision.modeToSwitch && decision.modeToSwitch !== 'reveal') {
       const hasAnyHidden = board.flat().some(c => c.obstacle && c.obstacle.isHidden);
       if (!hasAnyHidden) {
          setGameState(prev => prev ? { ...prev, freeRevealsRemaining: 0, interactionMode: 'normal' } : prev);
          return;
       }
       // If hidden tiles exist, bot SHOULD be suggesting a reveal. 
       // If it didn't, but it's locked, we force it to try reveal evaluation again or end turn
       endTurn();
       return;
    }

    // Handle decision: { x, y, type, modeToSwitch? }
    
    // 1. Mode adjustment
    if (decision.modeToSwitch && interactionMode !== decision.modeToSwitch) {
      setGameState(prev => prev ? { ...prev, interactionMode: decision.modeToSwitch as any, selectedCell: null } : prev);
      return;
    }

    // 2. Click execution
    // Verification: Double check if the move is actually valid before clicking
    // This is extra safety to prevent infinite loops if getBotDecision somehow makes a mistake
    if (decision.type === 'click') {
        const actingUnitCell = board.find(row => row.find(c => c.unit && c.unit.player === currentPlayer && c.x === decision.selectedX && c.y === decision.selectedY));
        if (actingUnitCell) {
             const unit = board[decision.selectedY!][decision.selectedX!].unit!;
             const target = board[decision.y][decision.x];
             const mode = decision.modeToSwitch || interactionMode;
             if (mode === 'elimination' || mode === 'mobility') {
                const check = checkActionValidity(unit, {x: decision.selectedX!, y: decision.selectedY!}, target, board, mode as any);
                if (!check.valid && !target.unit) { // if target.unit, it might be a click to select, so we allow it
                   console.warn("Bot picked invalid move:", decision, check.reason);
                   // If bot keeps picking invalid moves, force end turn
                   endTurn();
                   return;
                }
             }
        }
    }

    handleCellClick(decision.x, decision.y, true);
  };

  const getBotDecision = (state: GameState): { x: number, y: number, modeToSwitch?: string, type: string, selectedX?: number, selectedY?: number } | null => {
    const { board, currentPlayer, interactionMode, selectedCell, flippedTiles, freeRevealsRemaining, botDifficulty, actionsRemaining } = state;
    if (actionsRemaining <= 0) return null;

    const enemyPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
    const myGoalY = currentPlayer === 'player1' ? 14 : 0;
    const myHomeY = currentPlayer === 'player1' ? 0 : 14;

    // -- PRE-CALCULATE THREAT MAPS for optimization --
    const enemyThreatMap = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(false));
    const botThreatMap = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(false));

    // Fill maps
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = board[y][x];
        if (cell.unit) {
          const isEnemy = cell.unit.player === enemyPlayer;
          // For every cell on the board, check if this unit can hit it
          for (let ty = 0; ty < BOARD_SIZE; ty++) {
            for (let tx = 0; tx < BOARD_SIZE; tx++) {
              // Quick distance check before expensive validity check
              const dist = Math.abs(x - tx) + Math.abs(y - ty);
              const stats = UNIT_STATS[cell.unit.type];
              if (dist <= stats.range + 2) { // range + buffer for line of sight/move-attack potential conceptually
                const check = checkActionValidity(cell.unit, {x, y}, board[ty][tx], board, 'elimination');
                if (check.valid) {
                  if (isEnemy) enemyThreatMap[ty][tx] = true;
                  else botThreatMap[ty][tx] = true;
                }
              }
            }
          }
        }
      }
    }

    // Helper: Find hidden obstacles
    const findHidden = (p?: Player) => {
      const res: {x: number, y: number}[] = [];
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const obs = board[y][x].obstacle;
          if (obs && obs.isHidden && (!p || obs.player === p)) res.push({x, y});
        }
      }
      return res;
    };

    // Helper: Is cell threatened by enemy?
    const isThreatenedByEnemy = (tx: number, ty: number) => enemyThreatMap[ty][tx];
    const isThreatenedByBot = (tx: number, ty: number) => botThreatMap[ty][tx];

    // 1. FORCED/INTERMEDIARY STEPS
    // Free Reveals
    if (freeRevealsRemaining > 0) {
      const hiddenEnemy = findHidden(enemyPlayer);
      if (hiddenEnemy.length > 0) return { ...hiddenEnemy[0], type: 'reveal' };
      const hiddenAny = findHidden();
      if (hiddenAny.length > 0) return { ...hiddenAny[0], type: 'reveal' };
    }

    // Reveal Mode Pair Completion
    if (interactionMode === 'reveal' && flippedTiles.length === 1) {
      const hiddenEnemy = findHidden(enemyPlayer);
      if (hiddenEnemy.length > 0) return { ...hiddenEnemy[0], type: 'reveal' };
      const hiddenAny = findHidden();
      if (hiddenAny.length > 0) return { ...hiddenAny[0], type: 'reveal' };
      return null;
    }

    // 2. STRATEGIC EVALUATION
    const botUnits = board.flat().filter(c => c.unit && c.unit.player === currentPlayer);
    const possibleActions: { x: number, y: number, mode: string, score: number, unit?: any, target?: any }[] = [];

    const difficultyMultiplier = botDifficulty === 'hard' ? 1.5 : (botDifficulty === 'normal' ? 1.1 : 0.8);

    // Evaluate Reveal Mode (Smart chance)
    if (actionsRemaining >= 2 && findHidden(enemyPlayer).length > 0) {
      // Hard bots reveal more aggressively if they don't have good move options
      const revealProb = botDifficulty === 'hard' ? 0.4 : 0.2;
      if (Math.random() < revealProb) {
        const revealScore = 200 * difficultyMultiplier;
        const hiddenEnemy = findHidden(enemyPlayer)[0];
        if (hiddenEnemy) possibleActions.push({ ...hiddenEnemy, mode: 'reveal', score: revealScore });
      }
    }

    // Evaluate Unit Actions (Mobility & Elimination)
    botUnits.forEach(unitCell => {
      const unit = unitCell.unit!;
      const ux = unitCell.x;
      const uy = unitCell.y;
      
      // Is current position safe?
      const currentlySafe = !isThreatenedByEnemy(ux, uy);

      for (let ty = 0; ty < BOARD_SIZE; ty++) {
        for (let tx = 0; tx < BOARD_SIZE; tx++) {
          const targetCell = board[ty][tx];
          
          // -- ELIMINATION (Attack/Eliminate Mode) --
          const elimCheck = checkActionValidity(unit, {x: ux, y: uy}, targetCell, board, 'elimination');
          if (elimCheck.valid) {
            let score = 500; // Base kill priority is higher
            
            const enemyDistToMyHome = Math.abs(ty - myHomeY);
            if (enemyDistToMyHome <= 3) score += 1000; // Defensive priority
            if (enemyDistToMyHome <= 1) score += 2000; // CRITICAL defensive priority

            if (targetCell.unit!.type === UnitType.COMMANDER) score += 2500;
            if (targetCell.unit!.type === UnitType.MBT) score += 800;
            if (targetCell.unit!.category === UnitCategory.PANZER) score += 500;
            if (targetCell.unit!.category === UnitCategory.ARTILLERY) score += 700;
            
            // Hard bot prioritizes clearing threats to its own high-value units
            if (botDifficulty === 'hard' && currentlySafe && isThreatenedByEnemy(ux, uy)) score += 300;
            
            // Penalty for suicide missions (dying after kill) unless it's a high value target
            const nextSafe = !isThreatenedByEnemy(tx, ty); // wait, for elimination tx/ty is where the ENEMY is
            // We want to know if the ATTACKER is safe? In elimination, attacker doesn't move.
            if (!currentlySafe) score += 100; // If I'm going to die anyway, might as well take someone with me

            score *= difficultyMultiplier;

            possibleActions.push({ x: ux, y: uy, mode: 'elimination', score, unit, target: {x: tx, y: ty} });
          }

          // -- MOBILITY (Move & Crash) --
          const mobCheck = checkActionValidity(unit, {x: ux, y: uy}, targetCell, board, 'mobility');
          if (mobCheck.valid) {
            if (!targetCell.unit) {
              // Regular move score
              let score = 200;
              const prevDist = Math.abs(uy - myGoalY);
              const nextDist = Math.abs(ty - myGoalY);
              
              // Progress bonus (Weighted more heavily)
              if (nextDist < prevDist) {
                 score += (prevDist - nextDist) * (botDifficulty === 'hard' ? 250 : 150);
              }
              
              const targetIsSafe = !isThreatenedByEnemy(tx, ty);
              if (!targetIsSafe) {
                // High risk penalty
                const riskPenalty = unit.type === UnitType.COMMANDER ? 3000 : (unit.category === UnitCategory.PANZER ? 500 : 800);
                score -= (riskPenalty / difficultyMultiplier); 
              }
              
              if (currentlySafe && !targetIsSafe && botDifficulty === 'hard') score -= 500; 
              
              if (targetCell.zone === 'frontier') score += 300; // Aggressively value frontier crossings
              const isDeepIncursion = currentPlayer === 'player1' ? ty <= 4 : ty >= 10;
              if (isDeepIncursion) score += 500; // Deep incursions

              // FLAG GOAL
              if (targetCell.obstacle && targetCell.obstacle.type === ObstacleType.FLAG && targetCell.obstacle.player !== currentPlayer) {
                score += 5000; // WIN CONDITION
              }
              
              // COMMANDER SUPPLY GOAL
              if (unit.type === UnitType.COMMANDER && targetCell.zone === 'supply_line' && ty === myGoalY) {
                score += 4000; // WIN CONDITION
              }

              // Stay away from own flag to avoid blocking
              if (unitCell.obstacle && unitCell.obstacle.type === ObstacleType.FLAG && unitCell.obstacle.player === currentPlayer) {
                score += 500; // Move AWAY from own flag is good
              }
              
              // Advantageous positioning: Move to where you can HIT the enemy next turn
              // We check if target position threatens something valuable
              // (This is a simplified check: do we have LOS to enemy areas?)
              if (botDifficulty === 'hard') {
                const homeRow = enemyPlayer === 'player1' ? 0 : 14;
                const distToEnemyHome = Math.abs(ty - homeRow);
                if (distToEnemyHome < 5) score += 200;
                
                // If I am artillery, I want to be safe but have range
                if (unit.category === UnitCategory.ARTILLERY) {
                  if (targetIsSafe) score += 300;
                  // Check if we can hit anyone from there
                  // (Using a heuristic for now to avoid yet another loop)
                }
              }

              // Clumping penalty (avoid getting stuck)
              const adjacentAllies = board.flat().filter(c => c.unit && c.unit.player === currentPlayer && Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1).length;
              if (adjacentAllies > 3) score -= 200;

              score *= difficultyMultiplier;

              possibleActions.push({ x: ux, y: uy, mode: 'mobility', score, unit, target: {x: tx, y: ty} });
            } else {
              // Mobility Crash (Target is enemy)
              let crashScore = 600;
              const t = targetCell.unit;
              if (t.type === UnitType.COMMANDER) crashScore += 2000;
              if (t.category === UnitCategory.ARTILLERY) crashScore += 500;
              
              // Bonus for unarmored targets that won't immobilize the bot's panzer
              if (unit.category === UnitCategory.PANZER && t.category !== UnitCategory.PANZER) {
                crashScore += 400;
              }
              
              // Don't crash if it puts you in extreme danger (unless taking a commander)
              if (botDifficulty === 'hard' && isThreatenedByEnemy(tx, ty) && t.type !== UnitType.COMMANDER) crashScore -= 400;

              crashScore *= difficultyMultiplier;

              possibleActions.push({ x: ux, y: uy, mode: 'mobility', score: crashScore, unit, target: {x: tx, y: ty} });
            }
          }
        }
      }
    });

    if (possibleActions.length === 0) return null;

    // Filter by Difficulty
    possibleActions.sort((a, b) => b.score - a.score);
    let best = possibleActions[0];
    
    if (botDifficulty === 'easy') {
      // Pick randomly from top half or top 15
      const poolSize = Math.max(5, Math.min(possibleActions.length, 15));
      best = possibleActions[Math.floor(Math.random() * poolSize)];
    } else if (botDifficulty === 'normal') {
      // Pick from top 4
      const poolSize = Math.min(possibleActions.length, 4);
      best = possibleActions[Math.floor(Math.random() * poolSize)];
    } else {
      // Hard: Pick best or second best occasionally to avoid being 100% predictable but stay optimal
      if (Math.random() < 0.1 && possibleActions.length > 1) {
        best = possibleActions[1];
      } else {
        best = possibleActions[0];
      }
    }

    // -- EXECUTION MAPPING --
    // If the best action is already determined, we need to return the CLICK target
    if (best.mode === 'reveal') {
       return { x: best.x, y: best.y, modeToSwitch: 'reveal', type: 'reveal' };
    }

    // For Combat/Move, we need to handle Selection vs Target click
    if (interactionMode !== best.mode) {
       return { x: best.x, y: best.y, modeToSwitch: best.mode, type: 'click' };
    }

    if (!selectedCell || selectedCell.x !== best.x || selectedCell.y !== best.y) {
       // Click the unit to select it within the mode
       return { x: best.x, y: best.y, type: 'click' };
    }

    // Both mode and unit are correct, click the target
    return { x: best.target.x, y: best.target.y, type: 'click', selectedX: best.x, selectedY: best.y };
  };


  const handleCellClick = (x: number, y: number, isBotAction = false) => {
    if (!gameState || gameState.winner) return;

    // Block human input during bot turns
    const isBotTurn = gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide;
    if (isBotTurn && !isBotAction) {
      return;
    }

    const { phase, currentPlayer, board, selectedObstacleType, placementCounts, actionsRemaining, flippedTiles, interactionMode } = gameState;

    if (actionsRemaining <= 0 && phase === 'battle') {
      endTurn();
      return;
    }

    if (phase === 'placement') {
      const isP1Zone = y <= 4;
      const isP2Zone = y >= 10;
      const isValidZone = (currentPlayer === 'player1' && isP1Zone) || (currentPlayer === 'player2' && isP2Zone);

      if (!isValidZone) return;

      if (gameState.placementSubPhase === 'obstacles') {
        if (!selectedObstacleType) return;
        if (board[y][x].obstacle) return;

        const count = placementCounts[currentPlayer][selectedObstacleType];
        if (count <= 0) return;

        const newBoard = [...board.map(row => [...row])];
        newBoard[y][x].obstacle = {
          id: `${currentPlayer}-${selectedObstacleType}-${count}`,
          type: selectedObstacleType,
          player: currentPlayer,
          isHidden: false,
          isTriggered: false
        };

        const newCounts = {
          ...placementCounts,
          [currentPlayer]: {
            ...placementCounts[currentPlayer],
            [selectedObstacleType]: count - 1
          }
        };

        const totalRemaining = (Object.values(newCounts[currentPlayer]) as number[]).reduce((a, b) => a + b, 0);
        
        let nextPlayer = currentPlayer;
        let nextSubPhase = gameState.placementSubPhase;
        let history = [...gameState.history];

        if (totalRemaining === 0) {
          nextSubPhase = 'units';
          if (currentPlayer === 'player1') {
            history = ['Player 1 (Red Attacker) obstacles deployed. Now deploy your units.', ...history];
          } else {
            history = ['Player 2 (Blue Defender) obstacles deployed. Now deploy your units.', ...history];
          }
        }

        setGameState({
          ...gameState,
          board: newBoard,
          placementCounts: newCounts,
          currentPlayer: nextPlayer,
          placementSubPhase: nextSubPhase,
          showPlacementConfirm: false,
          history: history.slice(0, 10)
        });
      } else if (gameState.placementSubPhase === 'units') {
        if (!gameState.selectedUnitType) return;
        if (board[y][x].unit) return;
        // Allows placing on own obstacles

        // Supply Line Placement Constraint
        if ((gameState.selectedUnitType === UnitType.MBT || gameState.selectedUnitType === UnitType.ROCKET_ARTILLERY) && board[y][x].zone !== 'supply_line') {
          setGameState({
            ...gameState,
            history: [{ text: `${gameState.selectedUnitType.replace(/_/g, ' ')} can only be placed on the Supply Line!`, color: 'white' }, ...gameState.history].slice(0, 10)
          });
          return;
        }

        const count = gameState.unitPlacementCounts[currentPlayer][gameState.selectedUnitType] || 0;
        if (count <= 0) return;

        const newBoard = [...board.map(row => [...row])];
        const stats = UNIT_STATS[gameState.selectedUnitType];
        newBoard[y][x].unit = {
          id: `${currentPlayer}-${gameState.selectedUnitType}-${count}`,
          type: gameState.selectedUnitType,
          category: stats.category,
          player: currentPlayer,
          range: stats.range,
          movement: stats.movement,
          isCamouflaged: stats.isCamouflaged
        };

        const newUnitCounts = {
          ...gameState.unitPlacementCounts,
          [currentPlayer]: {
            ...gameState.unitPlacementCounts[currentPlayer],
            [gameState.selectedUnitType]: count - 1
          }
        };

        const totalRemaining = (Object.values(newUnitCounts[currentPlayer]) as number[]).reduce((a, b) => a + b, 0);
        
        let nextPlayer = currentPlayer;
        let nextPhase = phase;
        let nextSubPhase = gameState.placementSubPhase;
        let history = [...gameState.history];
        let finalBoard = newBoard;

        if (totalRemaining === 0) {
          // Hide obstacles when finishing units (end of player's placement turn)
          finalBoard = newBoard.map(row => row.map(cell => {
            if (cell.obstacle && cell.obstacle.player === currentPlayer) {
              return { ...cell, obstacle: { ...cell.obstacle, isHidden: true } };
            }
            return cell;
          }));

          if (currentPlayer === 'player1') {
            nextPlayer = 'player2';
            nextSubPhase = 'obstacles';
            history = [{ text: 'Player 1 (Red Attacker) units deployed. Player 2 (Blue Defender), deploy your obstacles.', color: 'white' }, ...history.map(m => typeof m === 'string' ? { text: m, color: 'blue' } : m)];
          } else {
            nextPhase = 'battle';
            nextPlayer = 'player1';
            history = [{ text: 'All units deployed. Battle Phase: Command your forces!', color: 'white' }, ...history.map(m => typeof m === 'string' ? { text: m, color: 'blue' } : m)];
          }
        }

        setGameState({
          ...gameState,
          board: finalBoard,
          unitPlacementCounts: newUnitCounts,
          currentPlayer: nextPlayer,
          phase: nextPhase,
          placementSubPhase: nextSubPhase,
          showPlacementConfirm: false,
          history: history.slice(0, 10)
        });
      }
      return;
    }

    if (phase === 'battle') {
      const cell = board[y][x];

      // 1. Reveal Mode
      if (interactionMode === 'reveal' || gameState.freeRevealsRemaining > 0) {
        if (cell.obstacle && cell.obstacle.isHidden) {
          const isFreeReveal = gameState.freeRevealsRemaining > 0;

          if (!isFreeReveal) {
            if (flippedTiles.length === 0) {
              // First click: must be own color
              if (cell.obstacle.player !== currentPlayer) {
                setGameState({ ...gameState, history: [{ text: `First flip must be your own color!`, color: 'white' }, ...gameState.history].slice(0, 10) });
                return;
              }
            } else {
              // Second click: must be other color
              const firstPos = flippedTiles[0];
              const firstCell = board[firstPos.y][firstPos.x];
              if (cell.obstacle.player === firstCell.obstacle!.player) {
                setGameState({ ...gameState, history: [{ text: `Second flip must be the opponent's color!`, color: 'white' }, ...gameState.history].slice(0, 10) });
                return;
              }
            }
          }

          const newBoard = [...board.map(row => [...row])];
          newBoard[y][x].obstacle = { ...cell.obstacle, isHidden: false };
          
          const isSecondFlip = flippedTiles.length === 1;
          const newActions = (!isFreeReveal && isSecondFlip) ? actionsRemaining - 1 : actionsRemaining;
          const newFreeReveals = isFreeReveal ? gameState.freeRevealsRemaining - 1 : 0;
          
          let nextFlipped = (isFreeReveal || isSecondFlip) ? [] : [{ x, y }];
          let historyMsg: HistoryItem = { text: isFreeReveal 
            ? `Ghillie Intel: ${cell.obstacle.type} uncovered at (${x-7}, ${7-y}).`
            : `Tactical Reveal! ${cell.obstacle.type} uncovered at (${x-7}, ${7-y}).`, color: 'blue' };
          
          if (!isFreeReveal && isSecondFlip) {
            const firstPos = flippedTiles[0];
            const firstCell = board[firstPos.y][firstPos.x];
            const isMatch = firstCell.obstacle!.type === cell.obstacle.type;
            
            if (!isMatch) {
              historyMsg = { text: `No match! ${firstCell.obstacle!.type} and ${cell.obstacle.type} do not match.`, color: 'white' };
              setTimeout(() => {
                setGameState(prev => {
                  if (!prev) return null;
                  const resetBoard = [...prev.board.map(row => [...row])];
                  if (resetBoard[firstPos.y][firstPos.x].obstacle) resetBoard[firstPos.y][firstPos.x].obstacle!.isHidden = true;
                  if (resetBoard[y][x].obstacle) resetBoard[y][x].obstacle!.isHidden = true;
                  return { ...prev, board: resetBoard };
                });
              }, 1000);
          } else {
            historyMsg = { text: `Match found! ${cell.obstacle.type} revealed permanently.`, color: 'blue' };
            // Trigger effects if units are present
            [
              { x: firstPos.x, y: firstPos.y },
              { x: x, y: y }
            ].forEach(pos => {
              const target = newBoard[pos.y][pos.x];
              if (target.unit && target.obstacle) {
                const obs = target.obstacle;
                const unit = target.unit;
                // Barbed Wire / Tank Trap check
                if (obs.type === ObstacleType.TANK_TRAP && (unit.category === UnitCategory.PANZER || unit.type === UnitType.ROCKET_ARTILLERY)) {
                  target.unit = { ...unit, isImmobilized: true };
                  target.obstacle = { ...obs, isTriggered: true };
                } else if (obs.type === ObstacleType.BARBED_WIRE && (unit.category === UnitCategory.INFANTRY || unit.category === UnitCategory.ARTILLERY)) {
                  target.unit = { ...unit, isImmobilized: true };
                  target.obstacle = { ...obs, isTriggered: true };
                } else if (obs.type === ObstacleType.LAND_MINE && unit.type !== UnitType.ELITE_TROOPER) {
                  target.unit = null;
                  target.obstacle = { ...obs, isTriggered: true };
                }
              }
            });
          }
          }

          const { newBoard: finalBoard, updatedCommanderActions, updatedFlagActions, winner, revealedMessages } = applyPassiveEffects(
            newBoard,
            gameState.commanderSupplyActions,
            gameState.flagOccupiedActions
          );

          const isTurnEnd = newActions <= 0 || winner;
          let finalWinner = winner;
          let finalCommanderActions = updatedCommanderActions;
          let finalFlagActions = updatedFlagActions;
          const nextPlayer = isTurnEnd ? (currentPlayer === 'player1' ? 'player2' : 'player1') : currentPlayer;
          
          if (isTurnEnd && !winner) {
            const transition = processTurnTransition(finalBoard, currentPlayer, updatedCommanderActions, updatedFlagActions);
            finalWinner = transition.winner;
            finalCommanderActions = transition.updatedCommanderActions;
            finalFlagActions = transition.updatedFlagActions;
          }

          const nextActions = isTurnEnd ? getBaseActionsForPlayer(finalBoard, nextPlayer) : newActions;

          const hasAnyHiddenLeft = finalBoard.flat().some(c => c.obstacle && c.obstacle.isHidden);
          const finalFreeReveals = hasAnyHiddenLeft ? newFreeReveals : 0;
          const finalMode = isTurnEnd ? 'normal' : (finalFreeReveals > 0 ? 'reveal' : (isFreeReveal ? 'normal' : 'reveal'));

          setGameState({
            ...gameState,
            board: finalBoard,
            actionsRemaining: nextActions,
            currentPlayer: nextPlayer,
            flippedTiles: nextFlipped,
            interactionMode: finalMode,
            freeRevealsRemaining: finalFreeReveals,
            commanderSupplyActions: finalCommanderActions,
            flagOccupiedActions: finalFlagActions,
            winner: finalWinner,
            history: [...revealedMessages.map(m => typeof m === 'string' ? { text: m, color: 'blue' } : m), historyMsg, ...gameState.history].slice(0, 10),
            selectedCell: isTurnEnd ? null : gameState.selectedCell
          });
          return;
        }
        // Only block if we are explicitly in reveal mode
        if (interactionMode === 'reveal') return;
      }

      // 2. Elimination Mode (Range Attack)
      if (interactionMode === 'elimination') {
        // Global Elimination: If clicking an enemy unit that is in range of ANY of my units
        if (cell.unit && cell.unit.player !== currentPlayer) {
          const myUnits = board.flat().filter(c => c.unit && c.unit.player === currentPlayer);
          const attacker = myUnits.find(c => {
            const u = c.unit!;
            const ddx = Math.abs(x - c.x);
            const ddy = Math.abs(y - c.y);
            const ddist = ddx + ddy;
            const isO = ddx === 0 || ddy === 0;
            
            if (!isO) return false;

            // Global Elimination for Rocket Artillery
            if (u.type === UnitType.ROCKET_ARTILLERY) {
              if (ddist !== 2 && ddist !== 3) return false;
              // If targeting range 3, cell at range 2 is also checked?
              // The logic below executes the attack if a valid attacker is found.
              return true; 
            }

            // Infantry cannot eliminate Panzer via range (except Elite/Commander)
            const attackerIsSpecInfantry = u.type === UnitType.ELITE_TROOPER || u.type === UnitType.COMMANDER;
            if (u.category === UnitCategory.INFANTRY && cell.unit!.category === UnitCategory.PANZER) {
              if (!attackerIsSpecInfantry) return false;
            }

            // Linear shots (range > 1) are blocked by units at range 1.
            if (u.type === UnitType.MORTAR) {
              if (ddist !== 2) return false;
            } else if (u.type === UnitType.FIELD_GUN) {
              if (ddist !== 3) return false;
            } else if (u.type === UnitType.ROCKET_ARTILLERY) {
              if (ddist !== 2 && ddist !== 3) return false;
              // High arc: skip block
            } else if (u.range > 1) {
              if (ddist > u.range) return false;
              // If targeting range 2, check if range 1 is blocked by any unit
              if (ddist === 2) {
                const midX = c.x + (x > c.x ? 1 : x < c.x ? -1 : 0);
                const midY = c.y + (y > c.y ? 1 : y < c.y ? -1 : 0);
                if (board[midY][midX].unit) return false;
              }
            } else {
              if (ddist > u.range) return false;
            }

            // Field Gun Specialty: Can eliminate any unit (including Panzers) only if stationed in own territory zone
            if (u.type === UnitType.HOWITZER) {
              // Now allow firing from frontier, but MBT immunity will still catch MBTs
            }

            // Trench protection (Mortar, Howitzer, Rocket Artillery bypass this)
            const isTrenchProtected = (cell.unit!.category === UnitCategory.INFANTRY || cell.unit!.type === UnitType.MORTAR) && cell.obstacle && cell.obstacle.type === ObstacleType.TRENCH && !cell.obstacle.isHidden;
            if (isTrenchProtected && u.type !== UnitType.MORTAR && u.type !== UnitType.FIELD_GUN && u.type !== UnitType.ROCKET_ARTILLERY) return false;

            // Rocket Artillery Immunity: Immune to standard infantry fire
            if (cell.unit!.type === UnitType.ROCKET_ARTILLERY) {
              if (u.category === UnitCategory.INFANTRY && !attackerIsSpecInfantry) return false;
            }

            // Ghillie Recon Immunity (Field Gun in territory bypasses this)
            const isGhillieImmune = cell.unit!.type === UnitType.GHILLIE_RECON;
            if (isGhillieImmune && !(u.type === UnitType.HOWITZER && board[c.y][c.x].zone !== 'frontier')) return false;

            // MBT Immunity
            if (cell.unit!.type === UnitType.MBT) {
              const attackerInTerritory = board[c.y][c.x].zone !== 'frontier';
              const canHitMBT = u.type === UnitType.FIELD_GUN || 
                                u.type === UnitType.MBT ||
                                (u.type === UnitType.HOWITZER && attackerInTerritory);
              if (!canHitMBT) return false;
            }

            return true;
          });

          if (attacker) {
            const victimType = cell.unit.type;
            const attackerType = attacker.unit!.type;
            const isCommander = victimType === UnitType.COMMANDER;
            const isGhillie = victimType === UnitType.GHILLIE_RECON;

            if (isGhillie || isCommander) playBellPing();

            setGameState(prev => {
              if (!prev) return null;
              const tempBoard = [...prev.board.map(row => [...row])];
              tempBoard[y][x].unit = null;

              const { newBoard, updatedCommanderActions, updatedFlagActions, winner, revealedMessages } = applyPassiveEffects(
                tempBoard,
                prev.commanderSupplyActions,
                prev.flagOccupiedActions
              );

              const bonusActions = isCommander ? 2 : (isGhillie ? 1 : 0);
              const newActions = prev.actionsRemaining - 1 + bonusActions;
              const isTurnEnd = newActions <= 0 || winner;
              let finalWinner = winner;
              let finalCommanderActions = updatedCommanderActions;
              let finalFlagActions = updatedFlagActions;
              const nextPlayer = isTurnEnd ? (prev.currentPlayer === 'player1' ? 'player2' : 'player1') : prev.currentPlayer;
              
              if (isTurnEnd && !winner) {
                const transition = processTurnTransition(newBoard, prev.currentPlayer, updatedCommanderActions, updatedFlagActions);
                finalWinner = transition.winner;
                finalCommanderActions = transition.updatedCommanderActions;
                finalFlagActions = transition.updatedFlagActions;
              }

              const historyItems: HistoryItem[] = [...revealedMessages];
              historyItems.push({ text: `Range Elimination! ${attackerType} destroyed enemy ${victimType}.`, color: 'red' });
              
              if (isCommander) {
                historyItems.push({ text: `COMMANDER ELIMINATED! +2 Actions granted.`, color: 'red' });
              }
              if (isGhillie) {
                historyItems.push({ text: `GHILLIE RECON ELIMINATED! Locked in REVEAL mode until 2 free reveals used. (+1 Action Refunded)`, color: 'yellow' });
              }

              return {
                ...prev,
                board: newBoard,
                selectedCell: null,
                actionsRemaining: (newActions <= 0 || winner) ? getBaseActionsForPlayer(newBoard, nextPlayer) : newActions,
                currentPlayer: nextPlayer,
                winner: finalWinner,
                interactionMode: (newActions <= 0 || winner) ? 'normal' : (isGhillie ? 'reveal' : prev.interactionMode),
                freeRevealsRemaining: prev.freeRevealsRemaining + (isGhillie ? 2 : 0),
                commanderSupplyActions: finalCommanderActions,
                flagOccupiedActions: finalFlagActions,
                history: [...historyItems, ...prev.history].slice(0, 10)
              };
            });
            return;
          }
        }

        if (!gameState.selectedCell) {
          if (cell.unit && cell.unit.player === currentPlayer) {
            setGameState({ ...gameState, selectedCell: { x, y } });
          }
          return;
        }

        const selectedPos = gameState.selectedCell;
        const unit = board[selectedPos.y][selectedPos.x].unit!;
        const dx = Math.abs(x - selectedPos.x);
        const dy = Math.abs(y - selectedPos.y);
        const dist = dx + dy;
        const isOrthogonal = dx === 0 || dy === 0;

        if (x === selectedPos.x && y === selectedPos.y) {
          setGameState({ ...gameState, selectedCell: null });
          return;
        }

        if (isOrthogonal && (cell.unit || unit.type === UnitType.ROCKET_ARTILLERY)) {
          // Rocket Artillery can fire at empty ground? Or it hits friendlies if aiming at enemy.
          // The prompt says: "Can perform friendly fire when necessary. (if a friendly is in the range of 2 and 3, but only works with enemy in line of fire)"
          // This implies targeting an ENEMY triggers the effect on both cells.
          
          if (!cell.unit && unit.type !== UnitType.ROCKET_ARTILLERY) return;
          if (cell.unit && cell.unit.player === currentPlayer && unit.type !== UnitType.ROCKET_ARTILLERY) return;

          // Infantry cannot eliminate Panzer via range (except Elite/Commander)
          const attackerIsSpecInfantry = unit.type === UnitType.ELITE_TROOPER || unit.type === UnitType.COMMANDER;
          if (cell.unit && unit.category === UnitCategory.INFANTRY && cell.unit.category === UnitCategory.PANZER) {
            if (!attackerIsSpecInfantry) return;
          }

          // Rocket Artillery Immunity: Immune to standard infantry elimination range
          if (cell.unit && cell.unit.type === UnitType.ROCKET_ARTILLERY) {
             if (unit.category === UnitCategory.INFANTRY && !attackerIsSpecInfantry) {
               setGameState({
                 ...gameState,
                 selectedCell: null,
                 history: [{ text: `Blocked: Standard infantry fire cannot damage Rocket Artillery.`, color: 'white' }, ...gameState.history].slice(0, 10)
               });
               return;
             }
          }

          // Range checks
          if (unit.type === UnitType.MORTAR) {
            if (dist !== 2) return;
          } else if (unit.type === UnitType.FIELD_GUN) {
            if (dist !== 3) return;
          } else if (unit.type === UnitType.ROCKET_ARTILLERY) {
            if (dist !== 2 && dist !== 3) return;
            // Only fire if there's an enemy at either range 2 OR 3 in this direction?
            // "only works with enemy in line of fire"
            const stepX = dx === 0 ? 0 : (x > selectedPos.x ? 1 : -1);
            const stepY = dy === 0 ? 0 : (y > selectedPos.y ? 1 : -1);
            
            const cell2 = board[selectedPos.y + stepY * 2][selectedPos.x + stepX * 2];
            const cell3 = (selectedPos.y + stepY * 3 >= 0 && selectedPos.y + stepY * 3 < 15 && selectedPos.x + stepX * 3 >= 0 && selectedPos.x + stepX * 3 < 15)
               ? board[selectedPos.y + stepY * 3][selectedPos.x + stepX * 3]
               : null;
            
            const hasEnemyInRange = (cell2.unit && cell2.unit.player !== currentPlayer) || (cell3 && cell3.unit && cell3.unit.player !== currentPlayer);
            if (!hasEnemyInRange) return;

          } else if (unit.range > 1) {
            if (dist > unit.range) return;
            if (dist === 2) {
              const midX = selectedPos.x + (x > selectedPos.x ? 1 : x < selectedPos.x ? -1 : 0);
              const midY = selectedPos.y + (y > selectedPos.y ? 1 : y < selectedPos.y ? -1 : 0);
              if (board[midY][midX].unit) return;
            }
          } else {
            if (dist > unit.range) return;
          }

          // Multi-cell hit for Rocket Artillery
          if (unit.type === UnitType.ROCKET_ARTILLERY) {
            const stepX = dx === 0 ? 0 : (x > selectedPos.x ? 1 : -1);
            const stepY = dy === 0 ? 0 : (y > selectedPos.y ? 1 : -1);

            const cellsToHit = [
              { x: selectedPos.x + stepX * 2, y: selectedPos.y + stepY * 2 },
              { x: selectedPos.x + stepX * 3, y: selectedPos.y + stepY * 3 }
            ];

            setGameState(prev => {
              if (!prev) return null;
              const newBoard = prev.board.map(row => row.map(c => ({...c})));
              let newHistory = [...prev.history];
              let newActions = prev.actionsRemaining - 1;
              let extraReveals = 0;

              cellsToHit.forEach(pos => {
                if (pos.y < 0 || pos.y >= 15 || pos.x < 0 || pos.x >= 15) return;
                const target = newBoard[pos.y][pos.x];
                if (target.unit) {
                  const victimType = target.unit.type;
                  const isCommander = victimType === UnitType.COMMANDER;
                  const isGhillie = victimType === UnitType.GHILLIE_RECON;
                  
                  if (isGhillie || isCommander) playBellPing();

                  newHistory.push({ text: `Rocket Fire hits target at (${pos.x-7}, ${7-pos.y}): ${victimType}!`, color: 'red' });
                  if (isCommander) {
                    newHistory.push({ text: `COMMANDER ELIMINATED! +2 Actions granted.`, color: 'red' });
                    newActions += 2;
                  }
                  if (isGhillie) {
                    newHistory.push({ text: `GHILLIE RECON ELIMINATED! Locked in REVEAL mode until 2 free reveals used. (+1 Action Refunded)`, color: 'yellow' });
                    extraReveals += 2;
                    newActions += 1; // Refund
                  }
                  
                  newBoard[pos.y][pos.x].unit = null;
                }
              });

              const { newBoard: finalBoard, updatedCommanderActions, updatedFlagActions, winner, revealedMessages } = applyPassiveEffects(
                newBoard,
                prev.commanderSupplyActions,
                prev.flagOccupiedActions
              );

              const isTurnEnd = newActions <= 0 || winner;
              let finalWinner = winner;
              let finalCommanderActions = updatedCommanderActions;
              let finalFlagActions = updatedFlagActions;
              const nextPlayer = isTurnEnd ? (prev.currentPlayer === 'player1' ? 'player2' : 'player1') : prev.currentPlayer;

              if (isTurnEnd && !winner) {
                const transition = processTurnTransition(finalBoard, prev.currentPlayer, updatedCommanderActions, updatedFlagActions);
                finalWinner = transition.winner;
                finalCommanderActions = transition.updatedCommanderActions;
                finalFlagActions = transition.updatedFlagActions;
              }

              const nextActions = isTurnEnd ? getBaseActionsForPlayer(finalBoard, nextPlayer) : newActions;

              return {
                ...prev,
                board: finalBoard,
                actionsRemaining: nextActions,
                currentPlayer: nextPlayer,
                interactionMode: isTurnEnd ? 'normal' : (extraReveals > 0 ? 'reveal' : prev.interactionMode),
                freeRevealsRemaining: prev.freeRevealsRemaining + extraReveals,
                selectedCell: null, // Artllery always deselects
                commanderSupplyActions: finalCommanderActions,
                flagOccupiedActions: finalFlagActions,
                winner: finalWinner,
                history: [...revealedMessages, ...newHistory, ...prev.history].slice(0, 10)
              };
            });
            return;
          }

          // Use centralized helper for rule checking
          const check = checkActionValidity(unit, selectedPos, cell, board, 'elimination');
          if (!check.valid) {
            if (check.reason) {
              setGameState({
                ...gameState,
                selectedCell: null,
                history: [{ text: `Blocked: ${check.reason}`, color: 'white' }, ...gameState.history].slice(0, 10)
              });
            } else {
              setGameState({ ...gameState, selectedCell: null });
            }
            return;
          }

          const victimType = cell.unit!.type;
          const attackerType = unit.type;
          const isCommander = victimType === UnitType.COMMANDER;
          const isGhillie = victimType === UnitType.GHILLIE_RECON;

          if (isCommander || isGhillie) playBellPing();

          setGameState(prev => {
              const tempBoard = prev.board.map(row => row.map(c => ({...c})));
              tempBoard[y][x].unit = null;

              const { newBoard, updatedCommanderActions, updatedFlagActions, winner, revealedMessages } = applyPassiveEffects(
                tempBoard,
                prev.commanderSupplyActions,
                prev.flagOccupiedActions
              );

              const bonusActions = isCommander ? 2 : (isGhillie ? 1 : 0);
              const newActions = prev.actionsRemaining - 1 + bonusActions;
              const isTurnEnd = newActions <= 0 || winner;
              let finalWinner = winner;
              let finalCommanderActions = updatedCommanderActions;
              let finalFlagActions = updatedFlagActions;
              const nextPlayer = isTurnEnd ? (prev.currentPlayer === 'player1' ? 'player2' : 'player1') : prev.currentPlayer;
              
              if (isTurnEnd && !winner) {
                const transition = processTurnTransition(newBoard, prev.currentPlayer, updatedCommanderActions, updatedFlagActions);
                finalWinner = transition.winner;
                finalCommanderActions = transition.updatedCommanderActions;
                finalFlagActions = transition.updatedFlagActions;
              }

              const nextActions = isTurnEnd ? getBaseActionsForPlayer(newBoard, nextPlayer) : newActions;

              const historyItems: HistoryItem[] = [...revealedMessages];

              return {
                ...prev,
                board: newBoard,
                selectedCell: null,
                actionsRemaining: nextActions,
                currentPlayer: nextPlayer,
                winner: finalWinner,
                interactionMode: isTurnEnd ? 'normal' : (isGhillie ? 'reveal' : prev.interactionMode),
                freeRevealsRemaining: prev.freeRevealsRemaining + (isGhillie ? 2 : 0),
                commanderSupplyActions: finalCommanderActions,
                flagOccupiedActions: finalFlagActions,
                history: [...historyItems, ...prev.history].slice(0, 10)
              };
            });
            return;
          }
        }

      // 3. Mobility Mode (Move / Crash)
      if (interactionMode === 'mobility') {
        if (!gameState.selectedCell) {
          if (cell.unit && cell.unit.player === currentPlayer) {
            setGameState({ ...gameState, selectedCell: { x, y } });
          }
          return;
        }

        const selectedPos = gameState.selectedCell;
        const unit = board[selectedPos.y][selectedPos.x].unit!;
        
        if (x === selectedPos.x && y === selectedPos.y) {
          setGameState({ ...gameState, selectedCell: null });
          return;
        }

        // 1. Basic distance/orthogonal check via checkActionValidity
        const check = checkActionValidity(unit, selectedPos, cell, board, 'mobility');
        if (!check.valid) {
          setGameState({ ...gameState, selectedCell: null });
          return;
        }

        // 2. Path Truncation: Find the actual landing cell
        const dx = Math.abs(x - selectedPos.x);
        const dy = Math.abs(y - selectedPos.y);
        const stepX = dx === 0 ? 0 : (x > selectedPos.x ? 1 : -1);
        const stepY = dy === 0 ? 0 : (y > selectedPos.y ? 1 : -1);
        
        let finalX = selectedPos.x;
        let finalY = selectedPos.y;
        let currX = selectedPos.x + stepX;
        let currY = selectedPos.y + stepY;
        let stopReason = "";

        while (true) {
           const midCell = board[currY][currX];
           
           // ENEMY Pathblock: Forces stop AT this cell
           const isEnemyUnit = midCell.unit && midCell.unit.player !== currentPlayer;
           const isEnemyObstacle = midCell.obstacle && midCell.obstacle.player !== currentPlayer;
           
           if (isEnemyUnit || isEnemyObstacle) {
              finalX = currX;
              finalY = currY;
              stopReason = isEnemyUnit ? "Intercepted by enemy unit!" : "Stopped by enemy obstacle!";
              break;
           }
           
           // ALLIED Pathblock: Forces stop BEFORE this cell
           const isFriendlyUnit = midCell.unit && midCell.unit.player === currentPlayer;
           
           if (isFriendlyUnit) {
              // Stay at previous cell (finalX/finalY)
              if (finalX === selectedPos.x && finalY === selectedPos.y) {
                 // Blocked at the very first step
                 setGameState({ ...gameState, selectedCell: null, history: [{ text: "Path blocked by allied position.", color: "white" }, ...gameState.history].slice(0, 10) });
                 return;
              }
              break;
           }

           finalX = currX;
           finalY = currY;

           if (currX === x && currY === y) break;
           currX += stepX;
           currY += stepY;
        }

        // 3. Landing Validity Check (Re-check crash rules for the FINAL destination)
        const finalCell = board[finalY][finalX];
        if (finalCell.unit && finalCell.unit.player !== currentPlayer) {
           // Standard Crash Checks
           const isMBTTarget = finalCell.unit.type === UnitType.MBT;
           const isNormalArtilleryAttacker = unit.category === UnitCategory.ARTILLERY && unit.type !== UnitType.ROCKET_ARTILLERY;
           const isInfantryVsPanzer = unit.category === UnitCategory.INFANTRY && finalCell.unit.category === UnitCategory.PANZER;
           const isSpecInfantry = unit.type === UnitType.ELITE_TROOPER || unit.type === UnitType.COMMANDER;
           const isPanzerVsPanzer = unit.category === UnitCategory.PANZER && finalCell.unit.category === UnitCategory.PANZER;

           if (isMBTTarget) {
              setGameState({ ...gameState, selectedCell: null, history: [{ text: "Blocked: Cannot crash into an MBT.", color: "white" }, ...gameState.history].slice(0, 10) });
              return;
           }
           if (isNormalArtilleryAttacker) {
              setGameState({ ...gameState, selectedCell: null, history: [{ text: "Blocked: Slow Artillery cannot mobility crash.", color: "white" }, ...gameState.history].slice(0, 10) });
              return;
           }
           if (isInfantryVsPanzer && !isSpecInfantry) {
              setGameState({ ...gameState, selectedCell: null, history: [{ text: "Blocked: Standard Infantry cannot eliminate Panzers.", color: "white" }, ...gameState.history].slice(0, 10) });
              return;
           }
           if (isPanzerVsPanzer) {
              setGameState({ ...gameState, selectedCell: null, history: [{ text: "Blocked: Panzers cannot mobility crash other Panzers.", color: "white" }, ...gameState.history].slice(0, 10) });
              return;
           }
        }

        const tempBoard = board.map(row => row.map(c => ({...c})));
        let historyMsg = `${unit.type} moved to (${finalX-7}, ${7-finalY}).`;
        if (stopReason) historyMsg = `${stopReason} ${historyMsg}`;
        let historyColor: 'red' | 'green' | 'blue' | 'yellow' | 'white' = 'blue';
        let bonusActions = 0;
        let freeReveals = 0;
        let unitImmobilized = unit.isImmobilized;
        let unitEliminated = false;

        // Handle Crash (Enemy only)
        if (finalCell.unit && finalCell.unit.player !== currentPlayer) {
          const victim = finalCell.unit!;
          const isCommander = victim.type === UnitType.COMMANDER;
          const isGhillie = victim.type === UnitType.GHILLIE_RECON;

          if (isCommander || isGhillie) playBellPing();

          historyColor = 'red';
          historyMsg = `Mobility Crash! ${unit.type} crushed enemy ${victim.type}.`;
          
          if (isCommander) bonusActions = 2;
          if (isGhillie) {
            bonusActions = 1;
            freeReveals = 2;
          }

          // Special Rocket Artillery double destruction
          const isRocketArtilleryInvolved = unit.type === UnitType.ROCKET_ARTILLERY || victim.type === UnitType.ROCKET_ARTILLERY;
          if (isRocketArtilleryInvolved && unit.category !== UnitCategory.INFANTRY) { 
             historyMsg = `BOOM! Rocket Artillery exploded on impact! Both units destroyed!`;
             tempBoard[selectedPos.y][selectedPos.x].unit = null;
             tempBoard[finalY][finalX].unit = null;
             unitEliminated = true;
          } else {
             // Normal crash: acting unit enters target cell
             // Panzers (Armored) are not immobilized by crushing unarmored (Infantry/Artillery) targets
             const softensImpact = unit.category === UnitCategory.PANZER && victim.category !== UnitCategory.PANZER;
             const willBeImmobilized = !softensImpact;

             tempBoard[finalY][finalX].unit = { ...unit, isImmobilized: willBeImmobilized || unit.isImmobilized };
             tempBoard[selectedPos.y][selectedPos.x].unit = null;
             unitImmobilized = willBeImmobilized || unit.isImmobilized;

             if (softensImpact) {
               historyMsg += ` ${unit.type} remains operational.`;
             }
          }
        } else {
          // Normal Move
          tempBoard[finalY][finalX].unit = unit;
          tempBoard[selectedPos.y][selectedPos.x].unit = null;
        }

        if (!unitEliminated && tempBoard[finalY][finalX].obstacle) {
            const obs = tempBoard[finalY][finalX].obstacle!;
            const isEnemyObstacle = obs.player !== currentPlayer;

            if (isEnemyObstacle) {
              tempBoard[finalY][finalX].obstacle = { ...obs, isHidden: false };
            }

            const currentObs = tempBoard[finalY][finalX].obstacle!;
            if (currentObs.type === ObstacleType.TRENCH) {
              historyMsg += ` Entered a Trench.`;
            } else if (currentObs.type === ObstacleType.LAND_MINE && unit.type !== UnitType.ELITE_TROOPER) {
              if (isEnemyObstacle || !currentObs.isHidden) {
                unitEliminated = true;
                tempBoard[finalY][finalX].obstacle = { ...currentObs, isTriggered: true };
                historyMsg = `BOOM! ${unit.type} was ELIMINATED by a LANDMINE at (${finalX - 7}, ${7 - finalY}).`;
              }
            } else if (currentObs.type === ObstacleType.TANK_TRAP) {
              if ((unit.category === UnitCategory.PANZER || unit.type === UnitType.ROCKET_ARTILLERY) && (isEnemyObstacle || !currentObs.isHidden)) {
                unitImmobilized = true;
                tempBoard[finalY][finalX].obstacle = { ...currentObs, isTriggered: true };
                historyMsg += ` Stuck in a TANK TRAP!`;
              }
            } else if (currentObs.type === ObstacleType.BARBED_WIRE) {
              if ((unit.category === UnitCategory.INFANTRY || unit.category === UnitCategory.ARTILLERY) && (isEnemyObstacle || !currentObs.isHidden)) {
                unitImmobilized = true;
                tempBoard[finalY][finalX].obstacle = { ...currentObs, isTriggered: true };
                historyMsg += ` Stuck in BARBED WIRE!`;
              }
            } else if (currentObs.type === ObstacleType.FLAG && isEnemyObstacle) {
              historyMsg += ` Occupying enemy FLAG!`;
            }

            if (unitEliminated) {
                tempBoard[finalY][finalX].unit = null;
            } else if (unitImmobilized) {
                tempBoard[finalY][finalX].unit = { ...unit, isImmobilized: true };
            }
        }

        setGameState(prev => {
          if (!prev) return prev;
          const { newBoard, updatedCommanderActions, updatedFlagActions, winner: baseWinner, revealedMessages } = applyPassiveEffects(
            tempBoard,
            prev.commanderSupplyActions,
            prev.flagOccupiedActions
          );

          const newActions = prev.actionsRemaining - 1 + bonusActions;
          const isTurnEnd = newActions <= 0 || baseWinner;
          let finalWinner = baseWinner;
          let finalCommanderActions = updatedCommanderActions;
          let finalFlagActions = updatedFlagActions;
          const nextPlayer = isTurnEnd ? (prev.currentPlayer === 'player1' ? 'player2' : 'player1') : prev.currentPlayer;
          
          if (isTurnEnd && !baseWinner) {
             const transition = processTurnTransition(newBoard, prev.currentPlayer, updatedCommanderActions, updatedFlagActions);
             finalWinner = transition.winner;
             finalCommanderActions = transition.updatedCommanderActions;
             finalFlagActions = transition.updatedFlagActions;
          }

          const nextActions = isTurnEnd ? getBaseActionsForPlayer(newBoard, nextPlayer) : newActions;

          const historyEntries: HistoryItem[] = [...revealedMessages];
          historyEntries.push({ text: historyMsg, color: historyColor });
          if (bonusActions > 0 && bonusActions === 2) historyEntries.push({ text: "COMMANDER ELIMINATED! +2 Actions.", color: 'red' });
          if (freeReveals > 0) historyEntries.push({ text: "GHILLIE RECON ELIMINATED! Locked in REVEAL mode until 2 free reveals used. (+1 Action Refund)", color: 'yellow' });

          return {
            ...prev,
            board: newBoard,
            actionsRemaining: nextActions,
            currentPlayer: nextPlayer,
            interactionMode: isTurnEnd ? 'normal' : (freeReveals > 0 ? 'reveal' : 'mobility'),
            freeRevealsRemaining: prev.freeRevealsRemaining + freeReveals,
            selectedCell: null,
            commanderSupplyActions: finalCommanderActions,
            flagOccupiedActions: finalFlagActions,
            winner: finalWinner,
            history: [...historyEntries, ...prev.history].slice(0, 10)
          };
        });
        return;
      }

      // 4. Ability Mode (Ghillie Recon)
      if (interactionMode === 'ability') {
        if (!gameState.selectedCell) return;
        const selectedPos = gameState.selectedCell;
        const unit = board[selectedPos.y][selectedPos.x].unit!;
        if (unit.type !== UnitType.GHILLIE_RECON) return;

        const dx = Math.abs(x - selectedPos.x);
        const dy = Math.abs(y - selectedPos.y);
        const dist = dx + dy;
        const isOrthogonal = dx === 0 || dy === 0;

        if (isOrthogonal && dist === 1 && cell.obstacle && cell.obstacle.isHidden) {
          const tempBoard = [...board.map(row => [...row])];
          tempBoard[y][x].obstacle = { ...cell.obstacle, isHidden: false };
          
          const { newBoard: finalBoard, updatedCommanderActions, updatedFlagActions, winner, revealedMessages } = applyPassiveEffects(
            tempBoard,
            gameState.commanderSupplyActions,
            gameState.flagOccupiedActions
          );

          const curNewActions = actionsRemaining - 1;
          const isTurnEnd = curNewActions <= 0 || winner;
          const nextPlayer = isTurnEnd ? (currentPlayer === 'player1' ? 'player2' : 'player1') : currentPlayer;
          const nextActions = isTurnEnd ? getBaseActionsForPlayer(finalBoard, nextPlayer) : curNewActions;
          
          setGameState({
            ...gameState,
            board: finalBoard,
            selectedCell: null,
            actionsRemaining: nextActions,
            currentPlayer: nextPlayer,
            winner: winner,
            interactionMode: 'normal',
            commanderSupplyActions: updatedCommanderActions,
            flagOccupiedActions: updatedFlagActions,
            history: [{ text: `Ability: Enemy ${cell.obstacle.type} uncovered at (${x-7}, ${7-y}).`, color: 'blue' }, ...revealedMessages, ...gameState.history].slice(0, 10)
          });
          return;
        }
        setGameState({ ...gameState, selectedCell: null, interactionMode: 'normal' });
        return;
      }

      // 5. Normal Mode (Selection)
      if (cell.unit && cell.unit.player === currentPlayer) {
        setGameState({ ...gameState, selectedCell: { x, y } });
        return;
      }
      
      setGameState({ ...gameState, selectedCell: null });
    }
  };

  const COORDINATE_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) => i - 7);

  // Sound effect for turn changes
  useEffect(() => {
    if (gameState && gameState.phase === 'battle') {
      const playPing = () => {
        // Authentic M1 Garand ping sound
        const audio = new Audio('https://www.myinstants.com/media/sounds/m1-garand-ping.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio playback prevented by browser policy", e));
        
        // Voice announcement
        const msg = new SpeechSynthesisUtterance();
        msg.text = gameState.currentPlayer === 'player1' ? "Red Attacker's Turn" : "Blue Defender's Turn";
        msg.rate = 0.9;
        msg.pitch = 1;
        msg.volume = 0.6;
        window.speechSynthesis.speak(msg);
      };
      playPing();
    }
  }, [gameState?.currentPlayer, gameState?.phase]);

  if (!gameState || gameState.phase === 'menu') {
    const isSinglePlayerSetup = gameState?.isSinglePlayer;

    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)',
            backgroundSize: '40px 40px' 
          }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-4xl flex flex-col items-center"
        >
          {/* Huge Title Section */}
          <div className="flex flex-col items-center mb-16 text-center">
            <Zap size={96} fill="#F27D26" stroke="#F27D26" className="drop-shadow-[0_0_20px_rgba(242,125,38,0.6)] mb-6 animate-pulse" />
            <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter italic leading-none drop-shadow-2xl">
              Field Stratagem
            </h1>
            <h2 className="text-xl md:text-3xl font-mono text-[#F27D26] tracking-[0.5em] uppercase opacity-90 pl-[0.5em] mt-4">
              Tactical Command Interface
            </h2>
          </div>
          <div className="w-full space-y-4">
            {!isSinglePlayerSetup ? (
              <>
                <button 
                  onClick={() => setGameState(prev => prev ? { ...prev, isSinglePlayer: true } : prev)}
                  className="w-full py-6 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#333] rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-4 group"
                >
                  <Cpu size={24} className="text-[#F27D26]" />
                  Single Player
                  <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
                <button 
                  onClick={startTwoPlayer}
                  className="w-full py-6 bg-[#0a2e3a] hover:bg-[#0e3a4a] border border-[#144b5b] rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-4 group"
                >
                  <User size={24} className="text-blue-400" />
                  2-Player
                  <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </>
            ) : !gameState.botDifficulty ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 w-full"
              >
                <div className="space-y-4">
                  <p className="text-center text-xs font-mono uppercase tracking-widest opacity-40">Choose Your Side</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setGameState(prev => prev ? { ...prev, playerSide: 'player1' } : prev)}
                      className={`py-6 rounded-xl font-bold uppercase tracking-widest transition-all border-2 ${gameState?.playerSide === 'player1' ? 'bg-red-900/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-[#1A1A1A] border-[#333] hover:border-red-500/50'}`}
                    >
                      Attacker (Red)
                    </button>
                    <button 
                      onClick={() => setGameState(prev => prev ? { ...prev, playerSide: 'player2' } : prev)}
                      className={`py-6 rounded-xl font-bold uppercase tracking-widest transition-all border-2 ${gameState?.playerSide === 'player2' ? 'bg-blue-900/50 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-[#1A1A1A] border-[#333] hover:border-blue-500/50'}`}
                    >
                      Defender (Blue)
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-center text-xs font-mono uppercase tracking-widest opacity-40">Tactical Difficulty</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['easy', 'normal', 'hard'].map((diff) => (
                      <button 
                        key={diff}
                        onClick={() => startSinglePlayer(gameState?.playerSide || 'player1', diff as any)}
                        className={`py-4 rounded-lg font-bold uppercase text-xs tracking-widest transition-all border ${
                          diff === 'easy' ? 'hover:bg-green-600/20 hover:border-green-500' :
                          diff === 'normal' ? 'hover:bg-yellow-600/20 hover:border-yellow-500' :
                          'hover:bg-red-600/20 hover:border-red-500'
                        } bg-[#1A1A1A] border-[#333]`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setGameState(prev => prev ? { ...prev, isSinglePlayer: false, playerSide: 'player1', botDifficulty: null } : prev)}
                  className="w-full py-3 text-xs font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Return to Main Menu
                </button>
              </motion.div>
            ) : null}
          </div>
        </motion.div>

        <footer className="absolute bottom-8 text-[10px] uppercase tracking-[0.3em] opacity-20">
          Stratagem Command & Control Systems &copy; 2026
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Header / HUD */}
      <header className="border-b border-[#1A1A1A] bg-[#0F0F0F] p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
              <Zap className="text-[#F27D26] fill-[#F27D26]" size={24} />
              Field Stratagem
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Tactical Command Interface</span>
          </div>
          
          <div className="h-10 w-[1px] bg-[#1A1A1A]" />

          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Phase</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${gameState.phase === 'placement' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span className="font-mono font-bold uppercase tracking-widest">{gameState.phase}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Current Player</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'player1' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <span className="font-mono font-bold uppercase tracking-widest">{gameState.currentPlayer === 'player1' ? 'Red Attacker' : 'Blue Defender'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={initializeGame}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors group"
            title="Reset Board"
          >
            <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform" />
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 max-w-[1600px] mx-auto relative">
        {/* Anti-Cheat Overlay for Bot Placement */}
        {gameState.isSinglePlayer && gameState.phase === 'placement' && gameState.currentPlayer !== gameState.playerSide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-8 rounded-2xl m-6"
          >
            <div className="w-24 h-24 border-t-4 border-b-4 border-[#F27D26] rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(242,125,38,0.5)]"></div>
            <h2 className="text-4xl font-black uppercase italic tracking-widest text-[#F27D26] mb-4">
              Intelligence Warning
            </h2>
            <p className="text-xl font-mono uppercase tracking-[0.3em] text-white/70 max-w-md">
              Enemy signals detected. Counter-intelligence protocols active while Opponent deploys strategic assets.
            </p>
            <div className="mt-12 flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-[#F27D26] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Battlefield */}
        <div className="flex flex-col gap-4">
          {gameState.phase === 'battle' && (
            <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4 flex flex-wrap gap-4 items-center justify-center sticky top-[89px] z-40 shadow-2xl backdrop-blur-md min-h-20">
              {gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide ? (
                <div className="flex items-center gap-6 animate-pulse">
                   <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Strategic Logic</span>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono font-bold uppercase tracking-widest text-[#F27D26]">Calculating maneuvers...</span>
                    </div>
                  </div>
                  <div className="h-8 w-[1px] bg-[#2A2A2A] mx-2" />
                  <div className="text-[10px] font-mono opacity-60 max-w-[200px]">
                    Enemy commander is evaluating position and anticipating response features.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col mr-4">
                <span className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Actions Left</span>
                <div className="flex gap-1">
                  {Array.from({ length: gameState.actionsRemaining }).map((_, i) => (
                    <div key={i} className="w-4 h-1 bg-[#F27D26]" />
                  ))}
                  {Array.from({ length: INITIAL_ACTIONS - gameState.actionsRemaining }).map((_, i) => (
                    <div key={i} className="w-4 h-1 bg-white/10" />
                  ))}
                </div>
              </div>

              <div className="h-8 w-[1px] bg-[#2A2A2A] mx-2" />

              <div className="flex gap-2">
                <button
                  onMouseEnter={() => setHoveredInstruction(UNIT_INTEL['mobility'])}
                  onMouseLeave={() => setHoveredInstruction(null)}
                  onClick={() => setGameState({ ...gameState, interactionMode: gameState.interactionMode === 'mobility' ? 'normal' : 'mobility', selectedCell: null })}
                  disabled={gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${gameState.interactionMode === 'mobility' ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-green-500'} ${gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  <Move size={12} />
                  Mobility
                </button>
                <button
                  onMouseEnter={() => setHoveredInstruction(UNIT_INTEL['elimination'])}
                  onMouseLeave={() => setHoveredInstruction(null)}
                  onClick={() => setGameState({ ...gameState, interactionMode: gameState.interactionMode === 'elimination' ? 'normal' : 'elimination', selectedCell: null })}
                  disabled={gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${gameState.interactionMode === 'elimination' ? 'bg-red-500 border-red-500 text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-red-500'} ${gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  <Target size={12} />
                  Elimination
                </button>
                <button
                  onMouseEnter={() => setHoveredInstruction(UNIT_INTEL['reveal'])}
                  onMouseLeave={() => setHoveredInstruction(null)}
                  onClick={() => setGameState({ ...gameState, interactionMode: gameState.interactionMode === 'reveal' ? 'normal' : 'reveal', selectedCell: null })}
                  disabled={gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || (gameState.freeRevealsRemaining > 0 && gameState.interactionMode === 'reveal')}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${gameState.interactionMode === 'reveal' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-blue-500'} ${gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || (gameState.freeRevealsRemaining > 0 && gameState.interactionMode === 'reveal') ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  <Eye size={12} />
                  Reveal
                </button>
                {gameState.selectedCell && gameState.board[gameState.selectedCell.y][gameState.selectedCell.x].unit?.type === UnitType.GHILLIE_RECON && (
                  <button
                    onMouseEnter={() => setHoveredInstruction(UNIT_INTEL['ability'])}
                    onMouseLeave={() => setHoveredInstruction(null)}
                    onClick={() => setGameState({ ...gameState, interactionMode: gameState.interactionMode === 'ability' ? 'normal' : 'ability' })}
                    disabled={gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${gameState.interactionMode === 'ability' ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-cyan-500'} ${gameState.actionsRemaining <= 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    <Radar size={12} />
                    Tactical Reveal
                  </button>
                )}
              </div>

              <div className="h-8 w-[1px] bg-[#2A2A2A] mx-2" />

              <button
                onClick={endTurn}
                disabled={(gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0}
                className={`px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${(gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) || gameState.freeRevealsRemaining > 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
              >
                End Turn
                <ArrowRight size={14} />
              </button>

              {gameState.interactionMode !== 'normal' && (
                <button
                  onClick={() => setGameState({ ...gameState, interactionMode: 'normal', selectedCell: null })}
                  disabled={gameState.freeRevealsRemaining > 0}
                  className={`px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all ml-2 ${gameState.freeRevealsRemaining > 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      )}

          {gameState.phase === 'placement' && (
            <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4 flex flex-wrap gap-4 items-center justify-center sticky top-[89px] z-40 shadow-2xl backdrop-blur-md">
              {!gameState.showPlacementConfirm && (
                <>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40 mr-4">
                    {gameState.placementSubPhase === 'obstacles' ? 'Select Obstacle:' : 'Select Unit:'}
                  </span>
                  
                  {gameState.placementSubPhase === 'obstacles' ? (
                    [
                      { type: ObstacleType.TRENCH, icon: <TrenchIcon size={25} className="text-purple-400" />, label: UNIT_LABELS[ObstacleType.TRENCH] },
                      { type: ObstacleType.BARBED_WIRE, icon: <BarbedWireIcon size={25} className="text-[#B7410E]" />, label: UNIT_LABELS[ObstacleType.BARBED_WIRE] },
                      { type: ObstacleType.LAND_MINE, icon: <LandmineIcon size={32} />, label: UNIT_LABELS[ObstacleType.LAND_MINE] },
                      { type: ObstacleType.TANK_TRAP, icon: <TankTrapIcon size={25} />, label: UNIT_LABELS[ObstacleType.TANK_TRAP] },
                      { type: ObstacleType.FLAG, icon: <Flag size={18} strokeWidth={2.2} />, label: UNIT_LABELS[ObstacleType.FLAG] },
                    ].map((item) => {
                      const count = gameState.placementCounts[gameState.currentPlayer][item.type];
                      const isSelected = gameState.selectedObstacleType === item.type;
                      return (
                        <button
                          key={item.type}
                          onMouseEnter={() => setHoveredInstruction(UNIT_INTEL[item.type] || null)}
                          onMouseLeave={() => setHoveredInstruction(null)}
                          onClick={() => setGameState({ ...gameState, selectedObstacleType: item.type })}
                          disabled={count === 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide)}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                            ${isSelected ? 'bg-[#F27D26] border-[#F27D26] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#F27D26]'}
                            ${count === 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) ? 'opacity-20 cursor-not-allowed' : ''}
                          `}
                        >
                          {item.icon}
                          <span className="text-xs font-bold uppercase">{item.label}</span>
                          <span className="ml-2 px-2 py-0.5 bg-black/40 rounded text-[10px]">{count}</span>
                        </button>
                      );
                    })
                  ) : (
                    [
                      { type: UnitType.TROOPER, icon: (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 14L12 8L18 14" />
                        </svg>
                      ), label: UNIT_LABELS[UnitType.TROOPER] },
                      { type: UnitType.ELITE_TROOPER, icon: (
                        <div className="w-1.5 h-3 bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 rounded-xs border border-white/20" />
                      ), label: UNIT_LABELS[UnitType.ELITE_TROOPER] },
                      { type: UnitType.GHILLIE_RECON, icon: (
                        <svg viewBox="0 0 100 100" className="w-5 h-5">
                          <path d="M22,30 L7,50 L12,85 L40,85 L47,50 L42,35 Z" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                          <path d="M78,30 L93,50 L88,85 L60,85 L53,50 L58,35 Z" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                          <rect x="33" y="40" width="34" height="12" rx="3" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                          <circle cx="50" cy="46" r="6" fill="#1A1C20" />
                          <circle cx="23" cy="66" r="22" fill="#4B5D67" stroke="#1A1C20" strokeWidth="5" />
                          <circle cx="77" cy="66" r="22" fill="#4B5D67" stroke="#1A1C20" strokeWidth="5" />
                          <circle cx="23" cy="66" r="16" fill="#A8D1D1" />
                          <circle cx="77" cy="66" r="16" fill="#A8D1D1" />
                        </svg>
                      ), label: UNIT_LABELS[UnitType.GHILLIE_RECON] },
                      { type: UnitType.COMMANDER, icon: (
                        <div className="flex items-center gap-0.5 text-white">
                          <Star size={8} fill="currentColor" stroke="none" />
                          <Star size={8} fill="currentColor" stroke="none" />
                          <Star size={8} fill="currentColor" stroke="none" />
                        </div>
                      ), label: UNIT_LABELS[UnitType.COMMANDER] },
                      { type: UnitType.APC, icon: (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M2 11 V17 H20 L17 11 Z" />
                          <circle cx="5" cy="18" r="2" />
                          <circle cx="9" cy="18" r="2" />
                          <circle cx="13" cy="18" r="2" />
                          <circle cx="17" cy="18" r="2" />
                          <path d="M5 11 V9 L7 7 H11 L13 9 V11 Z" />
                          <path d="M13 9 H18" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      ), label: UNIT_LABELS[UnitType.APC] },
                      { type: UnitType.HOWITZER, icon: (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor">
                          <path d="M10 17 L2 21" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M8 17 L12 11" strokeWidth="2" />
                          <path d="M6 13 L20 7" strokeWidth="3" />
                          <circle cx="10" cy="17" r="4" fill="currentColor" stroke="none" />
                        </svg>
                      ), label: UNIT_LABELS[UnitType.HOWITZER] },
                      { type: UnitType.IFV, icon: <IFVIcon className="w-4 h-4" />, label: UNIT_LABELS[UnitType.IFV] },
                      { type: UnitType.MORTAR, icon: <MortarIcon className="w-4 h-4" />, label: UNIT_LABELS[UnitType.MORTAR] },
                      { type: UnitType.FIELD_GUN, icon: <FieldGunIcon className="w-4 h-4" />, label: UNIT_LABELS[UnitType.FIELD_GUN] },
                      { type: UnitType.MBT, icon: <MBTIcon className="w-5 h-5" />, label: UNIT_LABELS[UnitType.MBT] },
                      { type: UnitType.ROCKET_ARTILLERY, icon: <RocketArtilleryIcon className="w-5 h-5" />, label: UNIT_LABELS[UnitType.ROCKET_ARTILLERY] },
                    ].map((item) => {
                      const count = gameState.unitPlacementCounts[gameState.currentPlayer][item.type] || 0;
                      const isSelected = gameState.selectedUnitType === item.type;
                      const stats = UNIT_STATS[item.type];
                      const shapeStyle = getUnitShapeStyle({ type: item.type, category: stats.category } as any);
    
                      return (
                        <button
                          key={item.type}
                          onMouseEnter={() => setHoveredInstruction(UNIT_INTEL[item.type] || null)}
                          onMouseLeave={() => setHoveredInstruction(null)}
                          onClick={() => setGameState({ ...gameState, selectedUnitType: item.type })}
                          disabled={count === 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide)}
                          className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
                            ${isSelected ? 'bg-[#F27D26] border-[#F27D26] text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#F27D26]'}
                            ${count === 0 || (gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide) ? 'opacity-20 cursor-not-allowed' : ''}
                          `}
                        >
                          <div 
                            className={`w-7 h-7 flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-white/5'}`}
                            style={shapeStyle}
                          >
                            {item.icon}
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] font-bold uppercase leading-tight">{item.label}</span>
                            <span className="text-[9px] opacity-40 leading-none">Left: {count}</span>
                          </div>
                        </button>
                      );
                    })
                  )}

                  <div className="h-8 w-[1px] bg-[#2A2A2A] mx-2" />
                </>
              )}

              <div className="flex gap-2">
                {gameState.showPlacementConfirm && (
                  <button
                    onClick={confirmRandomization}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all animate-pulse"
                  >
                    <Shield size={14} />
                    <span className="text-xs font-bold uppercase">Confirm Layout</span>
                  </button>
                )}

                <button
                  onClick={gameState.placementSubPhase === 'obstacles' ? randomizeObstacles : randomizeUnits}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all"
                >
                  <RotateCcw size={14} />
                  <span className="text-xs font-bold uppercase">Randomize</span>
                </button>

                {gameState.showPlacementConfirm && (
                  <button
                    onClick={revokeRandomization}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                  >
                    <X size={14} />
                    <span className="text-xs font-bold uppercase">Revoke Layout</span>
                  </button>
                )}
              </div>

              {!gameState.showPlacementConfirm && (
                <button
                  onClick={initializeGame}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all shadow-lg"
                >
                  <RotateCcw size={14} />
                  <span className="text-xs font-bold uppercase text-[10px]">Reset</span>
                </button>
              )}

              {/* Only show "Finish" button if manually placed everything (no randomization pending) or if we want to allow manual skip */}
              {!gameState.showPlacementConfirm && (gameState.placementSubPhase === 'obstacles' ? 
                gameState.placementCounts[gameState.currentPlayer][ObstacleType.FLAG] === 0 :
                Object.values(gameState.unitPlacementCounts[gameState.currentPlayer]).every(c => c === 0)
              ) && (
                <button
                  onClick={() => {
                    const nextPlayer = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
                    const nextSubPhase = gameState.currentPlayer === 'player2' ? 'units' : gameState.placementSubPhase;
                    const nextPhase = (gameState.currentPlayer === 'player2' && gameState.placementSubPhase === 'units') ? 'battle' : 'placement';
                    const history = [...gameState.history];
                    
                    if (gameState.currentPlayer === 'player1') {
                      if (gameState.placementSubPhase === 'obstacles') {
                        history.unshift('Player 1 (Red Attacker) finished obstacle placement. Player 2 (Blue Defender), deploy your obstacles.');
                      } else {
                        history.unshift('Player 1 (Red Attacker) finished unit placement. Player 2 (Blue Defender), deploy your obstacles.');
                      }
                    } else {
                      if (gameState.placementSubPhase === 'obstacles') {
                        history.unshift('All obstacles deployed. Player 2 (Blue Defender), deploy your units.');
                      } else {
                        history.unshift('All units deployed. Battle Phase: Command your forces!');
                      }
                    }

                    const finalBoard = (gameState.placementSubPhase === 'units') 
                      ? gameState.board.map(row => row.map(cell => {
                          if (cell.obstacle && cell.obstacle.player === gameState.currentPlayer) {
                            return { ...cell, obstacle: { ...cell.obstacle, isHidden: true } };
                          }
                          return cell;
                        }))
                      : gameState.board;

                    setGameState({
                      ...gameState,
                      board: finalBoard,
                      currentPlayer: nextPlayer,
                      placementSubPhase: (gameState.currentPlayer === 'player2' && gameState.placementSubPhase === 'obstacles') ? 'units' : nextSubPhase,
                      phase: nextPhase,
                      history: history.slice(0, 10)
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all font-bold"
                >
                  <ArrowRight size={14} />
                  <span className="text-xs font-bold uppercase">Finish {gameState.placementSubPhase === 'obstacles' ? 'Obstacles' : 'Units'}</span>
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-[40px_1fr_40px] grid-rows-[40px_1fr_40px] w-full bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl shadow-2xl p-2">
            {/* Top Labels */}
            <div />
            <div className="flex justify-between items-center px-1">
              {Array.from({ length: BOARD_SIZE }, (_, i) => i - 7).map(l => (
                <div key={l} className="w-full text-center text-[10px] font-mono opacity-40">{l}</div>
              ))}
            </div>
            <div />

            {/* Left Labels */}
            <div className="flex flex-col justify-between items-center py-1">
              {Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i).map(l => (
                <div key={l} className="h-full flex items-center text-[10px] font-mono opacity-40">{l}</div>
              ))}
            </div>

            {/* Board */}
            <div className="relative aspect-square bg-black/20 overflow-hidden">
              {/* Grid Background */}
              <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 opacity-5 pointer-events-none">
                {Array.from({ length: 225 }).map((_, i) => (
                  <div key={i} className="border border-white" />
                ))}
              </div>

              {/* Cells */}
              <div className="grid grid-cols-15 grid-rows-15 h-full w-full">
                {gameState.board.map((row, y) => 
                  row.map((cell, x) => {
                    const isBotTurn = gameState.isSinglePlayer && gameState.currentPlayer !== gameState.playerSide;
                    const highlightsEnabled = !isBotTurn;

                    const isSelected = highlightsEnabled && gameState.selectedCell?.x === x && gameState.selectedCell?.y === y;
                    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                    const dx = gameState.selectedCell ? Math.abs(x - gameState.selectedCell.x) : 0;
                    const dy = gameState.selectedCell ? Math.abs(y - gameState.selectedCell.y) : 0;
                    
                    const selectedUnit = gameState.selectedCell ? gameState.board[gameState.selectedCell.y][gameState.selectedCell.x].unit : null;
                    let mobility = selectedUnit?.movement || 0;
                    if (selectedUnit?.type === UnitType.TROOPER && gameState.selectedCell && gameState.board[gameState.selectedCell.y][gameState.selectedCell.x].zone === 'frontier') {
                      mobility = 2;
                    }

                    const isOrthogonal = dx === 0 || dy === 0;

                    const canMove = highlightsEnabled && gameState.interactionMode === 'mobility' && gameState.selectedCell && selectedUnit && !selectedUnit.isImmobilized && (dx + dy <= mobility) && isOrthogonal && !cell.unit;
                    
                    let canAttack = false;
                    let canShoot = false;
                    if (highlightsEnabled && gameState.selectedCell && selectedUnit && isOrthogonal) {
                      const dist = dx + dy;
                      // Range attack (Elimination Mode)
                      if (gameState.interactionMode === 'elimination' && cell.unit && cell.unit.player !== gameState.currentPlayer) {
                        const u = selectedUnit;
                        const target = cell.unit;
                        const isO = dx === 0 || dy === 0;
                        
                        let validRange = (u.type === UnitType.MORTAR) ? dist === 2 : (u.type === UnitType.FIELD_GUN) ? dist === 3 : (u.type === UnitType.ROCKET_ARTILLERY) ? (dist === 2 || dist === 3) : dist <= u.range;

                        const isSpecInfantry = u.type === UnitType.ELITE_TROOPER || u.type === UnitType.COMMANDER;
                        const isInfantryVsPanzer = u.category === UnitCategory.INFANTRY && target.category === UnitCategory.PANZER;
                        const canInfantryHitPanzer = !isInfantryVsPanzer || isSpecInfantry;
                        
                        const attackerInTerritory = gameState.board[gameState.selectedCell!.y][gameState.selectedCell!.x].zone !== 'frontier';
                        const isHeavyArty = u.type === UnitType.FIELD_GUN || 
                                           u.type === UnitType.ROCKET_ARTILLERY || 
                                           (u.type === UnitType.HOWITZER && attackerInTerritory);
                        
                        const canHowitzerHit = true;

                        const isTrenchProtected = (target.category === UnitCategory.INFANTRY || target.type === UnitType.MORTAR) && cell.obstacle?.type === ObstacleType.TRENCH && !cell.obstacle?.isHidden;
                        const validTrench = isTrenchProtected && u.type !== UnitType.MORTAR && u.type !== UnitType.FIELD_GUN && u.type !== UnitType.ROCKET_ARTILLERY;

                        const isGhillieImmune = target.type === UnitType.GHILLIE_RECON;
                        const validGhillie = isGhillieImmune && !isHeavyArty;

                        // Rocket Artillery Immunity: Immune to standard infantry fire
                        let isRocketImmune = false;
                        if (target.type === UnitType.ROCKET_ARTILLERY) {
                          if (u.category === UnitCategory.INFANTRY && !isSpecInfantry) isRocketImmune = true;
                        }

                        // Linear shot blocking check
                        let isBlocked = false;
                        if (u.type !== UnitType.MORTAR && u.type !== UnitType.FIELD_GUN && u.type !== UnitType.ROCKET_ARTILLERY && dist > 1) {
                          if (dist === 2) {
                            const midX = gameState.selectedCell!.x + (x > gameState.selectedCell!.x ? 1 : x < gameState.selectedCell!.x ? -1 : 0);
                            const midY = gameState.selectedCell!.y + (y > gameState.selectedCell!.y ? 1 : y < gameState.selectedCell!.y ? -1 : 0);
                            if (gameState.board[midY][midX].unit) isBlocked = true;
                          }
                        }

                        // MBT Immunity
                        let isMBTImmune = false;
                        if (target.type === UnitType.MBT) {
                           const canHitMBT = isHeavyArty || u.type === UnitType.MBT;
                           if (!canHitMBT) isMBTImmune = true;
                        }

                        if (isO && validRange && canInfantryHitPanzer && canHowitzerHit && !validTrench && !validGhillie && !isBlocked && !isRocketImmune && !isMBTImmune) {
                          canShoot = true;
                        }
                      }
                      // Mobility crash (Mobility Mode)
                      if (gameState.interactionMode === 'mobility' && !selectedUnit.isImmobilized && dist <= mobility && cell.unit && cell.unit.player !== gameState.currentPlayer) {
                        // Path check
                        const stepX = dx === 0 ? 0 : (x > gameState.selectedCell!.x ? 1 : -1);
                        const stepY = dy === 0 ? 0 : (y > gameState.selectedCell!.y ? 1 : -1);
                        let currX = gameState.selectedCell!.x + stepX;
                        let currY = gameState.selectedCell!.y + stepY;
                        let pathBlocked = false;
                        while (currX !== x || currY !== y) {
                          if (gameState.board[currY][currX].unit) {
                            pathBlocked = true;
                            break;
                          }
                          currX += stepX;
                          currY += stepY;
                        }

                        if (!pathBlocked) {
                          const u = selectedUnit;
                          const t = cell.unit!;
                          const isMBTTarget = t.type === UnitType.MBT;
                          const isNormalArtilleryAttacker = u.category === UnitCategory.ARTILLERY && u.type !== UnitType.ROCKET_ARTILLERY;

                          if (!isMBTTarget && !isNormalArtilleryAttacker) {
                             const isInfantryVsPanzer = u.category === UnitCategory.INFANTRY && t.category === UnitCategory.PANZER;
                             const isSpecInfantry = u.type === UnitType.ELITE_TROOPER || u.type === UnitType.COMMANDER;
                             const canInfantryHitPanzer = !isInfantryVsPanzer || isSpecInfantry;
                             const isPanzerVsPanzer = u.category === UnitCategory.PANZER && t.category === UnitCategory.PANZER;
                             
                             if (canInfantryHitPanzer && !isPanzerVsPanzer) {
                                canAttack = true;
                             }
                          }
                        }
                      }
                    }

                    // Path Highlighting for Mobility
                    let isPath = false;
                    if (highlightsEnabled && gameState.interactionMode === 'mobility' && gameState.selectedCell && selectedUnit && !selectedUnit.isImmobilized && (dx === 0 || dy === 0)) {
                      if (dx + dy <= mobility && dx + dy > 0 && !cell.unit) {
                        isPath = true;
                      }
                    }

                    // Global highlights for interaction modes
                    let isGlobalEliminationTarget = false;
                    let isGlobalRevealTarget = false;

                    if (highlightsEnabled && gameState.interactionMode === 'elimination' && cell.unit && cell.unit.player !== gameState.currentPlayer) {
                      // Check if any of my units can shoot this target
                      const myUnits = gameState.board.flat().filter(c => c.unit && c.unit.player === gameState.currentPlayer);
                      isGlobalEliminationTarget = myUnits.some(c => {
                        const u = c.unit!;
                        const ddx = Math.abs(x - c.x);
                        const ddy = Math.abs(y - c.y);
                        const ddist = ddx + ddy;
                        const isO = ddx === 0 || ddy === 0;
                        if (!isO) return false;
                        
                        let validRange = (u.type === UnitType.MORTAR) ? ddist === 2 : (u.type === UnitType.FIELD_GUN) ? ddist === 3 : (u.type === UnitType.ROCKET_ARTILLERY) ? (ddist === 2 || ddist === 3) : ddist <= u.range;

                        const isSpecInfantry = u.type === UnitType.ELITE_TROOPER || u.type === UnitType.COMMANDER;
                        const isInfantryVsPanzer = u.category === UnitCategory.INFANTRY && cell.unit!.category === UnitCategory.PANZER;
                        const canInfantryHitPanzer = !isInfantryVsPanzer || isSpecInfantry;
                        
                        const attackerInTerritory = gameState.board[c.y][c.x].zone !== 'frontier';
                        const isHeavyArty = u.type === UnitType.FIELD_GUN || 
                                           u.type === UnitType.ROCKET_ARTILLERY || 
                                           (u.type === UnitType.HOWITZER && attackerInTerritory);
                        
                        const canHowitzerHit = true;

                        const isTrenchProtected = (cell.unit!.category === UnitCategory.INFANTRY || cell.unit!.type === UnitType.MORTAR) && cell.obstacle?.type === ObstacleType.TRENCH && !cell.obstacle?.isHidden;
                        const validTrench = isTrenchProtected && u.type !== UnitType.MORTAR && u.type !== UnitType.FIELD_GUN && u.type !== UnitType.ROCKET_ARTILLERY;

                        const isGhillieImmune = cell.unit!.type === UnitType.GHILLIE_RECON;
                        const validGhillie = isGhillieImmune && !isHeavyArty;

                        // Rocket Artillery Immunity: Immune to standard infantry fire
                        if (cell.unit!.type === UnitType.ROCKET_ARTILLERY) {
                          if (u.category === UnitCategory.INFANTRY && !isSpecInfantry) return false;
                        }

                        // MBT Immunity
                        if (cell.unit!.type === UnitType.MBT) {
                          const canHitMBT = isHeavyArty || u.type === UnitType.MBT;
                          if (!canHitMBT) return false;
                        }

                        // Linear shot blocking check
                        let isBlocked = false;
                        if (u.type !== UnitType.MORTAR && u.type !== UnitType.FIELD_GUN && u.type !== UnitType.ROCKET_ARTILLERY && ddist > 1) {
                          if (ddist === 2) {
                            const midX = c.x + (x > c.x ? 1 : x < c.x ? -1 : 0);
                            const midY = c.y + (y > c.y ? 1 : y < c.y ? -1 : 0);
                            if (gameState.board[midY][midX].unit) isBlocked = true;
                          }
                        }

                        return validRange && canInfantryHitPanzer && canHowitzerHit && !validTrench && !validGhillie && !isBlocked;
                      });
                    }

                    if (highlightsEnabled && gameState.interactionMode === 'reveal' && cell.obstacle && cell.obstacle.isHidden) {
                      isGlobalRevealTarget = true;
                    }

                    return (
                      <div 
                        key={`${x}-${y}`}
                        onClick={() => handleCellClick(x, y)}
                        onMouseEnter={() => {
                          setHoveredCell({ x, y });
                          if (cell.unit) {
                            setHoveredInstruction(UNIT_INTEL[cell.unit.type] || null);
                          } else if (cell.obstacle && !cell.obstacle.isHidden) {
                            setHoveredInstruction(UNIT_INTEL[cell.obstacle.type] || null);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredCell(null);
                          setHoveredInstruction(null);
                        }}
                        style={{
                          backgroundColor: 
                            cell.zone === 'supply_line' ? '#BFBFBF' :
                            cell.zone === 'territory' ? '#808080' :
                            cell.zone === 'frontier' ? '#595959' : undefined
                        }}
                        className={`
                          relative border-[0.5px] border-[#1A1A1A] cursor-pointer transition-all duration-200
                          ${isSelected ? 'bg-[#F27D26]/20' : ''}
                          ${canMove ? '' : ''}
                          ${canAttack ? 'bg-orange-500/40 ring-1 ring-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] z-20' : ''}
                          ${canShoot ? 'bg-purple-500/30' : ''}
                          ${isPath ? '' : ''}
                          ${isGlobalEliminationTarget ? 'ring-2 ring-inset ring-red-500 bg-red-500/10' : ''}
                          ${isGlobalRevealTarget ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/10' : ''}
                          ${isHovered ? 'bg-white/[0.05]' : ''}
                          ${x === 7 && y === 7 ? 'bg-white/[0.03]' : ''}
                        `}
                      >
                        {/* Path dot for mobility */}
                        {isPath && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                          </div>
                        )}

                        {/* Center Marker */}
                        {x === 7 && y === 7 && !isPath && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                        )}

                        {/* Obstacles */}
                        {cell.obstacle && (
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${cell.obstacle.isHidden ? (cell.obstacle.player === 'player1' ? 'bg-red-900/40' : 'bg-blue-900/40') : ''}`}>
                            {cell.obstacle.isHidden ? (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <div className="w-4 h-4 border border-white/20 rotate-45" />
                              </div>
                            ) : (
                              <motion.div 
                                initial={{ rotateY: 90 }}
                                animate={{ rotateY: 0 }}
                                className="flex items-center justify-center"
                              >
                                { cell.obstacle.type === ObstacleType.FLAG ? (
                                  <Flag size={25} strokeWidth={2.2} className={cell.obstacle.player === 'player1' ? 'text-red-500' : 'text-blue-500'} />
                                ) : cell.obstacle.type === ObstacleType.TRENCH ? (
                                  <TrenchIcon size={30} className="text-purple-500" />
                                ) : cell.obstacle.type === ObstacleType.BARBED_WIRE ? (
                                  <BarbedWireIcon size={30} className="text-[#B7410E]" />
                                ) : cell.obstacle.type === ObstacleType.LAND_MINE ? (
                                  <LandmineIcon size={30} />
                                ) : cell.obstacle.type === ObstacleType.TANK_TRAP ? (
                                  <TankTrapIcon size={30} />
                                ) : (
                                  <AlertTriangle size={16} className="text-red-500" />
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* Units */}
                        {cell.unit && (
                          <motion.div 
                            layoutId={cell.unit.id}
                            style={{
                              ...getUnitShapeStyle(cell.unit),
                              backgroundColor: cell.unit.isImmobilized ? '#1a1a1a' : undefined,
                              opacity: gameState.interactionMode === 'reveal' ? 0.25 : 1
                            }}
                            className={`
                              absolute inset-1 flex flex-col items-center justify-center z-10 transition-colors
                              ${cell.unit.isImmobilized 
                                ? `border-2 shadow-[0_0_8px_inset_rgba(0,0,0,0.5)] ${cell.unit.player === 'player1' ? 'border-red-500' : 'border-blue-500'}` 
                                : `${cell.unit.player === 'player1' ? 'bg-red-600/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-600/80 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} border border-white/20`}
                            `}
                          >
                            <div className={`w-full h-full flex items-center justify-center p-0.5 ${cell.unit.isImmobilized ? 'grayscale opacity-60' : ''}`}>
                              {cell.unit.type === UnitType.TROOPER ? (
                                <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 14L12 8L18 14" />
                                </svg>
                              ) : cell.unit.type === UnitType.ELITE_TROOPER ? (
                                <div className="w-2 h-3/4 bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 rounded-xs shadow-sm border border-black/20" />
                              ) : cell.unit.type === UnitType.GHILLIE_RECON ? (
                                <svg viewBox="0 0 100 100" className="w-[32px] h-[32px]">
                                  {/* Left Housing */}
                                  <path d="M22,30 L7,50 L12,85 L40,85 L47,50 L42,35 Z" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                                  {/* Right Housing */}
                                  <path d="M78,30 L93,50 L88,85 L60,85 L53,50 L58,35 Z" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                                  {/* Bridge/Main Body */}
                                  <rect x="33" y="40" width="34" height="15" rx="3" fill="#4B5D67" stroke="#1A1C20" strokeWidth="4" />
                                  <circle cx="50" cy="48" r="8" fill="#1A1C20" />
                                  {/* Lenses */}
                                  <circle cx="23" cy="66" r="22" fill="#4B5D67" stroke="#1A1C20" strokeWidth="5" />
                                  <circle cx="77" cy="66" r="22" fill="#4B5D67" stroke="#1A1C20" strokeWidth="5" />
                                  <circle cx="23" cy="66" r="16" fill="#A8D1D1" />
                                  <circle cx="77" cy="66" r="16" fill="#A8D1D1" />
                                  {/* Lens Highlights */}
                                  <path d="M12,60 A14,14 0 0 1 18,54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                                  <path d="M66,60 A14,14 0 0 1 72,54" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                                </svg>
                              ) : cell.unit.type === UnitType.COMMANDER ? (
                                <div className="flex items-center justify-center gap-0.5">
                                  <Star size={11} fill="white" stroke="none" />
                                  <Star size={11} fill="white" stroke="none" />
                                  <Star size={11} fill="white" stroke="none" />
                                </div>
                              ) : cell.unit.type === UnitType.APC ? (
                                <svg viewBox="0 0 24 24" className="w-full h-full" fill="white">
                                  <path d="M2 11 V17 H20 L17 11 Z" />
                                  <circle cx="5" cy="18" r="2" />
                                  <circle cx="9" cy="18" r="2" />
                                  <circle cx="13" cy="18" r="2" />
                                  <circle cx="17" cy="18" r="2" />
                                  <path d="M5 11 V9 L7 7 H11 L13 9 V11 Z" />
                                  <path d="M13 9 H18" stroke="white" strokeWidth="1" />
                                </svg>
                              ) : cell.unit.type === UnitType.HOWITZER ? (
                                <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="white">
                                  {/* Trail/Legs */}
                                  <path d="M10 18 L2 22" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                                  {/* Carriage/Shield */}
                                  <path d="M8 17 L12 11" strokeWidth="2" />
                                  {/* Main Barrel */}
                                  <path d="M5 14 L21 7" strokeWidth="3.5" strokeLinecap="butt" />
                                  {/* Recoil mechanism tube above barrel */}
                                  <path d="M9 11 L18 7.5" strokeWidth="1.2" />
                                  {/* Heavy Duty Wheel */}
                                  <circle cx="10" cy="18" r="4.5" fill="#2D3748" stroke="white" strokeWidth="1" />
                                  <circle cx="10" cy="18" r="1.5" fill="white" />
                                </svg>
                              ) : cell.unit.type === UnitType.IFV ? (
                                <IFVIcon className="w-full h-full text-white" />
                              ) : cell.unit.type === UnitType.MORTAR ? (
                                <MortarIcon className="w-full h-full text-white" />
                              ) : cell.unit.type === UnitType.FIELD_GUN ? (
                                <FieldGunIcon className="w-full h-full text-white" />
                              ) : cell.unit.type === UnitType.MBT ? (
                                <MBTIcon className="w-full h-full text-white" />
                              ) : cell.unit.type === UnitType.ROCKET_ARTILLERY ? (
                                <RocketArtilleryIcon className="w-full h-full text-white" />
                              ) : (
                                <span className="text-[8px] font-black uppercase leading-none">
                                   UNT
                                </span>
                              )}
                            </div>
                            {/* Status Indicators (Stuck/Protected) */}
                            <div className="absolute bottom-0 right-0 flex gap-0.5 p-0.5 bg-black/40 rounded-tl-sm z-20">
                              {cell.unit.isImmobilized && cell.obstacle?.type === ObstacleType.BARBED_WIRE && (
                                <BarbedWireIcon size={12} className="text-[#B7410E]" />
                              )}
                              {cell.unit.isImmobilized && cell.obstacle?.type === ObstacleType.TANK_TRAP && (
                                <TankTrapIcon size={10} />
                              )}
                              {/* Show Trench icon if protected unit is in a trench (protected) */}
                              {(cell.unit.category === UnitCategory.INFANTRY || cell.unit.type === UnitType.MORTAR) && cell.obstacle?.type === ObstacleType.TRENCH && !cell.obstacle.isHidden && (
                                <TrenchIcon size={12} className="text-purple-400" />
                              )}
                              {/* Fallback Zap for generic immobilization if no matching obstacle found */}
                              {cell.unit.isImmobilized && !cell.obstacle && (
                                <Zap size={10} className="text-yellow-400" />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Labels */}
            <div className="flex flex-col justify-between items-center py-1">
              {Array.from({ length: BOARD_SIZE }, (_, i) => 7 - i).map(l => (
                <div key={l} className="h-full flex items-center text-[10px] font-mono opacity-40">{l}</div>
              ))}
            </div>

            {/* Bottom Labels */}
            <div />
            <div className="flex justify-between items-center px-1">
              {Array.from({ length: BOARD_SIZE }, (_, i) => i - 7).map(l => (
                <div key={l} className="w-full text-center text-[10px] font-mono opacity-40">{l}</div>
              ))}
            </div>
            <div />
          </div>
        </div>

        {/* Sidebar / Logs */}
        <aside className="flex flex-col gap-6 sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
          {/* Selected Cell Info */}
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl overflow-hidden shrink-0">
            <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest opacity-40">Tactical Intel</span>
              <Info size={14} className="opacity-40" />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold uppercase tracking-wider">
                      {hoveredCell ? `Sector (${hoveredCell.x - 7}, ${7 - hoveredCell.y})` : 'No Sector Selected'}
                    </h3>
                    <p className="text-[10px] opacity-40 uppercase">
                      {hoveredCell ? (
                        Math.abs(7 - hoveredCell.y) === 7 ? 'Supply Line' :
                        Math.abs(7 - hoveredCell.y) >= 3 ? 'Territorial Zone' :
                        'Frontier Zone'
                      ) : 'Awaiting Data...'}
                    </p>
                  </div>
                  {hoveredCell && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase opacity-40 block mb-1">Status</span>
                      <span className="font-mono text-sm font-bold text-[#F27D26]">
                        {gameState.board[hoveredCell.y][hoveredCell.x].unit ? (
                          UNIT_LABELS[gameState.board[hoveredCell.y][hoveredCell.x].unit!.type]
                        ) : gameState.board[hoveredCell.y][hoveredCell.x].obstacle ? (
                          gameState.board[hoveredCell.y][hoveredCell.x].obstacle?.isHidden ? 'HIDDEN' : UNIT_LABELS[gameState.board[hoveredCell.y][hoveredCell.x].obstacle!.type]
                        ) : 'EMPTY'}
                      </span>
                    </div>
                  )}
                </div>

                {gameState.phase === 'placement' && (
                  <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Placement Instructions</p>
                    <p className="text-xs leading-relaxed opacity-40">
                      {hoveredInstruction || defaultInstruction}
                    </p>
                  </div>
                )}

                {gameState.phase === 'battle' && (
                  <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Battle Instructions</p>
                    <p className="text-xs leading-relaxed opacity-40">
                      {hoveredInstruction || defaultInstruction}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Log */}
          <div className="flex-1 bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl overflow-hidden flex flex-col min-h-[300px]">
            <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest opacity-40">Battle Log</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="p-4 font-mono text-[11px] space-y-2 overflow-y-auto">
              {gameState.history.map((log, i) => {
                const isObj = typeof log !== 'string';
                const text = isObj ? log.text : log;
                const colorClass = isObj ? (
                  log.color === 'red' ? 'text-red-400' :
                  log.color === 'green' ? 'text-green-400' :
                  log.color === 'blue' ? 'text-blue-400' :
                  log.color === 'yellow' ? 'text-yellow-400' : 'text-white'
                ) : (
                  text.includes('destroyed') || text.includes('Elimination') || text.includes('ELIMINATED') || text.includes('BOOM!') || text.includes('Crash') || text.includes('Stuck') ? 'text-red-400' : 
                  text.includes('moved') ? 'text-blue-400' : 
                  text.includes('Blocked') ? 'text-white' : ''
                );

                return (
                  <div key={i} className="flex gap-2 border-l border-[#2A2A2A] pl-3 py-1">
                    <span className="opacity-20">{gameState.history.length - i}</span>
                    <span className={colorClass}>
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* Victory Modal */}
      <AnimatePresence>
        {gameState.winner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0F0F0F] border border-[#F27D26] p-12 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(242,125,38,0.3)]"
            >
              <div className="w-20 h-20 bg-[#F27D26]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} className="text-[#F27D26]" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">Mission Complete</h2>
              <p className="text-xl font-mono text-[#F27D26] mb-8 uppercase tracking-widest">
                {gameState.winner === 'player1' ? 'Red Attacker Victorious' : 'Blue Defender Victorious'}
              </p>
              <button 
                onClick={initializeGame}
                className="w-full py-4 bg-[#F27D26] hover:bg-[#D66A1E] text-white font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 group"
              >
                Restart Operation
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-4 text-center opacity-20 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2026 Stratagem Command & Control Systems
      </footer>
    </div>
  );
}
