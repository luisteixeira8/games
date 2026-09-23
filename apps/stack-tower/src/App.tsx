import { useEffect, useRef, useState } from 'react';
import { Button } from './components/Button/Button';
import { ScoreDisplay } from './components/ScoreDisplay/ScoreDisplay';
import { SoundToggle } from './components/SoundToggle/SoundToggle';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { difficultyProgress } from './game/difficulty';
import { useGame } from './hooks/useGame';
import { audioService } from './services/audioService';
import { shareScore } from './services/shareService';
import { loadStats, saveStats } from './services/storageService';
import type { PersistedStats, SoundPreferences } from './types/game';

export function App() {
  const [stats, setStats] = useState<PersistedStats>(() => loadStats());
  const [shareMessage, setShareMessage] = useState('');
  const soundPreferences: SoundPreferences = {
    musicEnabled: stats.musicEnabled,
    ambientEnabled: stats.ambientEnabled,
    effectsEnabled: stats.effectsEnabled
  };
  const { canvasRef, snapshot, lastEvent, start, place, togglePause, showMenu } = useGame(soundPreferences, stats.theme);
  const previousPhase = useRef(snapshot.phase);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    if (snapshot.phase === 'gameover' && previousPhase.current !== 'gameover') {
      const newRecord = snapshot.score > stats.bestScore;
      const next = {
        ...stats,
        bestScore: Math.max(stats.bestScore, snapshot.score),
        bestStreak: Math.max(stats.bestStreak, snapshot.bestStreak),
        totalGames: stats.totalGames + 1,
        lastPlayedAt: Date.now()
      };
      setIsNewRecord(newRecord);
      setStats(next);
      saveStats(next);
      if (newRecord) audioService.play('record', stats.effectsEnabled);
    }
    previousPhase.current = snapshot.phase;
  }, [snapshot.phase, snapshot.score, snapshot.bestStreak, stats]);

  const changeSound = async (channel: keyof SoundPreferences, enabled: boolean) => {
    const next = { ...stats, [channel]: enabled };
    setStats(next);
    saveStats(next);
    if (enabled) await audioService.unlock().catch(() => undefined);
    if (channel === 'musicEnabled') audioService.setMusicEnabled(enabled);
    if (channel === 'ambientEnabled') audioService.setAmbientEnabled(enabled, stats.theme);
  };

  const toggleTheme = () => {
    const next = { ...stats, theme: stats.theme === 'night' ? 'day' as const : 'night' as const };
    setStats(next);
    saveStats(next);
    audioService.setAmbientEnabled(next.ambientEnabled, next.theme);
  };

  const handleStart = () => {
    setIsNewRecord(false);
    setShareMessage('');
    void start();
  };

  const handleShare = async () => {
    try {
      const result = await shareScore(snapshot.score);
      setShareMessage(result === 'copied' ? 'Message copied!' : 'Score shared!');
    } catch {
      setShareMessage('Unable to share your score.');
    }
  };

  const bestScore = Math.max(stats.bestScore, snapshot.score);
  const progress = difficultyProgress(snapshot.speed);

  return (
    <main className={`app app--${snapshot.phase} app--${stats.theme}`}>
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Stack Tower game area"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            place();
          }
        }}
      />

      {snapshot.phase === 'menu' && (
        <section className="screen screen--menu" aria-labelledby="game-title">
          <div className="menu-topbar">
            <div className="menu-toggles">
              <ThemeToggle theme={stats.theme} onToggle={toggleTheme} />
              <SoundToggle preferences={soundPreferences} onChange={(channel, enabled) => void changeSound(channel, enabled)} />
            </div>
          </div>
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <i /><i /><i />
            </div>
            <h1 id="game-title">Stack<br /><span>Tower</span></h1>
            <p>Find the rhythm. Line up every block. Reach new heights.</p>
          </div>
          <div className="menu-actions glass-panel">
            <div className="best-card">
              <span>High score</span>
              <strong>{stats.bestScore.toString().padStart(2, '0')}</strong>
            </div>
            <Button onClick={handleStart}>Play <span aria-hidden="true">→</span></Button>
            <div className="control-hint">
              <span className="tap-dot" aria-hidden="true" />
              Tap to stack
              <span className="separator">·</span>
              <kbd>Space</kbd> or <kbd>Enter</kbd>
            </div>
          </div>
        </section>
      )}

      {snapshot.phase !== 'menu' && (
        <header className="hud">
          <ScoreDisplay label="Height" value={snapshot.score} emphasis />
          {snapshot.streak > 1 && <div className="streak-pill" aria-label={`${snapshot.streak} perfect placements`}>×{snapshot.streak} perfect</div>}
          <div className="hud-actions">
            <ThemeToggle theme={stats.theme} onToggle={toggleTheme} />
            <SoundToggle preferences={soundPreferences} onChange={(channel, enabled) => void changeSound(channel, enabled)} />
            {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
              <button className="icon-button" type="button" aria-label={snapshot.phase === 'paused' ? 'Resume' : 'Pause'} onClick={togglePause}>
                {snapshot.phase === 'paused' ? '▶' : 'Ⅱ'}
              </button>
            )}
          </div>
          <div className="difficulty" aria-label={`Difficulty ${Math.round(progress * 100)} percent`}>
            <span style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
          </div>
        </header>
      )}

      <div className="status-announcer" aria-live="polite">
        {lastEvent === 'perfect' ? 'Perfect placement!' : ''}
      </div>
      {lastEvent === 'perfect' && <div className="perfect-message" aria-hidden="true">PERFECT <small>×{snapshot.streak}</small></div>}

      {snapshot.phase === 'paused' && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <section className="modal glass-panel">
            <span className="eyebrow">Game on hold</span>
            <h2 id="pause-title">Paused</h2>
            <p>Your tower will be right here.</p>
            <Button onClick={togglePause}>Resume</Button>
            <Button variant="secondary" onClick={handleStart}>Restart</Button>
            <Button variant="ghost" onClick={showMenu}>Back to menu</Button>
          </section>
        </div>
      )}

      {snapshot.phase === 'gameover' && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
          <section className="modal glass-panel gameover-card">
            <span className="eyebrow">{isNewRecord ? 'New record!' : 'The climb is over'}</span>
            <h2 id="gameover-title">{isNewRecord ? 'Unstoppable.' : 'Almost there.'}</h2>
            <div className="final-score">
              <span>Score</span>
              <strong>{snapshot.score}</strong>
            </div>
            <div className="result-row">
              <span>Best <b>{bestScore}</b></span>
              <span>Streak <b>×{snapshot.bestStreak}</b></span>
            </div>
            <p className="result-copy">{snapshot.score < 10 ? 'A solid start. Your next tower could be the one.' : 'Great precision. Now keep that perfect streak going.'}</p>
            <Button onClick={handleStart}>Play again</Button>
            <div className="split-actions">
              <Button variant="secondary" onClick={showMenu}>Menu</Button>
              <Button variant="secondary" onClick={() => void handleShare()}>Share</Button>
            </div>
            {shareMessage && <p className="share-message" aria-live="polite">{shareMessage}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
