// UI控制器
import { AudioSystem } from './audio';
import { Game } from './Game';
import { Renderer } from './Renderer';
import { PlayerColor, LogEntry, Position, PickedPiece, PieceChar, MoveWithScore } from './types';
import { pieceChars, pieceNames, BOARD_W, BOARD_H } from './constants';

export class UIController {
  private game: Game;
  private renderer: Renderer;
  private audio: AudioSystem;

  // DOM元素
  private turnDisplay: HTMLElement;
  private statusMsg: HTMLElement;
  private infoPanel: HTMLElement;
  private autoPlayBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private editModeBtn: HTMLButtonElement;
  private toggleLogBtn: HTMLButtonElement;
  private toggleSoundBtn: HTMLButtonElement;
  private logPanel: HTMLElement;
  private logContent: HTMLElement;
  private clearLogBtn: HTMLButtonElement;
  private canvas: HTMLCanvasElement;

  // 新UI元素
  private difficultySlider: HTMLInputElement | null = null;
  private difficultyLabel: HTMLElement | null = null;
  private winRateDisplay: HTMLElement | null = null;
  private themeBtn: HTMLButtonElement | null = null;

  // 状态
  private isAutoPlaying: boolean = false;
  private autoTimer: any = null;
  private showLog: boolean = false;
  private logEntries: LogEntry[] = [];
  private editMode: boolean = false;
  private selectedPiece: Position | null = null;
  private pickedPiece: PickedPiece | null = null;

  // 用于音效检测
  private lastMoveCount: number = 0;

  // 颜色类
  private readonly redTurnClass = 'red-turn';
  private readonly blackTurnClass = 'black-turn';
  private readonly activeClass = 'active';

  constructor(game: Game, renderer: Renderer, audio: AudioSystem) {
    this.game = game;
    this.renderer = renderer;
    this.audio = audio;

    // 获取DOM元素
    this.canvas = document.getElementById('chessCanvas') as HTMLCanvasElement;
    this.turnDisplay = document.getElementById('turnDisplay') as HTMLElement;
    this.statusMsg = document.getElementById('statusMsg') as HTMLElement;
    this.infoPanel = document.getElementById('infoPanel') as HTMLElement;
    this.autoPlayBtn = document.getElementById('autoPlayBtn') as HTMLButtonElement;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.editModeBtn = document.getElementById('editModeBtn') as HTMLButtonElement;
    this.toggleLogBtn = document.getElementById('toggleLogBtn') as HTMLButtonElement;
    this.toggleSoundBtn = document.getElementById('toggleSoundBtn') as HTMLButtonElement;
    this.logPanel = document.getElementById('logPanel') as HTMLElement;
    this.logContent = document.getElementById('logContent') as HTMLElement;
    this.clearLogBtn = document.getElementById('clearLogBtn') as HTMLButtonElement;

    // 获取新添加的UI元素（可选）
    this.difficultySlider = document.getElementById('difficultySlider') as HTMLInputElement;
    this.difficultyLabel = document.getElementById('difficultyLabel') as HTMLElement;
    this.winRateDisplay = document.getElementById('winRateDisplay') as HTMLElement;
    this.themeBtn = document.getElementById('themeBtn') as HTMLButtonElement;

    // 设置游戏日志回调
    this.game.setLogCallback((entry: LogEntry) => {
      this.logEntries.push(entry);
      if (this.showLog) {
        this.renderLog();
      }
    });

    // 设置渲染请求回调（用于动画）
    this.renderer.onRenderRequest = () => {
      this.render();
    };

    this.bindEvents();
    this.addGameListeners();

    // 初始渲染
    this.onGameStateChange();
  }

  // 绑定事件
  private bindEvents(): void {
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    this.autoPlayBtn.addEventListener('click', this.toggleAutoPlay.bind(this));
    this.undoBtn.addEventListener('click', this.undo.bind(this));
    this.resetBtn.addEventListener('click', this.resetGame.bind(this));
    this.editModeBtn.addEventListener('click', this.toggleEditMode.bind(this));
    this.toggleLogBtn.addEventListener('click', this.toggleLogPanel.bind(this));
    this.clearLogBtn.addEventListener('click', this.clearLog.bind(this));
    this.toggleSoundBtn.addEventListener('click', this.toggleSound.bind(this));

    // 难度滑动条事件
    if (this.difficultySlider) {
      this.difficultySlider.addEventListener('input', this.handleDifficultyChange.bind(this));
    }

    // 配色切换按钮
    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', this.cycleTheme.bind(this));
    }

