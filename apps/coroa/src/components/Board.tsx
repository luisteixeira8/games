import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { Puzzle } from '../types/puzzle';
import type { GameState } from '../game/state';
import { findConflicts, regionAt } from '../game/rules';
import type { Hint } from '../game/hints';
import { unitContains } from '../game/hints';

interface Props { puzzle: Puzzle; state: GameState; validate: boolean; hint: Hint | null; onCycle(index: number): void; onX(index: number): void; onDragX(index: number): void; onQueen(index: number): void; onSelect(index: number): void }

export function Board({ puzzle, state, validate, hint, onCycle, onX, onDragX, onQueen, onSelect }: Props) {
  const drag = useRef<{ active: boolean; pointerId: number; origin: number; startX: number; startY: number; marked: Set<number>; dragged: boolean }>({ active: false, pointerId: -1, origin: -1, startX: 0, startY: 0, marked: new Set(), dragged: false });
  const suppressClick = useRef(false);
  useEffect(() => {
    const stopDrag = () => {
      if (drag.current.dragged) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 0);
      }
      drag.current.active = false;
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => { window.removeEventListener('pointerup', stopDrag); window.removeEventListener('pointercancel', stopDrag); };
  }, []);

  const startDrag = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return;
    drag.current = { active: true, pointerId: event.pointerId, origin: index, startX: event.clientX, startY: event.clientY, marked: new Set(), dragged: false };
  };
  const continueDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId || event.buttons !== 1) return;
    if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) < 7) return;
    const pointed = document.elementFromPoint?.(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cell-index]') ?? event.currentTarget;
    const index = Number(pointed.dataset.cellIndex);
    if (!Number.isInteger(index) || index === drag.current.origin) return;
    if (event.cancelable) event.preventDefault();
    if (!drag.current.dragged) {
      drag.current.dragged = true;
      drag.current.marked.add(drag.current.origin);
      onDragX(drag.current.origin);
    }
    if (!drag.current.marked.has(index)) {
      drag.current.marked.add(index);
      onDragX(index);
    }
  };
  const clickCell = (index: number) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onCycle(index);
  };
  const conflicts = new Map((validate ? findConflicts(puzzle, state.cells) : []).map((item) => [item.index, item.reasons]));
  const moveSelection = (event: KeyboardEvent, index: number) => {
    const row = Math.floor(index / puzzle.size); const col = index % puzzle.size;
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[event.key]) {
      event.preventDefault(); const [dr, dc] = moves[event.key]!;
      const next = ((row + dr + puzzle.size) % puzzle.size) * puzzle.size + ((col + dc + puzzle.size) % puzzle.size);
      onSelect(next); document.getElementById(`cell-${next}`)?.focus(); return;
    }
    if (event.key.toLowerCase() === 'x') { event.preventDefault(); onX(index); }
    if (event.key.toLowerCase() === 'q') { event.preventDefault(); onQueen(index); }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCycle(index); }
  };
  return (
    <div className={`board size-${puzzle.size}`} role="grid" aria-label={`${puzzle.size} by ${puzzle.size} board`} aria-rowcount={puzzle.size} aria-colcount={puzzle.size} style={{ '--size': puzzle.size } as React.CSSProperties}>
      {state.cells.map((value, index) => {
        const row = Math.floor(index / puzzle.size); const col = index % puzzle.size; const region = regionAt(puzzle, index);
        const top = row === 0 || regionAt(puzzle, index - puzzle.size) !== region;
        const left = col === 0 || regionAt(puzzle, index - 1) !== region;
        const right = col === puzzle.size - 1 || regionAt(puzzle, index + 1) !== region;
        const bottom = row === puzzle.size - 1 || regionAt(puzzle, index + puzzle.size) !== region;
        const reasons = conflicts.get(index);
        const classes = ['cell', `region-${region}`, value === 0 && 'empty', top && 'edge-top', left && 'edge-left', right && 'edge-right', bottom && 'edge-bottom', state.selected === index && 'selected', reasons && 'conflict', hint?.index === index && 'hint-cell', unitContains(puzzle, index, hint) && 'hint-unit'].filter(Boolean).join(' ');
        const stateName = value === 2 ? 'crown' : value === 1 ? 'X' : 'empty';
        const reasonName = { linha: 'row', coluna: 'column', região: 'region', diagonal: 'diagonal' } as const;
        return <button id={`cell-${index}`} data-cell-index={index} key={index} role="gridcell" className={classes} tabIndex={state.selected === index ? 0 : -1} aria-rowindex={row + 1} aria-colindex={col + 1} aria-selected={state.selected === index} aria-label={`Row ${row + 1}, column ${col + 1}, region ${region + 1}, ${stateName}${reasons ? `, conflict: ${reasons.map((reason) => reasonName[reason]).join(', ')}` : ''}`} onFocus={() => onSelect(index)} onPointerDown={(event) => startDrag(event, index)} onPointerMove={continueDrag} onClick={() => clickCell(index)} onContextMenu={(event: MouseEvent) => { event.preventDefault(); onX(index); }} onKeyDown={(event) => moveSelection(event, index)}><span className="cell-mark" aria-hidden="true">{value === 2 ? '♛' : value === 1 ? '×' : ''}</span>{reasons && <span className="conflict-mark" aria-hidden="true">!</span>}</button>;
      })}
    </div>
  );
}
