// 游戏状态管理
import type { PlayerColor, PieceChar, Position, Move, LogEntry, GameState, MoveWithScore } from './types';
import { BOARD_W, BOARD_H, initBoard, pieceChars, AI_DEPTH_LEVELS, pieceNames } from './constants';
import { cloneBoard, applyMove, generateLegalMoves, isCheck as isCheckRule, isCheckmate, getAttackedPieces, getThreateningMoves, getPieceColor, isValidPos } from './rules';
import { evaluate, getSortedMoves, alphaBeta, calculateWinRate, getEvaluationDetail, isEndgame } from './ai';

export class Game {
  private board: PieceChar[][];
  private currentPlayer: PlayerColor;
  private gameOver: boolean;
  private winner: PlayerColor | null;
  private moveCount: number;
  private historyStack: GameState[];
  private MAX_HISTORY = 50;
  private RANDOM_OPENING_MOVES = 4;

  // AI配置
  private aiDepth: number = 3;
  private isAIThinking: boolean = false;

  // 游戏状态监听器
  private listeners: Array<() => void> = [];
  private logCallback?: (entry: LogEntry) => void;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.board = cloneBoard(initBoard);
    this.currentPlayer = 'red';
    this.gameOver = false;
    this.winner = null;
    this.moveCount = 0;
    this.historyStack = [];
    this.isAIThinking = false;
    this.pushHistory();
    this.notifyListeners();
  }

  // 保留当前棋盘，重置游戏状态（用于编辑完成后）
  restartWithCurrentBoard(): void {
    this.currentPlayer = 'red';
    this.gameOver = false;
    this.winner = null;
    this.moveCount = 0;
    this.historyStack = [];
    this.isAIThinking = false;
    this.pushHistory();
    this.notifyListeners();
  }

  // 获取当前棋盘状态
  getBoard(): PieceChar[][] {
    return cloneBoard(this.board);
  }

  // 获取当前玩家
  getCurrentPlayer(): PlayerColor {
    return this.currentPlayer;
  }

  // 获取是否游戏结束
  isGameOver(): boolean {
    return this.gameOver;
  }

  // 获取获胜者
  getWinner(): PlayerColor | null {
    return this.winner;
  }

  // 获取步数
  getMoveCount(): number {
    return this.moveCount;
  }

  // 设置AI难度（1-4）
  setAIDepth(depth: number): void {
    this.aiDepth = Math.max(1, Math.min(4, depth));
  }

  // 获取AI难度
  getAIDepth(): number {
    return this.aiDepth;
  }

  // AI是否正在思考
  isAIThinkingNow(): boolean {
    return this.isAIThinking;
  }

  // 添加状态监听器
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  // 移除状态监听器
  removeListener(listener: () => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 设置日志回调
  setLogCallback(callback: (entry: LogEntry) => void): void {
    this.logCallback = callback;
  }

  // 触发日志事件
  private log(side: PlayerColor, moveDesc: string, reason: string, score: number): void {
    if (this.logCallback) {
      const entry: LogEntry = {
        step: this.moveCount,
        side,
        moveDesc,
        reason,
        score
      };
      this.logCallback(entry);
    }
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // 保存历史状态
  private pushHistory(): void {
    const state: GameState = {
      board: cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      moveCount: this.moveCount
    };
    this.historyStack.push(state);
    if (this.historyStack.length > this.MAX_HISTORY) {
      this.historyStack.shift();
    }
  }

  // 悔棋
  undo(): boolean {
    if (this.historyStack.length < 2) {
      return false;
    }

    this.historyStack.pop();
    const prev = this.historyStack[this.historyStack.length - 1];

    this.board = cloneBoard(prev.board);
    this.currentPlayer = prev.currentPlayer;
    this.gameOver = prev.gameOver;
    this.winner = prev.winner;
    this.moveCount = prev.moveCount;

    this.notifyListeners();
    return true;
  }

  // 验证移动是否合法
  validateMove(from: Position, to: Position): boolean {
    if (this.gameOver) return false;

    const piece = this.board[from.row][from.col];
    if (!piece) return false;
    if (getPieceColor(piece) !== this.currentPlayer) return false;

    const moves = generateLegalMoves(this.board, this.currentPlayer);
    return moves.some(m => m.from[0] === from.row && m.from[1] === from.col &&
                          m.to[0] === to.row && m.to[1] === to.col);
  }

  // 执行移动
  makeMove(from: Position, to: Position): boolean {
    if (!this.validateMove(from, to)) {
      return false;
    }

    const piece = this.board[from.row][from.col];
    const move: Move = {
      from: [from.row, from.col],
      to: [to.row, to.col],
      piece
    };

    this.pushHistory();
    applyMove(this.board, move);
    this.moveCount++;

    // 检查是否将死对方
    const nextPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    if (isCheckmate(this.board, nextPlayer)) {
      this.gameOver = true;
      this.winner = this.currentPlayer;
    } else {
      this.currentPlayer = nextPlayer;
    }

    this.notifyListeners();
    return true;
  }

  // 获取指定位置棋子
  getPieceAt(row: number, col: number): PieceChar | '' {
    if (!isValidPos(row, col)) return '';
    return this.board[row][col];
  }

  // 设置指定位置棋子（用于编辑模式）
  setPiece(row: number, col: number, piece: PieceChar | ''): void {
    if (!isValidPos(row, col)) return;
    this.board[row][col] = piece;
    this.notifyListeners();
  }

  // 获取选中棋子的所有合法移动
  getLegalMovesForPiece(row: number, col: number): Array<{ toRow: number; toCol: number }> {
    if (!isValidPos(row, col)) return [];

    const piece = this.board[row][col];
    if (!piece || getPieceColor(piece) !== this.currentPlayer) {
      return [];
    }

    const allMoves = generateLegalMoves(this.board, this.currentPlayer);
    return allMoves
      .filter(m => m.from[0] === row && m.from[1] === col)
      .map(m => ({ toRow: m.to[0], toCol: m.to[1] }));
  }

  // 获取当前玩家可以攻击的所有敌方棋子位置
  getAttackedEnemyPieces(): Array<{ row: number; col: number; piece: PieceChar }> {
    return getAttackedPieces(this.board, this.currentPlayer);
  }

  // 获取当前玩家威胁对方将帅的着法
  getThreateningMoves(): Array<{ from: [number, number]; to: [number, number] }> {
    return getThreateningMoves(this.board, this.currentPlayer);
  }

  // 获取下一步对方被将军的威胁
  getOpponentThreats(): Array<{ from: [number, number]; to: [number, number] }> {
    const opponent = this.currentPlayer === 'red' ? 'black' : 'red';
    return getThreateningMoves(this.board, opponent);
  }

  // 获取当前局面的胜率（双方百分比）
  getWinRates(): { redWinRate: number; blackWinRate: number } {
    return calculateWinRate(this.board);
  }

  // 获取局面评估详情
  getEvaluationDetail() {
    return getEvaluationDetail(this.board);
  }

  // 是否进入残局
  isEndgame(): boolean {
    return isEndgame(this.board);
  }

  // 检查某方是否被将军
  isCheck(side: PlayerColor): boolean {
    return isCheckRule(this.board, side);
  }

  // AI思考并选择最佳移动
  think(): Move | null {
    if (this.gameOver || this.isAIThinking) {
      return null;
    }

    this.isAIThinking = true;
    this.notifyListeners();

    try {
      const moves = getSortedMoves(this.board, this.currentPlayer);
      if (moves.length === 0) return null;

      // 开局随机性
      if (this.moveCount < this.RANDOM_OPENING_MOVES) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        const moveDesc = this.formatMove(move);
        this.log(this.currentPlayer, moveDesc, '开局随机', 0);
        return move;
      }

      let bestMoves: Move[] = [];
      let bestScore = this.currentPlayer === 'red' ? -Infinity : Infinity;
      const candidateScores: MoveWithScore[] = [];

      for (const move of moves) {
        const newBoard = cloneBoard(this.board);
        applyMove(newBoard, move);

        let evalScore: number;
        if (this.currentPlayer === 'red') {
          evalScore = alphaBeta(newBoard, this.aiDepth - 1, -Infinity, Infinity, false, 'black');
        } else {
          evalScore = alphaBeta(newBoard, this.aiDepth - 1, -Infinity, Infinity, true, 'red');
        }

        // 添加少量随机性避免完全相同的选择
        evalScore += (Math.random() - 0.5) * 2;

        candidateScores.push({ ...move, score: evalScore });

        if (this.currentPlayer === 'red') {
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

      // 随机选择最佳移动
      const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];

      // 记录日志
      const moveDesc = this.formatMove(chosen);
      const scoreStr = (this.currentPlayer === 'red' ? bestScore : -bestScore).toFixed(1);
      let analysis = '';
      if (candidateScores.length > 1) {
        const sorted = [...candidateScores].sort((a, b) =>
          this.currentPlayer === 'red' ? b.score - a.score : a.score - b.score
        );
        const secondBest = sorted[1];
        const diff = Math.abs(bestScore - secondBest.score).toFixed(1);
        analysis = ` (领先${diff}分)`;
      }
      this.log(
        this.currentPlayer,
        moveDesc,
        `评估 ${scoreStr}${analysis}`,
        bestScore
      );

      return chosen;
    } finally {
      this.isAIThinking = false;
      this.notifyListeners();
    }
  }

  // 获取移动的评估分数
  analyzeMove(move: Move): { score: number; secondBestDiff?: number } {
    // 简化的分析
    return { score: 0 };
  }

  // 格式化着法描述
  private formatMove(move: Move): string {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = pieceNames[move.piece] || move.piece;
    const fromStr = `${String.fromCharCode(97 + fc)}${9 - fr}`;
    const toStr = `${String.fromCharCode(97 + tc)}${9 - tr}`;
    return `${piece} ${fromStr} → ${toStr}`;
  }
}
