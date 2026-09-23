import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './components/Board';
import { CrownLogo } from './components/Icons';
import { HomePage } from './components/HomePage';
import { Modal } from './components/Modal';
import { gameReducer, initialGame, type GameAction, type GameState } from './game/state';
import { getHint, type Hint } from './game/hints';
import { loadDailyPuzzle, loadPuzzleById, loadRandomPuzzle } from './puzzles/loader';
import { bestTimes, completionRate } from './stats/statistics';
import { defaultData, loadStoredData, localDateKey, saveStoredData, streakForDates, type StoredData, type Theme } from './storage/persistence';
import type { Difficulty, Puzzle } from './types/puzzle';
import './styles.css';

type Mode = 'daily' | 'free';
type Panel = 'instructions' | 'settings' | 'stats' | 'complete' | null;
const difficultyName: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const levelNumber = (id: string) => id.split('-').at(-1) ?? id;

function safeRestoredGame(puzzle: Puzzle, value: GameState | undefined): GameState {
  if (!value || value.puzzleId !== puzzle.id || !Array.isArray(value.cells) || value.cells.length !== puzzle.size * puzzle.size || value.cells.some((cell) => ![0, 1, 2].includes(cell))) return initialGame(puzzle);
  return { ...initialGame(puzzle), ...value };
}

function performanceGrid(state: GameState): string {
  const error = Math.min(4, state.errors); const hints = Math.min(4, state.hints);
  return `\n${'🟨'.repeat(error)}${'⬜'.repeat(4 - error)}\n${'💡'.repeat(hints)}${'▫️'.repeat(4 - hints)}`;
}

