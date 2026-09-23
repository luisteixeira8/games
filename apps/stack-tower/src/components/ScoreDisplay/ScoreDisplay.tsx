interface ScoreDisplayProps {
  label: string;
  value: number;
  emphasis?: boolean;
}

export function ScoreDisplay({ label, value, emphasis = false }: ScoreDisplayProps) {
  return (
    <div className={`score-display ${emphasis ? 'score-display--main' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
