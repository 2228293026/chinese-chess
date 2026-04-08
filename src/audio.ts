// 音效系统
export class AudioSystem {
  private audioCtx: AudioContext | null = null;
  private initialized = false;
  private enabled = true;

  // 初始化音频上下文
  init(): void {
    if (this.initialized) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  // 恢复音频上下文（需要用户交互后）
  resume(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // 播放音效
  play(type: 'move' | 'capture' | 'check' | 'win' | 'lose'): void {
    if (!this.enabled) return;
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    // 不同类型的音效参数
    let freq = 600;
    let duration = 0.12;
    let volume = 0.2;

    switch (type) {
      case 'capture':
        freq = 400;
        duration = 0.15;
        volume = 0.3;
        break;
      case 'check':
        freq = 800;
        duration = 0.25;
        volume = 0.25;
        break;
      case 'win':
        freq = 523;
        duration = 0.4;
        volume = 0.3;
        // 胜利音效：C-E-G和弦
        this.playNote(523, 0.15, 0.25, now);
        this.playNote(659, 0.15, 0.25, now + 0.1);
        this.playNote(784, 0.25, 0.25, now + 0.2);
        return;
      case 'lose':
        freq = 300;
        duration = 0.3;
        volume = 0.25;
        break;
    }

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start();
    osc.stop(now + duration);
  }

  // 播放单个音符
  private playNote(freq: number, duration: number, volume: number, startTime: number): void {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // 用户激活时调用
  handleUserActivation(): void {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // 切换音效开关
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.handleUserActivation();
    }
    return this.enabled;
  }

  // 获取音效状态
  isEnabled(): boolean {
    return this.enabled;
  }

  // 设置音效状态
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}