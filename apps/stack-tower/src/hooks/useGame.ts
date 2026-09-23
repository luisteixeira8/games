import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameRenderer } from '../game/renderer';
import { audioService } from '../services/audioService';
import type { ColorTheme, GameEvent, GameSnapshot, SoundPreferences } from '../types/game';

const INITIAL_SNAPSHOT: GameSnapshot = {
  phase: 'menu',
  blocks: [],
  movingBlock: null,
  slices: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  speed: 0,
  perfectFlash: 0,
  cameraLevel: 0,
  worldWidth: 390
};

export function useGame(soundPreferences: SoundPreferences, theme: ColorTheme) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef(soundPreferences);
  const themeRef = useRef(theme);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);

  useEffect(() => {
    soundRef.current = soundPreferences;
  }, [soundPreferences]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animationFrame = 0;
    let previousTime = performance.now();
    let eventTimer = 0;
    const renderer = new GameRenderer(canvas);
    const engine = new GameEngine(setSnapshot, (event) => {
      audioService.play(event, soundRef.current.effectsEnabled);
      setLastEvent(event);
      window.clearTimeout(eventTimer);
      eventTimer = window.setTimeout(() => setLastEvent(null), event === 'perfect' ? 850 : 300);
    });
    engineRef.current = engine;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.resize(width, height);
      engine.resize(width);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const frame = (time: number) => {
      const dt = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      engine.update(dt);
      renderer.render(engine.getSnapshot(), dt, themeRef.current);
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);

    const handleVisibility = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearTimeout(eventTimer);
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    await audioService.unlock().catch(() => undefined);
    audioService.setMusicEnabled(soundRef.current.musicEnabled);
    audioService.setAmbientEnabled(soundRef.current.ambientEnabled, themeRef.current);
    engineRef.current?.start();
  }, []);

  const place = useCallback(() => engineRef.current?.place(), []);
  const togglePause = useCallback(() => engineRef.current?.togglePause(), []);
  const showMenu = useCallback(() => engineRef.current?.showMenu(), []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.code === 'Space' || event.code === 'Enter') && snapshot.phase === 'playing') {
        event.preventDefault();
        place();
      } else if (event.code === 'Escape' && (snapshot.phase === 'playing' || snapshot.phase === 'paused')) {
        event.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [place, snapshot.phase, togglePause]);

  return { canvasRef, snapshot, lastEvent, start, place, togglePause, showMenu };
}
