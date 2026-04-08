// 象棋规则实现
import { BOARD_W, BOARD_H } from './constants';
import type { PieceChar, PlayerColor } from './types';

// 检查位置是否在棋盘内
export function isValidPos(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_H && col >= 0 && col < BOARD_W;
}

// 获取棋子颜色
export function getPieceColor(piece: string | PieceChar | ''): PlayerColor | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'red' : 'black';
}

// 检查将帅是否对面
export function isGeneralsFacing(board: PieceChar[][]): boolean {
  let rK: [number, number] | null = null;
  let bK: [number, number] | null = null;

  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      const p = board[r][c];
      if (p === 'K') rK = [r, c];
      if (p === 'k') bK = [r, c];
    }
  }

  if (!rK || !bK) return false;

  if (rK[1] === bK[1]) {
    const col = rK[1];
    const min = Math.min(rK[0], bK[0]);
    const max = Math.max(rK[0], bK[0]);
    for (let r = min + 1; r < max; r++) {
      if (board[r][col] !== '') return false;
    }
    return true;
  }
  return false;
}

// 检查是否被将军
export function isCheck(board: PieceChar[][], side: PlayerColor): boolean {
  let kPos: [number, number] | null = null;
  const kChar = side === 'red' ? 'K' : 'k';

  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      if (board[r][c] === kChar) {
        kPos = [r, c];
        break;
      }
    }
    if (kPos) break;
  }

  if (!kPos) return true;

  const [kr, kc] = kPos;
  const opp = side === 'red' ? 'black' : 'red';

  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      const p = board[r][c];
      if (!p || getPieceColor(p) !== opp) continue;
      if (canAttack(board, r, c, kr, kc)) return true;
    }
  }
  return false;
}

// 检查是否能攻击指定位置
export function canAttack(board: PieceChar[][], fr: number, fc: number, tr: number, tc: number): boolean {
  const piece = board[fr][fc];
  if (!piece) return false;

  const type = piece.toLowerCase() as string;
  const color = getPieceColor(piece);
  const dr = tr - fr;
  const dc = tc - fc;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  if (!isValidPos(tr, tc)) return false;

  switch (type) {
    case 'k': // 帅/将
      if ((absDr + absDc) !== 1 && !(absDr === 0 && absDc === 0)) {
        // 直线进退
        if (fc === tc && fr !== tr) {
          const step = dr > 0 ? 1 : -1;
          for (let r = fr + step; r !== tr; r += step) {
            if (board[r][fc] !== '') return false;
          }
          return board[tr][tc] === (color === 'red' ? 'k' : 'K');
        }
        return false;
      }
      // 九宫限制
      if (color === 'red') {
        if (tr < 7 || tr > 9 || tc < 3 || tc > 5) return false;
      } else {
        if (tr < 0 || tr > 2 || tc < 3 || tc > 5) return false;
      }
      return true;

    case 'a': // 仕/士
      if (absDr !== 1 || absDc !== 1) return false;
      if (color === 'red') {
        if (tr < 7 || tr > 9 || tc < 3 || tc > 5) return false;
      } else {
        if (tr < 0 || tr > 2 || tc < 3 || tc > 5) return false;
      }
      return true;

    case 'e': // 相/象
      if (absDr !== 2 || absDc !== 2) return false;
      const mr = (fr + tr) / 2;
      const mc = (fc + tc) / 2;
      if (!isValidPos(mr, mc) || board[mr][mc] !== '') return false;
      if (color === 'red' && tr < 5) return false;
      if (color === 'black' && tr > 4) return false;
      return true;

    case 'h': // 马
      if (!((absDr === 1 && absDc === 2) || (absDr === 2 && absDc === 1))) return false;
      // 检查马腿
      const legR = fr + (dr > 0 ? 1 : -1) * (absDr === 2 ? 1 : 0);
      const legC = fc + (dc > 0 ? 1 : -1) * (absDc === 2 ? 1 : 0);
      if (!isValidPos(legR, legC) || board[legR][legC] !== '') return false;
      return true;

    case 'r': // 车
      if (fr !== tr && fc !== tc) return false;
      let sr = 0, sc = 0;
      if (fr === tr) sc = dc > 0 ? 1 : -1;
      else sr = dr > 0 ? 1 : -1;
      for (let r = fr + sr, c = fc + sc; r !== tr || c !== tc; r += sr, c += sc) {
        if (board[r][c] !== '') return false;
      }
      return true;

    case 'c': // 炮
      if (fr !== tr && fc !== tc) return false;
      let cnt = 0;
      let sR = 0, sC = 0;
      if (fr === tr) sC = dc > 0 ? 1 : -1;
      else sR = dr > 0 ? 1 : -1;
      for (let r = fr + sR, c = fc + sC; r !== tr || c !== tc; r += sR, c += sC) {
        if (board[r][c] !== '') cnt++;
      }
      return board[tr][tc] === '' ? cnt === 0 : cnt === 1;

    case 's': // 兵/卒
      let fwd = color === 'red' ? -1 : 1;
      // 前进
      if (dr === fwd && dc === 0) return true;
      // 过河后横走
      const crossed = (color === 'red' && fr <= 4) || (color === 'black' && fr >= 5);
      if (crossed && dr === 0 && Math.abs(dc) === 1) return true;
      return false;

    default:
      return false;
  }
}

