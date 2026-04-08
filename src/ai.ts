// AI 引擎
import { pieceValue, positionBonus, RANDOM_OPENING_MOVES } from './constants';
import type { PieceChar, PlayerColor, Move, MoveWithScore } from './types';
import { cloneBoard, applyMove, generateLegalMoves } from './rules';

// 评估函数 - 包含棋子价值和位置价值
export function evaluate(board: PieceChar[][]): number {
  let score = 0;

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;

      // 基础棋子价值
      const baseValue = pieceValue[p as PieceChar] || 0;

      // 位置价值（使AI走子更符合人类棋理）
      const posBonus = positionBonus[p as PieceChar]?.[r]?.[c] || 0;

      score += baseValue + posBonus;
    }
  }

  return score;
}

// 获取排序后的着法（考虑吃子价值）
export function getSortedMoves(board: PieceChar[][], side: PlayerColor): Move[] {
  const moves = generateLegalMoves(board, side);

  return moves.sort((a, b) => {
    const targetA = board[a.to[0]][a.to[1]];
    const targetB = board[b.to[0]][b.to[1]];

    const valA = targetA ? Math.abs(pieceValue[targetA as PieceChar] || 0) : 0;
    const valB = targetB ? Math.abs(pieceValue[targetB as PieceChar] || 0) : 0;

    return valB - valA;
  });
}

// Alpha-Beta 剪枝算法
export function alphaBeta(
  board: PieceChar[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  side: PlayerColor
): number {
  const moves = getSortedMoves(board, side);

  if (depth === 0 || moves.length === 0) {
    return evaluate(board);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = cloneBoard(board);
      applyMove(newBoard, move);
      const evalVal = alphaBeta(newBoard, depth - 1, alpha, beta, false, side === 'red' ? 'black' : 'red');
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = cloneBoard(board);
      applyMove(newBoard, move);
      const evalVal = alphaBeta(newBoard, depth - 1, alpha, beta, true, side === 'red' ? 'black' : 'red');
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// 计算胜利率（基于局面评估）
export function calculateWinRate(board: PieceChar[][]): { redWinRate: number; blackWinRate: number } {
  const score = evaluate(board); // 正分表示红方优势，负分表示黑方优势

  // 使用S型曲线将分数转换为胜率
  // 分数范围大约 -3000 到 3000
  const k = 0.003; // 曲线陡峭程度
  const redWinRate = 1 / (1 + Math.exp(-k * score));
  const blackWinRate = 1 - redWinRate;

  return {
    redWinRate: Math.round(redWinRate * 100),
    blackWinRate: Math.round(blackWinRate * 100)
  };
}

// 选择最佳着法
export function selectBestMove(
  board: PieceChar[][],
  side: PlayerColor,
  depth: number,
  moveCount: number,
  onThinking?: () => void,
  onThinkingEnd?: () => void
): Move | null {
  const moves = getSortedMoves(board, side);
  if (moves.length === 0) return null;

  // 开局随机性
  if (moveCount < RANDOM_OPENING_MOVES) {
    const move = moves[Math.floor(Math.random() * moves.length)];
    return move;
  }

  if (onThinking) onThinking();

  let bestMoves: Move[] = [];
  let bestScore = side === 'red' ? -Infinity : Infinity;
  const candidateScores: MoveWithScore[] = [];

  for (const move of moves) {
    const newBoard = cloneBoard(board);
    applyMove(newBoard, move);

    let evalScore: number;
    if (side === 'red') {
      evalScore = alphaBeta(newBoard, depth - 1, -Infinity, Infinity, false, 'black');
    } else {
      evalScore = alphaBeta(newBoard, depth - 1, -Infinity, Infinity, true, 'red');
    }

    // 添加少量随机性避免完全相同的选择
    evalScore += (Math.random() - 0.5) * 2;

    candidateScores.push({ ...move, score: evalScore });

    if (side === 'red') {
      if (evalScore > bestScore) {
        bestScore = evalScore;
        bestMoves = [move];
      } else if (Math.abs(evalScore - bestScore) < 0.001) {
        bestMoves.push(move);
      }
    } else {
      if (evalScore < bestScore) {
        bestScore = evalScore;
        bestMoves = [move];
      } else if (Math.abs(evalScore - bestScore) < 0.001) {
        bestMoves.push(move);
      }
    }
  }

  // 随机选择最佳着法
  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  if (onThinkingEnd) onThinkingEnd();

  return chosen;
}

// 分析着法并返回评分和变化
export function analyzeMove(
  board: PieceChar[][],
  move: Move,
  side: PlayerColor,
  depth: number
): { score: number; variation: string; secondBestDiff?: number } {
  const newBoard = cloneBoard(board);
  applyMove(newBoard, move);

  const score = side === 'red'
    ? alphaBeta(newBoard, depth - 1, -Infinity, Infinity, false, 'black')
    : alphaBeta(newBoard, depth - 1, -Infinity, Infinity, true, 'red');

  return {
    score: side === 'red' ? score : -score,
    variation: ''
  };
}

// 检查是否进入残局（棋子较少时）
export function isEndgame(board: PieceChar[][]): boolean {
  let pieceCount = 0;
  for (const row of board) {
    for (const p of row) {
      if (p) pieceCount++;
    }
  }
  return pieceCount <= 10;
}

// 获取局面评估详情
export function getEvaluationDetail(board: PieceChar[][]): {
  material: number;
  position: number;
  total: number;
  assessment: string;
} {
  let material = 0;
  let position = 0;

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) continue;
      material += pieceValue[p as PieceChar] || 0;
      position += positionBonus[p as PieceChar]?.[r]?.[c] || 0;
    }
  }

  const total = material + position;
  let assessment: string;

  if (total > 500) assessment = '大优';
  else if (total > 200) assessment = '优势';
  else if (total > 50) assessment = '稍优';
  else if (total > -50) assessment = '均势';
  else if (total > -200) assessment = '稍劣';
  else if (total > -500) assessment = '劣势';
  else assessment = '大劣';

  return { material, position, total, assessment };
}