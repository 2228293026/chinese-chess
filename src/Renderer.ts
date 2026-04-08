// 渲染器
import { THEMES } from './types';
import type { PieceChar, Position, PlayerColor, MoveWithScore, LogEntry, Theme } from './types';
import { BOARD_W, BOARD_H, pieceChars } from './constants';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private theme: Theme;
  private cellW: number;
  private cellH: number;

  // 渲染状态
  private selectedPiece: Position | null = null;
  private legalMoves: Array<{ toRow: number; toCol: number }> = [];
  private attackedPieces: Array<{ row: number; col: number; piece: PieceChar }> = [];
  private threateningMoves: Array<{ from: [number, number]; to: [number, number] }> = [];
  private opponentThreats: Array<{ from: [number, number]; to: [number, number] }> = [];
  private isEditMode: boolean = false;
  private pickedPiece: Position | null = null;

  // 动画状态
  private _isAnimating: boolean = false;
  private animProgress: number = 0;
  private animMove: MoveWithScore | null = null;
  private animCallback: (() => void) | null = null;
  private ANIM_DURATION: number = 200;

  // 配色方案索引
  private themeIndex: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.cellW = canvas.width / BOARD_W;
    this.cellH = canvas.height / BOARD_H;
    this.theme = THEMES[0];
  }

  // 设置配色方案
  setTheme(themeIndex: number): void {
    this.themeIndex = themeIndex;
    this.theme = THEMES[themeIndex];
  }

  // 获取当前配色方案名称
  getThemeName(): string {
    return this.theme.name;
  }

  // 获取所有配色方案
  getThemes(): Theme[] {
    return THEMES;
  }

  // 获取下一个配色方案索引
  nextTheme(): number {
    this.themeIndex = (this.themeIndex + 1) % THEMES.length;
    this.theme = THEMES[this.themeIndex];
    return this.themeIndex;
  }

  // 更新游戏状态
  updateState(
    board: PieceChar[][],
    selected: Position | null,
    legalMoves: Array<{ toRow: number; toCol: number }>,
    attackedPieces: Array<{ row: number; col: number; piece: PieceChar }>,
    threateningMoves: Array<{ from: [number, number]; to: [number, number] }>,
    opponentThreats: Array<{ from: [number, number]; to: [number, number] }>,
    editMode: boolean,
    pickedPiece: Position | null
  ): void {
    this.selectedPiece = selected;
    this.legalMoves = legalMoves;
    this.attackedPieces = attackedPieces;
    this.threateningMoves = threateningMoves;
    this.opponentThreats = opponentThreats;
    this.isEditMode = editMode;
    this.pickedPiece = pickedPiece;
  }

  // 开始动画
  startAnimation(move: MoveWithScore, onComplete?: () => void): void {
    this._isAnimating = true;
    this.animMove = move;
    this.animProgress = 0;
    this.animCallback = onComplete || null;
    this.animate();
  }

  // 动画帧更新
  private animate = (): void => {
    if (!this._isAnimating) return;

    this.animProgress += 16 / this.ANIM_DURATION; // 假设60fps
    if (this.animProgress >= 1) {
      this.animProgress = 1;
      this._isAnimating = false;
      const move = this.animMove;
      this.animMove = null;
      const callback = this.animCallback;
      this.animCallback = null;

      // 动画结束，触发回调
      if (callback) callback();
    }

    // 触发重绘（通过调用drawBoard）
    if (this.onRenderRequest) {
      this.onRenderRequest();
    }

    if (this._isAnimating) {
      requestAnimationFrame(this.animate);
    }
  };

  // 渲染回调
  onRenderRequest?: () => void;

  // 绘制棋盘
  drawBoard(board: PieceChar[][]): void {
    const size = this.canvas.width;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, size, size);

    // 绘制网格线
    this.drawGrid();

    // 绘制楚河汉界
    this.drawRiver();

    // 绘制可移动位置（绿色圆圈）
    if (!this._isAnimating && !this.isEditMode && this.selectedPiece && this.legalMoves.length > 0) {
      this.drawLegalMoves();
    }

    // 绘制选中高亮
    if (!this._isAnimating) {
      this.drawHighlight();
    }

    // 绘制威胁预警（对方下一步可能将军的线路）
    if (this.opponentThreats.length > 0 && !this._isAnimating && !this.isEditMode) {
      this.drawThreatWarnings();
    }

    // 绘制棋子
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        // 检查该棋子是否正在动画中从该位置移动
        if (this._isAnimating && this.animMove) {
          const [fr, fc] = this.animMove.from;
          if (r === fr && c === fc) continue;
        }

        const x = c * this.cellW + this.cellW / 2;
        const y = r * this.cellH + this.cellH / 2;
        this.drawPiece(piece, x, y);
      }
    }

    // 绘制动画中的棋子
    if (this._isAnimating && this.animMove) {
      const [fr, fc] = this.animMove.from;
      const [tr, tc] = this.animMove.to;
      const sx = fc * this.cellW + this.cellW / 2;
      const sy = fr * this.cellH + this.cellH / 2;
      const ex = tc * this.cellW + this.cellW / 2;
      const ey = tr * this.cellH + this.cellH / 2;
      const cx = sx + (ex - sx) * this.animProgress;
      const cy = sy + (ey - sy) * this.animProgress;
      this.drawPiece(this.animMove.piece, cx, cy);
    }
  }

  // 绘制网格
  private drawGrid(): void {
    const ctx = this.ctx;
    const size = this.canvas.width;

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#6b4f2c';

    // 横线
    for (let i = 0; i < BOARD_H; i++) {
      ctx.beginPath();
      ctx.moveTo(this.cellW / 2, i * this.cellH + this.cellH / 2);
      ctx.lineTo(size - this.cellW / 2, i * this.cellH + this.cellH / 2);
      ctx.stroke();
    }

    // 竖线
    for (let i = 0; i < BOARD_W; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellW + this.cellW / 2, this.cellH / 2);
      ctx.lineTo(i * this.cellW + this.cellW / 2, size - this.cellH / 2);
      ctx.stroke();
    }
  }

  // 绘制楚河汉界
  private drawRiver(): void {
    const ctx = this.ctx;
    const size = this.canvas.width;

    ctx.font = 'bold 28px "华文楷体","KaiTi"';
    ctx.fillStyle = this.theme.text;
    ctx.globalAlpha = 0.5;
    ctx.fillText('楚 河', size * 0.22, size * 0.54);
    ctx.fillText('汉 界', size * 0.58, size * 0.54);
    ctx.globalAlpha = 1.0;
  }

  // 绘制可移动位置
  private drawLegalMoves(): void {
    const ctx = this.ctx;

    this.legalMoves.forEach(move => {
      const x = move.toCol * this.cellW + this.cellW / 2;
      const y = move.toRow * this.cellH + this.cellH / 2;

      ctx.beginPath();
      ctx.arc(x, y, this.cellW * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#3cb043';
      ctx.globalAlpha = 0.45;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = '#1f5c1f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 2.5; // 恢复网格线宽
    });
  }

  // 绘制选中高亮
  private drawHighlight(): void {
    const ctx = this.ctx;

    let highlightPos: Position | null = null;

    if (this.isEditMode && this.pickedPiece) {
      highlightPos = this.pickedPiece;
    } else if (!this.isEditMode && this.selectedPiece) {
      highlightPos = this.selectedPiece;
    }

    if (!highlightPos) return;

    const { row, col } = highlightPos;
    const x = col * this.cellW + this.cellW / 2;
    const y = row * this.cellH + this.cellH / 2;

    ctx.beginPath();
    ctx.arc(x, y, this.cellW * 0.42, 0, Math.PI * 2);

    ctx.fillStyle = this.theme.highlight;
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d4a017';
    ctx.stroke();
    ctx.lineWidth = 2.5;
  }

  // 绘制威胁预警（对方可能将军的线路）
  private drawThreatWarnings(): void {
    const ctx = this.ctx;

    // 用红色框预警被威胁的棋子或线路
    this.opponentThreats.forEach(threat => {
      const [tr, tc] = threat.to;
      const x = tc * this.cellW + this.cellW / 2;
      const y = tr * this.cellH + this.cellH / 2;

      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(
        x - this.cellW / 2 + 2,
        y - this.cellH / 2 + 2,
        this.cellW - 4,
        this.cellH - 4
      );
      ctx.lineWidth = 2.5;
    });
  }

  // 绘制单个棋子
  private drawPiece(piece: PieceChar, x: number, y: number, radius?: number): void {
    const ctx = this.ctx;
    const r = radius || (this.cellW * 0.38);

    // 阴影
    ctx.shadowColor = '#302010';
    ctx.shadowBlur = 8;

    // 棋子渐变
    const grad = ctx.createRadialGradient(x - 8, y - 8, 5, x, y, r * 1.8);
    const isRed = piece === piece.toUpperCase();

    if (isRed) {
      grad.addColorStop(0, '#f5c9b0');
      grad.addColorStop(0.7, '#c04a2c');
      grad.addColorStop(1, '#8b2e1a');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#f7e05e';
    } else {
      grad.addColorStop(0, '#b0c5d4');
      grad.addColorStop(0.7, '#2c4e6e');
      grad.addColorStop(1, '#142b3c');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#c0daf0';
    }

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 棋子文字
    ctx.font = 'bold 32px "华文楷体","KaiTi"';
    ctx.fillStyle = isRed ? '#fae074' : '#e8eef4';
    ctx.shadowColor = '#1a1a1a';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pieceChars[piece] || piece, x, y - 1);
    ctx.shadowBlur = 0;
  }

  // 获取Canvas元素
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // 是否正在动画
  isAnimating(): boolean {
    return this._isAnimating;
  }
}
