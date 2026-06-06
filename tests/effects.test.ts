import { EFFECTS } from '../src/renderer/effects';

describe('Effects', () => {
  it('should have at least 30 effects', () => {
    expect(EFFECTS.length).toBeGreaterThanOrEqual(30);
  });

  it('should have unique effect names', () => {
    const names = EFFECTS.map((e) => e.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have valid effect source code', () => {
    EFFECTS.forEach((effect) => {
      expect(effect.body).toBeDefined();
      expect(effect.body.length).toBeGreaterThan(0);
      expect(effect.body).toContain('vec3 process');
      expect(effect.body).toContain('prev(');
    });
  });

  describe('Core effects', () => {
    const coreEffectNames = [
      'Entropie',
      'Feedback',
      'Glitch',
      'Filtre',
      'Pixelate',
    ];

    coreEffectNames.forEach((name) => {
      it(`should have ${name} effect`, () => {
        const effect = EFFECTS.find((e) => e.name === name);
        expect(effect).toBeDefined();
      });
    });
  });

  describe('New effects (v0.9.0)', () => {
    [
      'Floyd-Steinberg',
      'Continuous Rotate CW',
      'Continuous Rotate CCW',
      'Scanlines Distort',
      'Wave Spiral',
    ].forEach((name) => {
      it(`should have ${name} effect`, () => {
        const effect = EFFECTS.find((e) => e.name === name);
        expect(effect).toBeDefined();
      });
    });
  });
});
