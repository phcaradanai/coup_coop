export class AudioFeedback {
  context: AudioContext | null = null;
  
  init() {
    if (!this.context && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
         this.context = new AudioCtx();
      }
    }
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  playTurn() {
    if (!this.context) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.context.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, this.context.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.context.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start();
      osc.stop(this.context.currentTime + 0.5);
    } catch(e) {}
  }

  playMyTurn() {
    if (!this.context) return;
    try {
      const now = this.context.currentTime;
      
      // High bell ping
      const osc1 = this.context.createOscillator();
      const gain1 = this.context.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc1.connect(gain1);
      gain1.connect(this.context.destination);
      osc1.start(now);
      osc1.stop(now + 0.8);

      // Higher harmonic
      const osc2 = this.context.createOscillator();
      const gain2 = this.context.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1760, now); // A6
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(this.context.destination);
      osc2.start(now);
      osc2.stop(now + 0.5);
    } catch(e) {}
  }

  playEmote() {
    if (!this.context) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, this.context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.context.currentTime + 0.2);

      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, this.context.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start();
      osc.stop(this.context.currentTime + 0.2);
    } catch(e) {}
  }

  playAction() {
    if (!this.context) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch(e) {}
  }

  playError() {
    if (!this.context) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(100, now + 0.1);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.setValueAtTime(0.1, now + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch(e) {}
  }

  playWin() {
    if (!this.context) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        
        const startTime = this.context.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch(e) {}
  }
}

export const audioFeedback = new AudioFeedback();
