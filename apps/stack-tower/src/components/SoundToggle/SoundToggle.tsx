import { useState } from 'react';
import type { SoundPreferences } from '../../types/game';

interface SoundToggleProps {
  preferences: SoundPreferences;
  onChange: (channel: keyof SoundPreferences, enabled: boolean) => void;
}

const CHANNELS: Array<{ key: keyof SoundPreferences; label: string; detail: string }> = [
  { key: 'musicEnabled', label: 'Music', detail: 'Background melody' },
  { key: 'ambientEnabled', label: 'City', detail: 'Urban ambience' },
  { key: 'effectsEnabled', label: 'Blocks', detail: 'Moves and records' }
];

export function SoundToggle({ preferences, onChange }: SoundToggleProps) {
  const [open, setOpen] = useState(false);
  const anyEnabled = Object.values(preferences).some(Boolean);

  return (
    <div className="sound-control">
      <button
        className="icon-button"
        type="button"
        aria-label="Sound settings"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {anyEnabled ? (
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6a4.5 4.5 0 0 0 2.1-3.8Zm-2.1-8.4v2.1a7 7 0 0 1 0 12.6v2.1a9 9 0 0 0 0-16.8Z"/></svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m19.8 22-3.1-3.1a9 9 0 0 1-2.3 1.5v-2.1c.3-.2.6-.4.9-.7l-2.3-2.3v3.8l-5-4H4v-6h.8L2 6.2 3.2 5l17.6 17-1 1Zm.3-4.7-1.5-1.5a7 7 0 0 0-4.2-10.1V3.6a9 9 0 0 1 5.7 13.7Zm-3.6-3.5-2.1-2.1V8.2a4.5 4.5 0 0 1 2.1 5.6ZM13 10.3 8.8 6.2 13 3v7.3Z"/></svg>
        )}
      </button>
      {open && (
        <div className="sound-panel glass-panel" aria-label="Sound settings">
          <strong>Sound</strong>
          {CHANNELS.map((channel) => (
            <button
              key={channel.key}
              type="button"
              role="switch"
              aria-checked={preferences[channel.key]}
              onClick={() => onChange(channel.key, !preferences[channel.key])}
            >
              <span><b>{channel.label}</b><small>{channel.detail}</small></span>
              <i className={preferences[channel.key] ? 'is-on' : ''} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
