import type { ColorTheme, GameEvent } from '../types/game';

class AudioService {
  private context: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicGain: GainNode | null = null;
  private nextNoteTime = 0;
  private musicStep = 0;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientTimer: number | null = null;
  private ambientTheme: ColorTheme = 'night';

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setMusicEnabled(enabled: boolean): void {
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  setAmbientEnabled(enabled: boolean, theme: ColorTheme): void {
    if (!enabled) {
      this.stopAmbient();
      return;
    }
    if (this.ambientSource && this.ambientTheme === theme) return;
    if (this.ambientSource) this.stopAmbient();
    this.startAmbient(theme);
  }

  play(event: GameEvent, enabled: boolean): void {
    if (!enabled || !this.context || this.context.state !== 'running') return;
    const tones: Record<GameEvent, [number, number, OscillatorType]> = {
      place: [240, 0.07, 'sine'],
      cut: [155, 0.09, 'triangle'],
      perfect: [620, 0.16, 'sine'],
      gameover: [90, 0.34, 'sawtooth'],
      record: [820, 0.24, 'sine']
    };
    const [frequency, duration, type] = tones[event];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (event === 'gameover') oscillator.frequency.exponentialRampToValueAtTime(45, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private startMusic(): void {
    if (!this.context || this.context.state !== 'running' || this.musicTimer !== null) return;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1900;
    filter.Q.value = 0.55;

    this.musicGain = this.context.createGain();
    this.musicGain.gain.setValueAtTime(0.0001, this.context.currentTime);
    this.musicGain.gain.exponentialRampToValueAtTime(0.046, this.context.currentTime + 1.8);
    this.musicGain.connect(filter).connect(this.context.destination);
    this.nextNoteTime = this.context.currentTime + 0.06;
    this.musicStep = 0;
    this.scheduleMusic();
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 900);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    const gain = this.musicGain;
    const context = this.context;
    this.musicGain = null;
    if (!gain || !context) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => gain.disconnect(), 450);
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicGain) return;
    const stepDuration = 0.44;
    const melody: Array<number | null> = [
      329.63, null, 392, 440, 392, null, 329.63, 293.66,
      261.63, null, 329.63, 392, 440, null, 392, null,
      349.23, null, 329.63, 261.63, 293.66, null, 329.63, 349.23,
      392, null, 440, 392, 329.63, 293.66, 261.63, null
    ];
    const chords = [
      [130.81, 164.81, 196, 246.94],
      [110, 130.81, 164.81, 196],
      [87.31, 130.81, 164.81, 220],
      [98, 146.83, 196, 220]
    ];
    const bass = [65.41, 55, 43.65, 49];

    while (this.nextNoteTime < this.context.currentTime + 2.2) {
      const sequenceStep = this.musicStep % melody.length;
      const chordIndex = Math.floor(sequenceStep / 8);
      if (sequenceStep % 8 === 0) {
        for (const frequency of chords[chordIndex]) {
          this.scheduleTone(frequency, this.nextNoteTime, stepDuration * 7.7, 0.045, 'sine', 0.7);
          this.scheduleTone(frequency * 2, this.nextNoteTime, stepDuration * 7.4, 0.012, 'triangle', 0.9, -5);
        }
        this.scheduleTone(bass[chordIndex], this.nextNoteTime, stepDuration * 3.6, 0.09, 'sine', 0.18);
      } else if (sequenceStep % 8 === 4) {
        this.scheduleTone(bass[chordIndex] * 1.5, this.nextNoteTime, stepDuration * 2.5, 0.05, 'sine', 0.12);
      }

      const melodyNote = melody[sequenceStep];
      if (melodyNote !== null) {
        const isPhraseStart = sequenceStep % 8 === 0;
        this.scheduleTone(
          melodyNote,
          this.nextNoteTime,
          isPhraseStart ? stepDuration * 1.75 : stepDuration * 1.25,
          isPhraseStart ? 0.18 : 0.14,
          'sine',
          0.045
        );
        this.scheduleTone(
          melodyNote * 2,
          this.nextNoteTime + 0.012,
          stepDuration * 0.85,
          0.025,
          'triangle',
          0.03,
          4
        );
      }

      this.nextNoteTime += stepDuration;
      this.musicStep += 1;
    }
  }

  private scheduleTone(
    frequency: number,
    start: number,
    duration: number,
    level: number,
    type: OscillatorType,
    attack: number,
    detune = 0
  ): void {
    if (!this.context || !this.musicGain) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(detune, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.setValueAtTime(level, Math.max(start + attack, start + duration * 0.58));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private startAmbient(theme: ColorTheme): void {
    if (!this.context || this.context.state !== 'running' || this.ambientSource) return;
    this.ambientTheme = theme;
    const duration = 2;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.985 + white * 0.015;
      samples[index] = previous * 1.8;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = theme === 'day' ? 'bandpass' : 'lowpass';
    filter.frequency.value = theme === 'day' ? 720 : 390;
    filter.Q.value = theme === 'day' ? 0.55 : 0.8;
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(theme === 'day' ? 0.026 : 0.02, this.context.currentTime + 0.8);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start();
    this.ambientSource = source;
    this.ambientGain = gain;
    this.ambientTimer = window.setInterval(() => this.playAmbientDetail(), theme === 'day' ? 4700 : 6100);
  }

  private stopAmbient(): void {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    const source = this.ambientSource;
    const gain = this.ambientGain;
    const context = this.context;
    this.ambientSource = null;
    this.ambientGain = null;
    if (!source || !gain || !context) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    source.stop(now + 0.4);
  }

  private playAmbientDetail(): void {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    if (this.ambientTheme === 'day') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1050, now);
      oscillator.frequency.exponentialRampToValueAtTime(1520, now + 0.12);
      oscillator.frequency.exponentialRampToValueAtTime(1180, now + 0.3);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      oscillator.stop(now + 0.36);
    } else {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(92, now);
      oscillator.frequency.exponentialRampToValueAtTime(58, now + 1.15);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
      oscillator.stop(now + 1.2);
    }
    oscillator.connect(gain).connect(this.ambientGain);
    oscillator.start(now);
  }
}

export const audioService = new AudioService();