export default function App() {
  const [stored, setStored] = useState<StoredData>(() => typeof localStorage === 'undefined' ? defaultData() : loadStoredData());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<GameState>({ puzzleId: '', cells: [], undo: [], redo: [], elapsed: 0, errors: 0, hints: 0, paused: false, completed: false, selected: 0 });
  const dispatch = useCallback((action: GameAction) => setGame((current) => gameReducer(current, action)), []);
  const [mode, setMode] = useState<Mode>('daily');
  const [showHome, setShowHome] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [panel, setPanel] = useState<Panel>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Getting your challenge ready…');
  const [loadError, setLoadError] = useState('');
  const completionHandled = useRef(false);

  const openPuzzle = useCallback(async (request: Promise<Puzzle>, nextMode: Mode) => {
    setShowHome(false); setPanel(null); setLoading(true); setLoadError(''); setHint(null); setMessage('Getting the board ready…');
    try {
      const next = await request;
      setPuzzle(next); setMode(nextMode); setDifficulty(next.difficulty);
      const restored = safeRestoredGame(next, stored.games[next.id]);
      setGame(restored);
      completionHandled.current = restored.completed;
      if (restored.completed) setPanel('complete');
      setStored((current) => ({ ...current, recent: [next.id, ...current.recent.filter((id) => id !== next.id)].slice(0, 30) }));
      setMessage(`Puzzle ${next.id} loaded.`);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Could not load the puzzle.'); }
    finally { setLoading(false); }
  }, [stored.games]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = stored.settings.theme;
  }, [stored.settings.theme]);
  useEffect(() => { saveStoredData(stored); }, [stored]);
  useEffect(() => {
    if (!puzzle || game.puzzleId !== puzzle.id) return;
    setStored((current) => ({ ...current, games: { ...current.games, [puzzle.id]: game } }));
  }, [game, puzzle]);
  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(timer);
  }, [dispatch]);

  const playSound = useCallback(() => {
    if (!stored.settings.sound) return;
    try {
      const AudioContextClass = window.AudioContext;
      const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = 520; gain.gain.setValueAtTime(0.025, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08);
    } catch { /* Sound is an optional enhancement. */ }
  }, [stored.settings.sound]);

  useEffect(() => {
    if (!puzzle || !game.completed || completionHandled.current) return;
    completionHandled.current = true; playSound();
    const completion = { id: puzzle.id, difficulty: puzzle.difficulty, size: puzzle.size, seconds: game.elapsed, errors: game.errors, hints: game.hints, date: localDateKey(), mode } as const;
    setStored((current) => {
      const dailyDates = mode === 'daily' ? [...new Set([...current.dailyDates, localDateKey()])] : current.dailyDates;
      const streak = streakForDates(dailyDates);
      return { ...current, completed: [...current.completed, completion], dailyDates, bestStreak: Math.max(current.bestStreak, streak), games: { ...current.games, [puzzle.id]: game } };
    });
    setPanel('complete'); setMessage('Puzzle complete. Well done!');
  }, [game, mode, playSound, puzzle]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); }
      if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); dispatch({ type: 'redo' }); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const act = (index: number, value?: 0 | 1 | 2) => {
    if (!puzzle) return; playSound();
    if (value === undefined) dispatch({ type: 'cycle', index, puzzle, validate: stored.settings.immediateValidation });
    else dispatch({ type: 'set', index, value: game.cells[index] === value ? 0 : value, puzzle, validate: stored.settings.immediateValidation });
  };
  const dragX = (index: number) => {
    if (!puzzle || game.cells[index] === 1) return;
    dispatch({ type: 'set', index, value: 1, puzzle, validate: stored.settings.immediateValidation });
  };
  const askHint = () => {
    if (!puzzle) return;
    const next = getHint(puzzle, game); setHint(next); dispatch({ type: 'hint' }); setMessage(next.message);
    if (next.proposed !== undefined && next.index !== undefined && window.confirm(`${next.message}\n\nApply this hint?`)) act(next.index, next.proposed);
  };
  const startFree = () => void openPuzzle(loadRandomPuzzle(difficulty, stored.recent.slice(0, 20)), 'free');
  const replayById = () => {
    const id = window.prompt('Puzzle ID (for example, CR-M-0001):')?.trim().toUpperCase();
    if (id) void openPuzzle(loadPuzzleById(id), 'free');
  };
  const restart = () => { if (window.confirm('Restart this puzzle? All moves and elapsed time will be cleared.')) { dispatch({ type: 'restart' }); setHint(null); completionHandled.current = false; } };
  const share = async () => {
    if (!puzzle) return;
    const text = `Coroa ${puzzle.id} · ${difficultyName[puzzle.difficulty]}\n⏱ ${formatTime(game.elapsed)} · ${game.errors} errors · ${game.hints} hints${performanceGrid(game)}\nCan you beat it?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Coroa', text });
      else { await navigator.clipboard.writeText(text); setMessage('Result copied.'); }
    } catch (error) { if ((error as DOMException).name !== 'AbortError') { await navigator.clipboard.writeText(text); setMessage('Result copied.'); } }
  };
  const copyResult = async () => {
    if (!puzzle) return;
    const text = `Coroa ${puzzle.id} · ${difficultyName[puzzle.difficulty]} · ${formatTime(game.elapsed)} · ${game.errors} errors · ${game.hints} hints${performanceGrid(game)}`;
    await navigator.clipboard.writeText(text); setMessage('Result copied to the clipboard.');
  };
  const stats = useMemo(() => ({ streak: streakForDates(stored.dailyDates), rate: completionRate(stored.completed, Object.keys(stored.games).length), best: bestTimes(stored.completed) }), [stored]);

  if (showHome) return <HomePage difficulty={difficulty} completed={stored.completed.length} streak={stats.streak} bestStreak={stored.bestStreak} hasGame={Boolean(puzzle && game.puzzleId === puzzle.id)} onDifficultyChange={setDifficulty} onDaily={() => void openPuzzle(loadDailyPuzzle(), 'daily')} onFree={startFree} onContinue={() => setShowHome(false)}/>;

  if (!puzzle || game.puzzleId !== puzzle.id) {
    return <main className="loading-screen"><CrownLogo/><h1>Coroa</h1><p>{loadError || message}</p>{loadError && <button className="primary" onClick={() => void openPuzzle(loadDailyPuzzle(), 'daily')}>Try again</button>}</main>;
  }

  return <div className="app-shell">
    <header className="topbar"><button className="brand brand-button" onClick={() => setShowHome(true)} aria-label="Back to home"><CrownLogo/><span>Coroa</span></button><nav aria-label="Main actions"><button className="text-button help-button" aria-label="How to play" onClick={() => setPanel('instructions')}><span className="desktop-label">How to play</span><span className="mobile-label">Help</span></button><button className="icon-button" onClick={() => setPanel('stats')} aria-label="Statistics">◒</button><button className="icon-button" onClick={() => setPanel('settings')} aria-label="Settings">⚙</button></nav></header>
    <main className="game-layout">
      <section className="game-card" aria-labelledby="game-title">
        <div className="mode-switch" role="group" aria-label="Game mode"><button className={mode === 'daily' ? 'active' : ''} aria-pressed={mode === 'daily'} onClick={() => void openPuzzle(loadDailyPuzzle(), 'daily')}>Daily challenge</button><button className={mode === 'free' ? 'active' : ''} aria-pressed={mode === 'free'} onClick={startFree}>Free play</button></div>
        <div className="game-heading"><div><p className="eyebrow">{mode === 'daily' ? 'Daily challenge' : 'Free play'}</p><h1 id="game-title">Level {levelNumber(puzzle.id)}</h1></div><span className={`difficulty ${puzzle.difficulty}`}>{difficultyName[puzzle.difficulty]}</span></div>
        <div className="metrics" aria-label="Game status"><span><small>Time</small><strong>{formatTime(game.elapsed)}</strong></span><span><small>Errors</small><strong>{game.errors}</strong></span><span><small>Hints</small><strong>{game.hints}</strong></span><span><small>Board</small><strong>{puzzle.size}×{puzzle.size}</strong></span></div>
        <div className="board-wrap">
          <div className="board-interaction" inert={game.paused || loading ? true : undefined} aria-hidden={game.paused || loading ? true : undefined}><Board puzzle={puzzle} state={game} validate={stored.settings.immediateValidation} hint={hint} onCycle={act} onX={(index) => act(index, 1)} onDragX={dragX} onQueen={(index) => act(index, 2)} onSelect={(index) => dispatch({ type: 'select', index })}/></div>
          {game.paused && <div className="pause-cover" role="dialog" aria-label="Game paused"><CrownLogo/><strong>Game paused</strong><button autoFocus className="primary" onClick={() => dispatch({ type: 'pause' })}>Continue</button></div>}
          {loading && <div className="pause-cover" role="status"><span className="spinner"/><strong>Loading…</strong></div>}
        </div>
        <div className="toolbar" inert={game.paused || loading ? true : undefined} aria-hidden={game.paused || loading ? true : undefined} aria-label="Game tools"><button disabled={!game.undo.length || game.paused} onClick={() => dispatch({ type: 'undo' })} aria-label="Undo">↶<span>Undo</span></button><button disabled={!game.redo.length || game.paused} onClick={() => dispatch({ type: 'redo' })} aria-label="Redo">↷<span>Redo</span></button><button aria-label={game.paused ? 'Continue' : 'Pause'} onClick={() => dispatch({ type: 'pause' })}>{game.paused ? '▶' : 'Ⅱ'}<span>{game.paused ? 'Continue' : 'Pause'}</span></button><button aria-label="Hint" disabled={game.paused} onClick={askHint}>◇<span>Hint</span></button><button aria-label="Restart" disabled={game.paused} onClick={restart}>↺<span>Restart</span></button></div>
        {hint && <div className="hint-message"><span>◇</span><p>{hint.message}</p><button onClick={() => setHint(null)} aria-label="Close hint">×</button></div>}
      </section>
      <aside className="side-card"><div className="side-streak"><p className="eyebrow">Your streak</p><strong className="streak">{stats.streak} <span>days</span></strong><p>Best: {stored.bestStreak} days</p></div><hr/><div className="side-controls"><label htmlFor="difficulty">Free-play difficulty</label><select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><button className="primary" onClick={startFree}>New puzzle</button><button className="secondary" onClick={replayById}>Play by ID</button></div></aside>
    </main>
    <div className="sr-live" aria-live="polite">{message}</div>

    {panel === 'instructions' && <Modal title="How to play" onClose={() => setPanel(null)} wide><div className="instructions"><p>Place exactly one crown in every row, column, and colored region. Two crowns also cannot touch diagonally.</p><ol><li><b>First click:</b> mark the cell with an X.</li><li><b>Second click:</b> place a crown.</li><li><b>Third click:</b> clear the cell.</li></ol><p>On a computer, right-click to place an X, use the arrow keys to move, and press <kbd>X</kbd>, <kbd>Q</kbd>, <kbd>Enter</kbd>, or <kbd>Space</kbd> to play. Undo with <kbd>Ctrl/⌘ Z</kbd>.</p><div className="rule-samples"><span>♛ One per row</span><span>♛ One per column</span><span>♛ One per region</span><span>◇ No diagonal contact</span></div></div></Modal>}
    {panel === 'settings' && <Modal title="Settings" onClose={() => setPanel(null)}><div className="settings"><fieldset><legend>Theme</legend>{(['system', 'light', 'dark'] as Theme[]).map((theme) => <label key={theme}><input type="radio" name="theme" checked={stored.settings.theme === theme} onChange={() => setStored((current) => ({ ...current, settings: { ...current.settings, theme } }))}/>{theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}</label>)}</fieldset><label className="toggle"><span><b>Subtle sound</b><small>Off by default</small></span><input type="checkbox" checked={stored.settings.sound} onChange={(event) => setStored((current) => ({ ...current, settings: { ...current.settings, sound: event.target.checked } }))}/></label><label className="toggle"><span><b>Check errors immediately</b><small>Highlights conflicts in the current board</small></span><input type="checkbox" checked={stored.settings.immediateValidation} onChange={(event) => setStored((current) => ({ ...current, settings: { ...current.settings, immediateValidation: event.target.checked } }))}/></label></div></Modal>}
    {panel === 'stats' && <Modal title="Statistics" onClose={() => setPanel(null)} wide><div className="stats-grid"><article><strong>{stored.completed.length}</strong><span>completed</span></article><article><strong>{stats.rate}%</strong><span>completion rate</span></article><article><strong>{stats.streak}</strong><span>current streak</span></article><article><strong>{stored.completed.filter((item) => item.hints > 0).length}</strong><span>games with hints</span></article></div><h3>Best times</h3>{Object.keys(stats.best).length ? <ul className="history">{Object.entries(stats.best).map(([key, seconds]) => <li key={key}><span>{key}</span><b>{formatTime(seconds)}</b></li>)}</ul> : <p>No times recorded yet.</p>}<h3>Recent history</h3><ul className="history">{stored.completed.slice(-8).reverse().map((item, index) => <li key={`${item.id}-${index}`}><span>{item.id} · {difficultyName[item.difficulty]}</span><b>{formatTime(item.seconds)}</b></li>)}</ul></Modal>}
    {panel === 'complete' && <Modal title="Crown claimed" onClose={() => setPanel(null)}><div className="completion"><div className="celebration" aria-hidden="true">♛</div><p>You solved puzzle <b>{puzzle.id}</b>.</p><div className="completion-metrics"><span><small>Time</small><b>{formatTime(game.elapsed)}</b></span><span><small>Errors</small><b>{game.errors}</b></span><span><small>Hints</small><b>{game.hints}</b></span><span><small>Level</small><b>{difficultyName[puzzle.difficulty]}</b></span></div><button className="primary" onClick={() => void share()}>Share result</button><button className="secondary" onClick={() => void copyResult()}>Copy result</button>{mode === 'free' && <button className="text-button centered" onClick={() => { setPanel(null); startFree(); }}>Play another level</button>}<button className="text-button centered home-link" onClick={() => { setPanel(null); setShowHome(true); }}>Go to home page</button></div></Modal>}
  </div>;
}