    // 用户激活时初始化音频
    document.body.addEventListener('click', () => {
      this.audio.handleUserActivation();
    }, { once: true });
  }

  // 添加游戏状态监听器
  private addGameListeners(): void {
    this.game.addListener(this.onGameStateChange.bind(this));
  }

  // 游戏状态变化时更新UI
  private onGameStateChange(): void {
    const currentMoveCount = this.game.getMoveCount();

    // 播放音效（如果移动发生了）
    if (currentMoveCount > this.lastMoveCount) {
      this.playMoveSound();
      this.lastMoveCount = currentMoveCount;
    }

    this.updateUI();
    this.updateWinRateDisplay();
    this.render();

    // 自动播放逻辑
    if (this.isAutoPlaying && !this.game.isGameOver() && !this.renderer.isAnimating() && !this.editMode) {
      // 使用定时器避免递归调用
      if (this.autoTimer) clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => this.makeAIMove(), 400);
    }
  }

  // 播放移动音效
  private playMoveSound(isCapture: boolean = false): void {
    if (this.game.isGameOver()) {
      const winner = this.game.getWinner();
      this.audio.play(winner === 'red' ? 'win' : 'lose');
      return;
    }

    // 检测移动后轮到的一方是否被将军
    const nextPlayer = this.game.getCurrentPlayer();
    if (this.game.isCheck(nextPlayer)) {
      this.audio.play('check');
    } else if (isCapture) {
      this.audio.play('capture');
    } else {
      this.audio.play('move');
    }
  }

  // 渲染棋盘
  private render(): void {
    const board = this.game.getBoard();
    const currentPlayer = this.game.getCurrentPlayer();

    // 获取选中棋子的合法移动
    let selectedPiece: Position | null = null;
    let legalMoves: Array<{ toRow: number; toCol: number }> = [];

    if (this.selectedPiece && !this.game.isGameOver() && !this.editMode) {
      selectedPiece = this.selectedPiece;
      legalMoves = this.game.getLegalMovesForPiece(selectedPiece.row, selectedPiece.col);
    }

    // 获取 attacked pieces 和 threat warnings
    const attackedPieces = this.game.getAttackedEnemyPieces();
    const threateningMoves = this.game.getThreateningMoves();
    const opponentThreats = this.game.getOpponentThreats();

    this.renderer.updateState(
      board,
      selectedPiece,
      legalMoves,
      attackedPieces,
      threateningMoves,
      opponentThreats,
      this.editMode,
      this.editMode ? this.pickedPiece : null
    );

    this.renderer.drawBoard(board);
  }

  // 更新UI显示
  private updateUI(): void {
    const gameOver = this.game.isGameOver();
    const winner = this.game.getWinner();
    const currentPlayer = this.game.getCurrentPlayer();
    const isAIThinking = this.game.isAIThinkingNow();
    const moveCount = this.game.getMoveCount();

    // 更新回合显示
    if (gameOver) {
      this.turnDisplay.textContent = winner === 'red' ? '红方胜利' : '黑方胜利';
      this.infoPanel.classList.remove(this.redTurnClass, this.blackTurnClass);

      // 显示详细的终局信息
      const loser = winner === 'red' ? '黑' : '红';
      this.statusMsg.innerHTML = `🏆 第${moveCount}步 · ${winner === 'red' ? '红帅' : '黑将'}将死${loser}方！`;
    } else {
      this.turnDisplay.textContent = currentPlayer === 'red' ? '红方走子' : '黑方走子';
      this.infoPanel.classList.remove(this.redTurnClass, this.blackTurnClass);
      this.infoPanel.classList.add(currentPlayer === 'red' ? this.redTurnClass : this.blackTurnClass);
    }

    // 更新状态消息（非终局状态）
    if (!gameOver) {
      this.updateStatusMessage();
    }

    // 更新难度标签
    if (this.difficultyLabel) {
      const depth = this.game.getAIDepth();
      const depthNames = ['', '新手', '简单', '普通', '困难'];
      const name = depthNames[depth] || '未知';
      this.difficultyLabel.textContent = `AI难度: ${name} (深度${depth})`;
    }

    // 更新胜率显示
    this.updateWinRateDisplay();
  }

  // 更新状态消息
  private updateStatusMessage(): void {
    if (this.game.isGameOver()) return;

    const isAIThinking = this.game.isAIThinkingNow();
    if (isAIThinking) {
      this.statusMsg.innerHTML = `🤖 AI 思考中 <span class="thinking-indicator">⋯⋯</span>`;
      return;
    }

    if (this.editMode) {
      this.statusMsg.innerHTML = '✎ 编辑模式';
      return;
    }

    const currentPlayer = this.game.getCurrentPlayer();
    const inCheck = this.game.isCheck(currentPlayer);

    const depth = this.game.getAIDepth();
    if (inCheck) {
      this.statusMsg.innerHTML = `⚠️ ${currentPlayer === 'red' ? '红方' : '黑方'}被将军`;
    } else {
      // 检查是否是残局
      const isEndgame = this.game.isEndgame();
      const endgameTag = isEndgame ? ' [残局]' : '';
      this.statusMsg.innerHTML = `♟️ ${currentPlayer === 'red' ? '红方' : '黑方'}走子 · AI深度${depth}${endgameTag}`;
    }
  }

  // 检查是否被将军（简化的检查）
  // 更新胜率显示
  private updateWinRateDisplay(): void {
    if (!this.winRateDisplay) return;

    if (this.game.isGameOver()) {
      const winner = this.game.getWinner();
      this.winRateDisplay.innerHTML = winner === 'red'
        ? '<span style="color: #c04a2c; font-weight: bold;">红胜 100%</span>'
        : '<span style="color: #2c4e6e; font-weight: bold;">黑胜 100%</span>';
      return;
    }

    const winRates = this.game.getWinRates();
    this.winRateDisplay.innerHTML = `
      <span style="color: #c04a2c;">红: ${winRates.redWinRate}%</span> |
      <span style="color: #2c4e6e;">黑: ${winRates.blackWinRate}%</span>
    `;
  }

  // 处理Canvas点击
  private handleCanvasClick(e: MouseEvent): void {
    this.audio.handleUserActivation();

    if (this.game.isGameOver() && !this.editMode) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const cellW = this.canvas.width / BOARD_W;
    const cellH = this.canvas.height / BOARD_H;
    const col = Math.floor(canvasX / cellW);
    const row = Math.floor(canvasY / cellH);

    if (row < 0 || row >= BOARD_H || col < 0 || col >= BOARD_W) return;

    if (this.editMode) {
      this.handleEditClick(row, col);
      return;
    }

    if (this.renderer.isAnimating()) return;

    if (this.selectedPiece) {
      this.tryMoveSelectedTo(row, col);
    } else {
      this.handlePieceSelect(row, col);
    }
  }

  // 处理棋子选择
  private handlePieceSelect(row: number, col: number): void {
    const piece = this.game.getPieceAt(row, col);
    if (piece && this.getPieceColor(piece) === this.game.getCurrentPlayer()) {
      this.selectedPiece = { row, col };
      this.render();
    }
  }

  // 尝试移动选中的棋子
  private tryMoveSelectedTo(tr: number, tc: number): void {
    if (!this.selectedPiece) return;

    const { row: fr, col: fc } = this.selectedPiece;
    const piece = this.game.getPieceAt(fr, fc);
    if (!piece) return;

    // 编辑模式下允许自由移动
    if (this.editMode) {
      this.handleEditMove(fr, fc, tr, tc);
      return;
    }

    // 对弈模式验证移动是否合法
    const legalMoves = this.game.getLegalMovesForPiece(fr, fc);
    const isValid = legalMoves.some(m => m.toRow === tr && m.toCol === tc);

    if (!isValid) {
      // 检查是否选择了另一个己方棋子
      const targetPiece = this.game.getPieceAt(tr, tc);
      if (targetPiece && this.getPieceColor(targetPiece) === this.game.getCurrentPlayer()) {
        this.selectedPiece = { row: tr, col: tc };
        this.render();
      } else {
        this.selectedPiece = null;
        this.render();
      }
      return;
    }

    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    }

    this.selectedPiece = null;

    // 创建移动对象
    const move: MoveWithScore = {
      from: [fr, fc],
      to: [tr, tc],
      piece: piece as PieceChar,
      score: 0
    };

    // 格式化移动描述
    const moveDesc = this.formatMove(move);
    const side = this.game.getCurrentPlayer();

    // 开始动画，动画结束后执行实际移动、记录日志并播放音效
    this.renderer.startAnimation(move, () => {
      // 检查是否是吃子
      const targetPiece = this.game.getPieceAt(tr, tc);
      const isCapture = targetPiece !== '';

      this.game.makeMove({ row: fr, col: fc }, { row: tr, col: tc });

      // 记录日志
      this.addLogEntry(side, moveDesc, '玩家走子', 0);

      // 播放音效
      this.playMoveSound(isCapture);
    });

    // 立即触发渲染以显示动画
    this.render();
  }

  // 处理编辑模式点击
  // 编辑模式下的自由移动
  private handleEditMove(fr: number, fc: number, tr: number, tc: number): void {
    const piece = this.game.getPieceAt(fr, fc);
    if (!piece) return;

    this.game.setPiece(tr, tc, piece);
    this.game.setPiece(fr, fc, '' as any);

    // 记录日志
    const move: MoveWithScore = {
      from: [fr, fc],
      to: [tr, tc],
      piece: piece as PieceChar,
      score: 0
    };
    const moveDesc = this.formatMove(move);
    const side = this.game.getCurrentPlayer();
    this.addLogEntry(side, moveDesc, '编辑模式移动', 0);

    // 播放音效
    this.audio.play('move');

    this.selectedPiece = null;
    this.render();
    this.statusMsg.innerHTML = '✎ 棋子已移动（继续编辑）';
  }


  // 处理编辑模式点击
  private handleEditClick(row: number, col: number): void {
    const piece = this.game.getPieceAt(row, col);

    if (this.pickedPiece) {
      const { row: pr, col: pc, piece: pp } = this.pickedPiece;
      if (row === pr && col === pc) {
        this.pickedPiece = null;
        this.render();
        return;
      }

      // 编辑模式下：允许自由放置，覆盖任意位置
      this.game.setPiece(pr, pc, '' as any);
      this.game.setPiece(row, col, pp);
      this.pickedPiece = null;
      this.render();
      this.statusMsg.innerHTML = '✎ 棋子已调整（继续编辑）';
      return;
    }

    // 拾取任何棋子（包括对方）
    if (piece) {
      this.pickedPiece = { row, col, piece };
      this.statusMsg.innerHTML = `✎ 已拾取 ${pieceChars[piece]}，点击放置`;
      this.render();
    } else {
      this.statusMsg.innerHTML = '✎ 点击棋子拾取';
    }
  }


  // 切换自动播放
  private toggleAutoPlay(): void {
    if (this.editMode) {
      this.setEditMode(false);
    }

    if (this.game.isGameOver()) {
      this.game.reset();
    }

    if (this.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  // 开始自动播放
  private startAutoPlay(): void {
    if (this.isAutoPlaying || this.editMode) return;

    this.isAutoPlaying = true;
    this.autoPlayBtn.textContent = '⏸ 暂停';

    if (!this.renderer.isAnimating()) {
      this.autoTimer = setTimeout(() => this.makeAIMove(), 300);
    }
  }

  // 停止自动播放
  private stopAutoPlay(): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    this.isAutoPlaying = false;
    this.autoPlayBtn.textContent = '▶ 自动';
  }

  // AI移动
  private makeAIMove(): void {
    if (this.game.isGameOver() || this.renderer.isAnimating() || this.editMode) {
      return;
    }

    const move = this.game.think();
    if (!move) {
      this.game.reset();
      return;
    }

    const moveWithScore: MoveWithScore = {
      from: move.from,
      to: move.to,
      piece: move.piece,
      score: 0
    };

    this.renderer.startAnimation(moveWithScore, () => {
      // 检测移动前目标位置是否有棋子（吃子）
      const targetPiece = this.game.getPieceAt(move.to[0], move.to[1]);
      const isCapture = targetPiece !== '';

      this.game.makeMove(
        { row: move.from[0], col: move.from[1] },
        { row: move.to[0], col: move.to[1] }
      );

      // 播放音效
      this.playMoveSound(isCapture);
    });

    this.render();
  }

  // 悔棋
  private undo(): void {
    if (this.renderer.isAnimating() || this.editMode) {
      this.statusMsg.innerHTML = '⛔ 动画中或编辑模式无法悔棋';
      return;
    }

    const success = this.game.undo();
    if (success) {
      this.statusMsg.innerHTML = '↩️ 已悔棋一步';
      // 移除最后一条日志
      if (this.logEntries.length > 0) {
        this.logEntries.pop();
        if (this.showLog) {
          this.renderLog();
        }
      }
    } else {
      this.statusMsg.innerHTML = '⛔ 没有更多历史步骤';
    }
  }

  // 重置游戏
  private resetGame(): void {
    this.stopAutoPlay();
    this.selectedPiece = null;
    this.editMode = false;
    this.pickedPiece = null;
    this.editModeBtn.classList.remove(this.activeClass);
    this.game.reset();
    this.statusMsg.innerHTML = '✨ 新局 · 强化AI';
  }

  // 切换编辑模式
  private toggleEditMode(): void {
    if (this.game.isGameOver() && !this.editMode) {
      this.game.reset();
    }

    this.setEditMode(!this.editMode);

    if (!this.editMode) {
      this.stopAutoPlay();
    }
  }

  // 设置编辑模式
  private setEditMode(enable: boolean): void {
    this.editMode = enable;
    this.editModeBtn.classList.toggle(this.activeClass, enable);
    this.selectedPiece = null;
    this.pickedPiece = null;

    if (enable) {
      this.stopAutoPlay();
      // 不重置棋盘，保留当前局面
      this.game.setLogCallback(() => {}); // 可以在此处暂时禁用日志
    }

    this.statusMsg.innerHTML = enable ? '✎ 编辑模式' : '✨ 对弈模式';
    this.render();
  }

  // 切换日志面板
  private toggleLogPanel(): void {
    this.showLog = !this.showLog;
    this.logPanel.style.display = this.showLog ? 'flex' : 'none';
    this.toggleLogBtn.classList.toggle(this.activeClass, this.showLog);
    if (this.showLog) {
      this.renderLog();
    }
  }

  // 清空日志
  private clearLog(): void {
    this.logEntries = [];
    this.renderLog();
  }

  // 切换音效
  private toggleSound(): void {
    const enabled = this.audio.toggle();
    this.toggleSoundBtn.textContent = enabled ? '🔊 音效' : '🔇 静音';
    this.toggleSoundBtn.classList.toggle(this.activeClass, enabled);
  }

  // 切换配色方案
  private cycleTheme(): void {
    if (!this.themeBtn) return;

    const themeIndex = this.renderer.nextTheme();
    const theme = this.renderer.getThemes()[themeIndex];

    // 更新按钮文本
    const themeNames: Record<string, string> = {
      'classic': '经典',
      'modern': '现代',
      'dark': '暗色',
      'wooden': '木纹'
    };
    this.themeBtn.textContent = `主题: ${themeNames[theme.name] || theme.name}`;

    // 重绘
    this.render();

    // 添加CSS类来切换主题
    document.body.classList.remove('theme-classic', 'theme-modern', 'theme-dark', 'theme-wooden');
    document.body.classList.add(`theme-${theme.name}`);
  }

  // 处理难度变化
  private handleDifficultyChange(): void {
    if (!this.difficultySlider) return;

    const depth = parseInt(this.difficultySlider.value);
    this.game.setAIDepth(depth);
    this.updateStatusMessage();
  }

  // 获取棋子颜色（辅助函数）
  private getPieceColor(piece: string): PlayerColor {
    if (!piece) return 'red'; // fallback
    return piece === piece.toUpperCase() ? 'red' : 'black';
  }

  // 添加日志条目
  addLogEntry(side: PlayerColor, moveDesc: string, reason: string, score: number): void {
    const entry: LogEntry = {
      step: this.game.getMoveCount(),
      side,
      moveDesc,
      reason,
      score
    };
    this.logEntries.push(entry);
    if (this.showLog) {
      this.renderLog();
    }
  }

  // 格式化移动为易读字符串（如："车 a1 → b1"）
  private formatMove(move: MoveWithScore): string {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = pieceNames[move.piece] || move.piece;
    const fromStr = `${String.fromCharCode(97 + fc)}${9 - fr}`;
    const toStr = `${String.fromCharCode(97 + tc)}${9 - tr}`;
    return `${piece} ${fromStr} → ${toStr}`;
  }

  // 渲染日志
  private renderLog(): void {
    if (!this.logContent) return;

    if (this.logEntries.length === 0) {
      this.logContent.innerHTML = '<div style="color:#7a6a5a; text-align:center;">暂无日志</div>';
      return;
    }

    let html = '';
    this.logEntries.slice().reverse().forEach(entry => {
      const colorClass = entry.side === 'red' ? 'log-red' : 'log-black';
      html += `<div class="log-entry">`;
      html += `<span class="log-step">#${entry.step}</span> `;
      html += `<span class="${colorClass}">${entry.side === 'red' ? '红' : '黑'}</span> ${entry.moveDesc}<br>`;
      html += `<span class="log-score">${entry.reason}</span></div>`;
    });

    this.logContent.innerHTML = html;
    // 滚动到顶部，让最新的日志（在顶部）可见
    this.logContent.scrollTop = 0;
  }

  // 获取选中的棋子
  getSelectedPiece(): Position | null {
    return this.selectedPiece;
  }

  // 获取编辑模式状态
  isEditMode(): boolean {
    return this.editMode;
  }

  // 获取当前游戏对象
  getGame(): Game {
    return this.game;
  }

  // 获取渲染器对象
  getRenderer(): Renderer {
    return this.renderer;
  }
}
