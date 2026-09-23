import type { ColorTheme } from '../../types/game';

interface ThemeToggleProps {
  theme: ColorTheme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isNight = theme === 'night';
  return (
    <button
      className={`theme-switch theme-switch--${theme}`}
      type="button"
      aria-label={isNight ? 'Switch to day mode' : 'Switch to night mode'}
      aria-pressed={isNight}
      title={isNight ? 'Switch to day mode' : 'Switch to night mode'}
      onClick={onToggle}
    >
      <span className="theme-switch__option" aria-hidden="true">☀</span>
      <span className="theme-switch__option" aria-hidden="true">☾</span>
      <span className="theme-switch__thumb" aria-hidden="true" />
    </button>
  );
}
