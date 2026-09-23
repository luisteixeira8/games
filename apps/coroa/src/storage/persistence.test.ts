import { describe, expect, it } from 'vitest';
import { defaultData, loadStoredData, saveStoredData, streakForDates } from './persistence';

describe('persistência', () => {
  it('usa o tema claro por defeito', () => {
    expect(defaultData().settings.theme).toBe('light');
  });
  it('recupera de JSON corrompido e completa dados parciais', () => {
    expect(loadStoredData({ getItem: () => '{não-json' })).toEqual(defaultData());
    const partial = loadStoredData({ getItem: () => JSON.stringify({ version: 1, settings: { theme: 'dark' } }) });
    expect(partial.settings.theme).toBe('dark'); expect(partial.settings.sound).toBe(false);
  });
  it('guarda e lê dados válidos', () => {
    let value = ''; saveStoredData(defaultData(), { setItem: (_key, next) => { value = next; } });
    expect(loadStoredData({ getItem: () => value }).version).toBe(1);
  });
  it('calcula sequências por dias locais consecutivos', () => {
    expect(streakForDates(['2026-07-12', '2026-07-13', '2026-07-14'], new Date(2026, 6, 14))).toBe(3);
  });
});
