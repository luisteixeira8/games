(() => {
  'use strict';

  const WIN_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  const LINE_POINTS = [
    [8,16.7,92,16.7], [8,50,92,50], [8,83.3,92,83.3],
    [16.7,8,16.7,92], [50,8,50,92], [83.3,8,83.3,92],
    [10,10,90,90], [90,10,10,90]
  ];
  const COPY = {
    x: ['Your turn — close the line', 'See the space. Take it.', 'One X changes everything.', 'The line is waiting for you.'],
    oCpu: ['CPU is calculating…', 'The machine found an angle…', 'Silence. The CPU is thinking.'],
    oLocal: ['Player O — your move', 'O enters the arena.', 'The board is yours.'],
    win: ['Perfect line.', 'Three. Clean. Unstoppable.', 'Checkmate, squared.', 'That was surgical.'],
    lose: ['The machine takes this one.', 'Close. It left a crack.', 'Breathe. The next one is yours.'],
    draw: ['Perfect equilibrium.', 'Nobody gave up a pixel.', 'Board locked. Another?']
  };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const el = {
    menu: $('#menuScreen'), game: $('#gameScreen'), board: $('#board'), shell: $('#boardShell'),
    cells: $$('.cell'), winLine: $('#winLine'), result: $('#resultCard'), particles: $('#particles'),
    turn: $('#turnStatus'), turnCopy: $('#turnCopy'), badge: $('#modeBadge'), round: $('#roundNumber'),
    scoreX: $('#scoreX'), scoreO: $('#scoreO'), scoreD: $('#scoreDraw'), history: $('#history'),
    cardX: $('#scoreCardX'), cardO: $('#scoreCardO'), streakX: $('#streakX'), streakO: $('#streakO'),
    nameX: $('#nameX'), nameO: $('#nameO'), hintLabel: $('#hintLabel'), hint: $('#hintToggle'),
    resultTitle: $('#resultTitle'), resultKicker: $('#resultKicker'), resultEmblem: $('#resultEmblem'),
    quote: $('#quote'), mood: $('#moodMark'), announcer: $('#announcer')
  };

  const state = {
    board: Array(9).fill(''), current: 'X', active: false, thinking: false,
    mode: 'cpu', difficulty: 'medium', round: 1, starter: 'X',
    scores: { X: 0, O: 0, D: 0 }, streaks: { X: 0, O: 0 }, history: [],
    sound: true, volume: .85, theme: 'dark', aiTimer: null
  };

  class SoundEngine {
    constructor() { this.ctx = null; this.bus = null; this.lastPreview = 0; }
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -20; compressor.knee.value = 18; compressor.ratio.value = 4;
        compressor.attack.value = .004; compressor.release.value = .18;
        const master = this.ctx.createGain(); master.gain.value = .92;
        compressor.connect(master).connect(this.ctx.destination); this.bus = compressor;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    output(node, pan = 0) {
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner(); panner.pan.value = pan; node.connect(panner).connect(this.bus);
      } else node.connect(this.bus);
    }
    tone(freq, duration = .08, type = 'sine', volume = .035, delay = 0, glide = 1, pan = 0) {
      if (!state.sound || state.volume <= 0) return;
      this.init();
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      const peak = Math.min(volume * state.volume * 1.9, .13);
      osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t + duration);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + .009);
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain); this.output(gain, pan); osc.start(t); osc.stop(t + duration + .025);
    }
    noise(duration = .04, volume = .012, delay = 0, frequency = 1800, pan = 0) {
      if (!state.sound || state.volume <= 0) return;
      this.init(); const t = this.ctx.currentTime + delay;
      const frames = Math.ceil(this.ctx.sampleRate * duration), buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
      source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 1.2;
      gain.gain.setValueAtTime(Math.min(volume * state.volume * 1.8, .08), t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      source.connect(filter).connect(gain); this.output(gain, pan); source.start(t); source.stop(t + duration);
    }
    bell(freq, delay = 0, volume = .025, pan = 0) {
      this.tone(freq, .34, 'sine', volume, delay, .998, pan);
      this.tone(freq * 2.01, .19, 'sine', volume * .28, delay + .006, .996, pan);
    }
    place(mark) {
      if (mark === 'X') {
        this.noise(.035, .018, 0, 2200, -.18);
        this.tone(155, .105, 'triangle', .035, 0, .68, -.12);
        this.tone(310, .075, 'square', .012, .022, 1.12, .16);
      } else {
        this.tone(260, .16, 'sine', .032, 0, 1.42, .12);
        this.bell(520, .025, .019, .18);
        this.noise(.025, .008, .015, 3200, .1);
      }
    }
    click() {
      this.noise(.018, .009, 0, 2600);
      this.tone(420, .045, 'sine', .014, 0, .92);
    }
    start() {
      this.tone(130.81, .24, 'triangle', .022, 0, 1.5);
      this.bell(392, .035, .018, -.1); this.bell(523.25, .1, .02, .1);
    }
    restart() {
      this.noise(.03, .009, 0, 1900);
      this.tone(220, .14, 'sine', .024, 0, 1.72);
    }
    win() {
      this.tone(130.81, .5, 'triangle', .026, 0, 1.01);
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.bell(note, i * .075, .026 - i * .002, (i - 1.5) * .11));
      this.noise(.11, .012, .22, 4200);
    }
    lose() {
      [392, 329.63, 261.63].forEach((note, i) => this.tone(note, .22, 'triangle', .026, i * .085, .78, .15 - i * .15));
      this.tone(82.41, .38, 'sine', .025, .12, .72);
    }
    draw() {
      [329.63, 392, 466.16].forEach((note, i) => this.bell(note, i * .045, .018, (i - 1) * .12));
      this.tone(196, .34, 'sine', .022, .16, 1);
    }
    preview() {
      const now = performance.now(); if (now - this.lastPreview < 140) return; this.lastPreview = now;
      this.bell(620, 0, .015, -.08); this.bell(780, .045, .012, .08);
    }
  }
  const audio = new SoundEngine();

  function setScreen(name) {
    el.result.classList.remove('show');
    el.menu.classList.toggle('active', name === 'menu');
    el.game.classList.toggle('active', name === 'game');
    document.body.dataset.screen = name;
  }

  function startGame() {
    clearTimeout(state.aiTimer);
    state.round = 1; state.starter = 'X'; state.scores = { X:0, O:0, D:0 };
    state.streaks = { X:0, O:0 }; state.history = [];
    el.nameX.textContent = state.mode === 'cpu' ? 'You' : 'Player 1';
    el.nameO.textContent = state.mode === 'cpu' ? 'CPU' : 'Player 2';
    el.badge.textContent = state.mode === 'cpu' ? `CPU · ${labelLevel(state.difficulty)}` : 'LOCAL DUEL';
    el.hintLabel.classList.toggle('hidden', state.mode !== 'cpu' || state.difficulty !== 'easy');
    el.hint.checked = false;
    updateScores(); setScreen('game'); newRound(false);
    setTimeout(() => el.cells[0].focus({ preventScroll: true }), 400);
  }

  function newRound(animate = true) {
    clearTimeout(state.aiTimer); el.result.classList.remove('show'); el.winLine.classList.remove('show');
    const reset = () => {
      state.board.fill(''); state.current = state.starter; state.active = true; state.thinking = false;
      el.cells.forEach((cell, i) => {
        cell.innerHTML = ''; cell.disabled = false; cell.className = 'cell'; cell.style.setProperty('--i', i);
        cell.dataset.preview = state.current;
        cell.setAttribute('aria-label', `Row ${Math.floor(i/3)+1}, column ${i%3+1}, empty`);
      });
      el.board.classList.remove('restart-out'); el.board.classList.add('restart-in');
      setTimeout(() => el.board.classList.remove('restart-in'), 650);
      resetWinLine(); updateHUD(); maybeHint();
      if (state.mode === 'cpu' && state.current === 'O') cpuTurn();
    };
    if (animate) {
      el.board.classList.add('restart-out');
      setTimeout(reset, 310);
    } else reset();
  }

  function resetRound() {
    if (!el.game.classList.contains('active')) return;
    state.active = false; clearTimeout(state.aiTimer); audio.restart(); newRound(true);
  }

  function makeMove(index, mark = state.current) {
    if (!state.active || state.thinking || state.board[index]) return false;
    state.board[index] = mark;
    const cell = el.cells[index];
    cell.disabled = true; cell.classList.remove('recommended');
    cell.innerHTML = `<span class="impact" style="--impact:var(--${mark.toLowerCase()})" aria-hidden="true"></span><span class="mark mark-${mark.toLowerCase()}" aria-hidden="true"></span>`;
    delete cell.dataset.preview;
    cell.setAttribute('aria-label', `Row ${Math.floor(index/3)+1}, column ${index%3+1}, ${mark}`);
    audio.place(mark);
    const result = evaluate(state.board);
    if (result) { finishRound(result); return true; }
    state.current = mark === 'X' ? 'O' : 'X'; updateHUD();
    if (state.mode === 'cpu' && state.current === 'O') cpuTurn(); else maybeHint();
    return true;
  }

  function evaluate(board) {
    for (let i = 0; i < WIN_LINES.length; i++) {
      const [a,b,c] = WIN_LINES[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line: WIN_LINES[i], lineIndex: i };
    }
    return board.every(Boolean) ? { winner: 'D' } : null;
  }

  function finishRound(result) {
    state.active = false; state.thinking = false; el.board.classList.remove('thinking');
    el.cells.forEach(c => c.disabled = true);
    state.scores[result.winner]++;
    if (result.winner === 'D') { state.streaks.X = 0; state.streaks.O = 0; }
    else { state.streaks[result.winner]++; state.streaks[result.winner === 'X' ? 'O' : 'X'] = 0; }
    state.history.unshift(result.winner); state.history = state.history.slice(0, 6);
    updateScores(result.winner);

    if (result.winner !== 'D') {
      const color = result.winner === 'X' ? 'var(--x)' : 'var(--o)';
      el.board.style.setProperty('--winner', color);
      el.result.style.setProperty('--result-color', color);
      el.result.style.setProperty('--result-ink', '#17110f');
      result.line.forEach((idx, i) => {
        el.cells[idx].classList.add('winner'); el.cells[idx].style.setProperty('--winner', color);
        el.cells[idx].style.setProperty('--delay', `${i*65}ms`); el.cells[idx].style.setProperty('--tilt', `${i%2 ? 2 : -2}deg`);
      });
      el.cells.filter((_, i) => !result.line.includes(i)).forEach(c => c.classList.add('loser'));
      drawWinLine(result.lineIndex, color);
      const humanWin = state.mode === 'local' || result.winner === 'X';
      if (humanWin) { audio.win(); burst(result.winner); } else audio.lose();
      showResult(result.winner, humanWin);
    } else {
      el.result.style.setProperty('--result-color', 'var(--paper)');
      el.result.style.setProperty('--result-ink', 'var(--ink)');
      el.board.classList.add('shake'); setTimeout(() => el.board.classList.remove('shake'), 450);
      audio.draw(); showResult('D', false);
    }
    state.starter = state.starter === 'X' ? 'O' : 'X';
  }

  function showResult(winner, positive) {
    const isDraw = winner === 'D';
    const title = isDraw ? pick(COPY.draw) : (state.mode === 'cpu' && winner === 'O' ? pick(COPY.lose) : pick(COPY.win));
    const who = isDraw ? 'EMPATE' : winner;
    el.resultEmblem.textContent = isDraw ? '—' : winner;
    el.resultKicker.textContent = isDraw ? 'Nobody owns this round' : `${playerName(winner)} wins · ${state.streaks[winner]} streak`;
    el.resultTitle.textContent = title;
    el.announcer.textContent = isDraw ? `Draw. ${title}` : `${playerName(winner)} wins. ${title}`;
    el.quote.innerHTML = isDraw ? '<strong>Board sealed.</strong><br>A perfectly balanced rivalry.' : `<strong>${who} closes the line.</strong><br>${title}`;
    setTimeout(() => {
      el.result.classList.add('show');
      $('#playAgainBtn').focus({ preventScroll: true });
    }, isDraw ? 260 : 720);
  }

  function nextRound() {
    state.round++; el.round.textContent = String(state.round).padStart(2,'0');
    el.round.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-12px) rotate(-5deg)',opacity:0},{transform:'translateY(10px) rotate(4deg)',opacity:0},{transform:'translateY(0)',opacity:1}], {duration:520,easing:'cubic-bezier(.16,1,.3,1)'});
    audio.restart(); newRound(true);
  }

  function cpuTurn() {
    state.thinking = true; updateHUD(); el.board.classList.add('thinking');
    el.cells.forEach(c => c.disabled = true);
    state.aiTimer = setTimeout(() => {
      if (!state.active) return;
      const move = chooseCpuMove(); state.thinking = false; el.board.classList.remove('thinking');
      el.cells.forEach((c,i) => c.disabled = Boolean(state.board[i]));
      makeMove(move, 'O');
    }, 420 + Math.random()*360);
  }

  function chooseCpuMove() {
    const empty = state.board.map((v,i) => v ? null : i).filter(v => v !== null);
    if (state.difficulty === 'easy') return pick(empty);
    if (state.difficulty === 'medium' && Math.random() < .38) return pick(empty);
    return bestMove(state.board, 'O');
  }

  function bestMove(board, player) {
    let bestScore = -Infinity, moves = [];
    board.forEach((v,i) => {
      if (!v) {
        board[i] = player;
        const score = minimax(board, false, 0);
        board[i] = '';
        if (score > bestScore) { bestScore = score; moves = [i]; }
        else if (score === bestScore) moves.push(i);
      }
    });
    return pick(moves);
  }

  function minimax(board, maximizing, depth) {
    const result = evaluate(board);
    if (result) return result.winner === 'O' ? 10-depth : result.winner === 'X' ? depth-10 : 0;
    if (maximizing) {
      let best = -Infinity;
      board.forEach((v,i) => { if (!v) { board[i]='O'; best=Math.max(best,minimax(board,false,depth+1)); board[i]=''; } });
      return best;
    }
    let best = Infinity;
    board.forEach((v,i) => { if (!v) { board[i]='X'; best=Math.min(best,minimax(board,true,depth+1)); board[i]=''; } });
    return best;
  }

  function maybeHint() {
    el.cells.forEach(c => c.classList.remove('recommended'));
    if (!state.active || state.mode !== 'cpu' || state.difficulty !== 'easy' || !el.hint.checked || state.current !== 'X') return;
    const hint = bestHumanMove();
    if (hint !== undefined) el.cells[hint].classList.add('recommended');
  }

  function bestHumanMove() {
    let bestScore = -Infinity, choice;
    state.board.forEach((v,i) => {
      if (!v) { state.board[i]='X'; const score = minimaxForX(state.board,false,0); state.board[i]=''; if (score > bestScore) { bestScore=score; choice=i; } }
    });
    return choice;
  }
  function minimaxForX(board, maximizing, depth) {
    const result=evaluate(board); if(result) return result.winner==='X'?10-depth:result.winner==='O'?depth-10:0;
    let best=maximizing?-Infinity:Infinity;
    board.forEach((v,i)=>{ if(!v){ board[i]=maximizing?'X':'O'; const score=minimaxForX(board,!maximizing,depth+1); board[i]=''; best=maximizing?Math.max(best,score):Math.min(best,score); }});
    return best;
  }

  function updateHUD() {
    const cpuThinking = state.mode === 'cpu' && state.current === 'O';
    el.turn.style.setProperty('--turn-color', state.current === 'X' ? 'var(--x)' : 'var(--o)');
    el.turnCopy.textContent = state.current === 'X' ? pick(COPY.x) : pick(cpuThinking ? COPY.oCpu : COPY.oLocal);
    el.cardX.classList.toggle('active', state.active && state.current === 'X');
    el.cardO.classList.toggle('active', state.active && state.current === 'O');
    el.mood.textContent = state.current === 'X' ? 'X' : 'O';
    el.cells.forEach((cell, i) => { if (!state.board[i]) cell.dataset.preview = state.current; });
    el.turnCopy.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}], {duration:300,easing:'cubic-bezier(.16,1,.3,1)'});
  }

  function updateScores(winner) {
    el.scoreX.textContent = state.scores.X; el.scoreO.textContent = state.scores.O; el.scoreD.textContent = state.scores.D;
    el.round.textContent = String(state.round).padStart(2,'0');
    el.streakX.textContent = streakText(state.streaks.X); el.streakO.textContent = streakText(state.streaks.O);
    el.streakX.classList.toggle('hot', state.streaks.X >= 2); el.streakO.classList.toggle('hot', state.streaks.O >= 2);
    el.history.innerHTML = state.history.map(r => `<span class="history-chip ${r.toLowerCase()}" aria-label="${r === 'D' ? 'Draw' : `${playerName(r)} wins`}">${r === 'D' ? '—' : r}</span>`).join('');
    if (winner) {
      const card = winner === 'X' ? el.cardX : winner === 'O' ? el.cardO : $('.score-draw');
      card.classList.remove('bump'); void card.offsetWidth; card.classList.add('bump');
      setTimeout(() => card.classList.remove('bump'), 700);
    }
  }

  function streakText(n) { return n >= 3 ? `🔥 ${n} straight — on fire` : n === 2 ? '⚡ 2 straight — gaining pulse' : n === 1 ? '1 win — warming up' : 'Waiting for a spark'; }
  function playerName(mark) { if (state.mode === 'cpu') return mark === 'X' ? 'You' : 'CPU'; return mark === 'X' ? 'Player 1' : 'Player 2'; }
  function labelLevel(level) { return ({easy:'EASY',medium:'MEDIUM',hard:'HARD'})[level]; }

  function drawWinLine(index, color) {
    const [x1,y1,x2,y2] = LINE_POINTS[index], line = $('line', el.winLine);
    line.setAttribute('x1',x1); line.setAttribute('y1',y1); line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    el.winLine.style.setProperty('--winner', color); void el.winLine.offsetWidth; el.winLine.classList.add('show');
  }
  function resetWinLine() { const line=$('line',el.winLine); line.setAttribute('x1',0); line.setAttribute('y1',0); line.setAttribute('x2',0); line.setAttribute('y2',0); }

  function burst(mark) {
    const colors = mark === 'X' ? ['var(--x)','var(--o)','var(--cream)'] : ['var(--o)','var(--x)','var(--cream)'];
    for (let i=0;i<28;i++) {
      const p=document.createElement('i'); p.className='confetti'; p.style.setProperty('--c',pick(colors));
      const angle=(Math.PI*2*i/28)+(Math.random()*.35), distance=100+Math.random()*220;
      p.style.setProperty('--dx',`${Math.cos(angle)*distance}px`); p.style.setProperty('--dy',`${Math.sin(angle)*distance-80}px`);
      p.style.setProperty('--rot',`${Math.random()*720-360}deg`); el.particles.appendChild(p); setTimeout(()=>p.remove(),1000);
    }
  }

  function createAmbient() {
    const wrap=$('#ambient');
    for(let i=0;i<14;i++) { const p=document.createElement('i'); p.className='ambient'; p.style.setProperty('--left',`${Math.random()*100}%`); p.style.setProperty('--top',`${Math.random()*100}%`); p.style.setProperty('--speed',`${4+Math.random()*6}s`); p.style.setProperty('--drift',`${Math.random()*50-25}px`); p.style.width=p.style.height=`${3+Math.random()*6}px`; wrap.appendChild(p); }
  }

  function goMenu() { clearTimeout(state.aiTimer); state.active=false; audio.click(); setScreen('menu'); }

  $$('.mode-card').forEach(btn => btn.addEventListener('click', () => {
    audio.click(); state.mode=btn.dataset.mode;
    $$('.mode-card').forEach(b => { const on=b===btn; b.classList.toggle('active',on); b.setAttribute('aria-checked',on); });
    $('#difficultyWrap').classList.toggle('hidden',state.mode!=='cpu');
  }));
  $$('.segment').forEach(btn => btn.addEventListener('click', () => {
    audio.click(); state.difficulty=btn.dataset.level;
    $$('.segment').forEach(b=>{const on=b===btn;b.classList.toggle('active',on);b.setAttribute('aria-checked',on);});
  }));
  el.cells.forEach(cell => cell.addEventListener('click', () => makeMove(Number(cell.dataset.index))));
  el.shell.addEventListener('pointermove', e => {
    const rect = el.shell.getBoundingClientRect();
    el.shell.style.setProperty('--mx', `${((e.clientX-rect.left)/rect.width)*100}%`);
    el.shell.style.setProperty('--my', `${((e.clientY-rect.top)/rect.height)*100}%`);
  });
  el.shell.addEventListener('pointerleave', () => {
    el.shell.style.setProperty('--mx', '50%'); el.shell.style.setProperty('--my', '50%');
  });
  el.board.addEventListener('keydown', e => {
    const current=Number(document.activeElement?.dataset?.index); if(Number.isNaN(current)) return;
    const moves={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}; if(!(e.key in moves)) return;
    e.preventDefault(); let next=current+moves[e.key];
    if(e.key==='ArrowLeft'&&current%3===0) next=current+2; if(e.key==='ArrowRight'&&current%3===2) next=current-2;
    if(next<0) next+=9; if(next>8) next-=9; el.cells[next].focus();
  });
  $('#startBtn').addEventListener('click',()=>{audio.start();startGame();});
  $('#restartBtn').addEventListener('click',resetRound); $('#playAgainBtn').addEventListener('click',nextRound);
  $('#menuBtn').addEventListener('click',goMenu); $('#resultMenuBtn').addEventListener('click',goMenu); $('#brandBtn').addEventListener('click',goMenu);
  el.hint.addEventListener('change',()=>{audio.click();maybeHint();});
  const soundBtn = $('#soundBtn'), volumePanel = $('#volumePanel'), volumeSlider = $('#volumeSlider'), volumeValue = $('#volumeValue');
  function setVolume(value, preview = false) {
    const percent = Math.max(0, Math.min(100, Number(value)));
    state.volume = percent / 100; state.sound = percent > 0;
    volumeValue.textContent = `${percent}%`; volumeSlider.style.setProperty('--volume-fill', `${percent}%`);
    $('.sound-on',soundBtn).classList.toggle('hidden', !state.sound); $('.sound-off',soundBtn).classList.toggle('hidden', state.sound);
    soundBtn.setAttribute('aria-label', state.sound ? `Adjust sound volume, ${percent} percent` : 'Sound muted. Adjust volume');
    if (preview && state.sound) audio.preview();
  }
  soundBtn.addEventListener('click', e => {
    e.stopPropagation(); const open = !volumePanel.classList.contains('show');
    volumePanel.classList.toggle('show', open); soundBtn.setAttribute('aria-expanded', open);
    if (open) { setTimeout(() => volumeSlider.focus(), 80); audio.click(); }
  });
  volumeSlider.addEventListener('input', e => setVolume(e.target.value, true));
  volumePanel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { volumePanel.classList.remove('show'); soundBtn.setAttribute('aria-expanded', 'false'); });
  $('#themeBtn').addEventListener('click', e => {
    audio.click(); state.theme=state.theme==='dark'?'light':'dark'; document.documentElement.dataset.theme=state.theme;
    e.currentTarget.setAttribute('aria-pressed',state.theme==='light'); e.currentTarget.setAttribute('aria-label',state.theme==='dark'?'Use light theme':'Use dark theme');
    $('.theme-sun',e.currentTarget).classList.toggle('hidden',state.theme==='light'); $('.theme-moon',e.currentTarget).classList.toggle('hidden',state.theme==='dark');
    document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#11110f':'#f6f2e9';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && volumePanel.classList.contains('show')) { volumePanel.classList.remove('show'); soundBtn.setAttribute('aria-expanded','false'); soundBtn.focus(); return; }
    if(e.key==='Escape'&&el.game.classList.contains('active')) goMenu();
    if(e.key.toLowerCase()==='r'&&el.game.classList.contains('active')&&!e.metaKey&&!e.ctrlKey) resetRound();
  });

  createAmbient(); updateScores(); updateHUD();
})();
