// 主入口文件
import { Game } from './Game';
import { Renderer } from './Renderer';
import { UIController } from './UIController';
import { AudioSystem } from './audio';
import { BOARD_W, BOARD_H } from './constants';

// 初始化
function init(): void {
  // 获取Canvas元素
  const canvas = document.getElementById('chessCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // 设置Canvas尺寸
  canvas.width = 540;
  canvas.height = 540;

  // 创建游戏实例
  const game = new Game();
  const audio = new AudioSystem();

  // 创建渲染器
  const renderer = new Renderer(canvas);

  // 创建UI控制器
  const ui = new UIController(game, renderer, audio);

  // 设置Canvas点击处理
  canvas.addEventListener('click', () => {
    audio.handleUserActivation();
  });

  // 监听游戏结束
  game.addListener(() => {
    if (game.isGameOver()) {
      const winner = game.getWinner();
      if (winner) {
        audio.play(winner === 'red' ? 'win' : 'lose');
      }
    }
  });

  console.log('中国象棋游戏已初始化');
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 导出供外部使用
export { init, Game, Renderer, UIController };