// 生成所有合法着法
export function generateLegalMoves(board: PieceChar[][], side: PlayerColor): Array<{ from: [number, number]; to: [number, number]; piece: PieceChar }> {
  const moves: Array<{ from: [number, number]; to: [number, number]; piece: PieceChar }> = [];

  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      const piece = board[r][c];
      if (!piece || getPieceColor(piece) !== side) continue;

      for (let tr = 0; tr < BOARD_H; tr++) {
        for (let tc = 0; tc < BOARD_W; tc++) {
          const target = board[tr][tc];
          if (target && getPieceColor(target) === side) continue;
          if (!canAttack(board, r, c, tr, tc)) continue;

          // 复制棋盘并模拟移动
          const newBoard = board.map(row => [...row]) as PieceChar[][];
          newBoard[tr][tc] = piece;
          newBoard[r][c] = '';

          // 检查是否会导致己方被将军
          if (!isCheck(newBoard, side)) {
            moves.push({ from: [r, c], to: [tr, tc], piece });
          }
        }
      }
    }
  }

  return moves;
}

// 检查是否无合法着法（被将死）
export function isCheckmate(board: PieceChar[][], side: PlayerColor): boolean {
  return generateLegalMoves(board, side).length === 0;
}

// 应用着法
export function applyMove(board: PieceChar[][], move: { from: [number, number]; to: [number, number]; piece: PieceChar }): void {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  board[tr][tc] = move.piece;
  board[fr][fc] = '' as PieceChar;
}

// 克隆棋盘
export function cloneBoard(board: PieceChar[][]): PieceChar[][] {
  return board.map(row => [...row]) as PieceChar[][];
}

// 获取棋子可攻击的敌方棋子位置
export function getAttackedPieces(board: PieceChar[][], side: PlayerColor): Array<{ row: number; col: number; piece: PieceChar }> {
  const attacked: Array<{ row: number; col: number; piece: PieceChar }> = [];
  const opp = side === 'red' ? 'black' : 'red';

  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      const piece = board[r][c];
      if (!piece || getPieceColor(piece) !== side) continue;

      for (let tr = 0; tr < BOARD_H; tr++) {
        for (let tc = 0; tc < BOARD_W; tc++) {
          const target = board[tr][tc];
          if (!target || getPieceColor(target) !== opp) continue;
          if (canAttack(board, r, c, tr, tc)) {
            attacked.push({ row: tr, col: tc, piece: target });
          }
        }
      }
    }
  }

  return attacked;
}

// 获取下一步可能将军的线路（威胁显示）
export function getThreateningMoves(board: PieceChar[][], side: PlayerColor): Array<{ from: [number, number]; to: [number, number] }> {
  const threats: Array<{ from: [number, number]; to: [number, number] }> = [];
  const opp = side === 'red' ? 'black' : 'red';
  const kChar = opp === 'red' ? 'K' : 'k';

  // 找到对方将帅位置
  let kPos: [number, number] | null = null;
  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      if (board[r][c] === kChar) {
        kPos = [r, c];
        break;
      }
    }
    if (kPos) break;
  }

  if (!kPos) return threats;

  // 找出所有能攻击到对方将帅的着法
  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      const piece = board[r][c];
      if (!piece || getPieceColor(piece) !== side) continue;

      if (canAttack(board, r, c, kPos[0], kPos[1])) {
        threats.push({ from: [r, c], to: kPos });
      }
    }
  }

  return threats;
}