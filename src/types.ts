// 类型定义

export type PlayerColor = 'red' | 'black';
export type PieceType = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'S' | 'k' | 'a' | 'e' | 'h' | 'r' | 'c' | 's';
export type PieceChar = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'S' | 'k' | 'a' | 'e' | 'h' | 'r' | 'c' | 's' | '';

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: [number, number];
  to: [number, number];
  piece: PieceChar;
}

export interface MoveWithScore extends Move {
  score: number;
}

export interface GameState {
  board: PieceChar[][];
  currentPlayer: PlayerColor;
  gameOver: boolean;
  winner: PlayerColor | null;
  moveCount: number;
}

export interface HistoryState {
  board: PieceChar[][];
  currentPlayer: PlayerColor;
  gameOver: boolean;
  winner: PlayerColor | null;
  moveCount: number;
}

export interface LogEntry {
  step: number;
  side: PlayerColor;
  moveDesc: string;
  reason: string;
  score: number;
}

export interface PickedPiece {
  row: number;
  col: number;
  piece: PieceChar;
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number;
  move: Move | null;
  startTime: number;
  callback: (() => void) | null;
}

export interface SelectedState {
  piece: Position | null;
  legalMoves: { toRow: number; toCol: number }[];
}

export type ThemeName = 'classic' | 'modern' | 'dark' | 'wooden';

export interface Theme {
  name: ThemeName;
  boardBg: string;
  boardBorder: string;
  cellLight: string;
  cellDark: string;
  highlight: string;
  text: string;
}

export const THEMES: Theme[] = [
  {
    name: 'classic',
    boardBg: '#f2e1c0',
    boardBorder: '#aa8e6c',
    cellLight: '#f2e1c0',
    cellDark: '#d4c4a0',
    highlight: '#f0e68c',
    text: '#3d2a1a'
  },
  {
    name: 'modern',
    boardBg: '#e8e8e8',
    boardBorder: '#888888',
    cellLight: '#f5f5f5',
    cellDark: '#e0e0e0',
    highlight: '#90ee90',
    text: '#333333'
  },
  {
    name: 'dark',
    boardBg: '#2b2b2b',
    boardBorder: '#555555',
    cellLight: '#3a3a3a',
    cellDark: '#333333',
    highlight: '#4a6741',
    text: '#e0e0e0'
  },
  {
    name: 'wooden',
    boardBg: '#c9a66b',
    boardBorder: '#8b6914',
    cellLight: '#deb887',
    cellDark: '#c4a35a',
    highlight: '#ffd700',
    text: '#4a3520'
  }
];