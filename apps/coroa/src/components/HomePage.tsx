import type { Difficulty } from '../types/puzzle';
import { CrownLogo } from './Icons';

interface HomePageProps {
  difficulty: Difficulty;
  completed: number;
  streak: number;
  bestStreak: number;
  hasGame: boolean;
  onDifficultyChange(value: Difficulty): void;
  onDaily(): void;
  onFree(): void;
  onContinue(): void;
}

const difficultyLabel: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function HomePage({ difficulty, completed, streak, bestStreak, hasGame, onDifficultyChange, onDaily, onFree, onContinue }: HomePageProps) {
  return <div className="home-page">
    <header className="home-nav">
      <div className="brand"><CrownLogo/><span>Coroa</span></div>
      <a href="#how-to-play" className="text-button">How to play</a>
    </header>
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker"><span/> A fresh challenge every day</p>
          <h1>Find the place<br/>for every <em>crown.</em></h1>
          <p className="hero-description">A calm, elegant logic game. Place one crown in every row, column, and region — without letting them touch diagonally.</p>
          <div className="hero-actions">
            <button className="primary hero-primary" onClick={onDaily}><span className="button-crown" aria-hidden="true">♛</span><span><small>Today's challenge</small>Play now</span><b>→</b></button>
            {hasGame && <button className="continue-button" onClick={onContinue}>Continue current level</button>}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="crown-orbit orbit-one">✦</div><div className="crown-orbit orbit-two">·</div>
          <div className="mini-board">
            {Array.from({ length: 36 }, (_, index) => <span key={index} className={`mini-region-${[0,0,1,1,2,2,0,3,3,1,2,2,4,3,3,1,5,2,4,4,3,5,5,2,4,0,0,5,1,1,4,4,0,5,5,1][index]}`}>{[0,9,17,20,28,31].includes(index) ? '♛' : [2,7,14,23,27,34].includes(index) ? '×' : ''}</span>)}
          </div>
          <div className="art-note"><b>6 × 6</b><span>Daily level</span></div>
        </div>
      </section>

      <section className="home-options" aria-label="Game modes">
        <article className="free-card">
          <div className="option-icon">◇</div>
          <div className="option-copy"><p className="eyebrow">At your own pace</p><h2>Free play</h2><p>Choose a difficulty and start a new challenge.</p></div>
          <div className="difficulty-pills" role="group" aria-label="Difficulty">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((value) => <button key={value} className={difficulty === value ? 'active' : ''} aria-pressed={difficulty === value} onClick={() => onDifficultyChange(value)}>{difficultyLabel[value]}</button>)}
          </div>
          <button className="secondary free-start" onClick={onFree}>Start a level <span>→</span></button>
        </article>
        <article className="home-stats-card">
          <p className="eyebrow">Your progress</p>
          <div className="home-stat-main"><strong>{streak}</strong><span>day<br/>streak</span></div>
          <div className="home-stat-row"><span><b>{completed}</b> completed</span><span><b>{bestStreak}</b> best streak</span></div>
        </article>
      </section>

      <section id="how-to-play" className="home-rules">
        <div><p className="eyebrow">Simple rules</p><h2>Three ideas.<br/>One solution.</h2></div>
        <ol>
          <li><span>01</span><div><b>One per row and column</b><p>Every row and every column must contain exactly one crown.</p></div></li>
          <li><span>02</span><div><b>One per region</b><p>Each colored region must also contain exactly one crown.</p></div></li>
          <li><span>03</span><div><b>No diagonal contact</b><p>Two crowns cannot touch at the corners.</p></div></li>
        </ol>
      </section>
    </main>
    <footer className="home-footer"><span><CrownLogo/> Coroa</span><p>Made for quiet thinking.</p></footer>
  </div>;
}
