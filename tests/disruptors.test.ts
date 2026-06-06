import { DISRUPTORS } from '../src/renderer/disruptors';

describe('Disruptors/Perturbators', () => {
  it('should have at least 15 disruptors', () => {
    expect(DISRUPTORS.length).toBeGreaterThanOrEqual(15);
  });

  it('should have unique disruptor names', () => {
    const names = DISRUPTORS.map((d) => d.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have valid disruptor source code', () => {
    DISRUPTORS.forEach((disruptor) => {
      expect(disruptor.body).toBeDefined();
      expect(disruptor.body.length).toBeGreaterThan(0);
      expect(disruptor.body).toContain('vec3 process');
      expect(disruptor.body).toContain('prev(');
    });
  });

  it('should have valid default sensitivity and timing', () => {
    DISRUPTORS.forEach((disruptor) => {
      expect(disruptor.defaultSensitivity).toBeGreaterThanOrEqual(0);
      expect(disruptor.defaultSensitivity).toBeLessThanOrEqual(1);
      expect(disruptor.defaultDurationMs).toBeGreaterThan(0);
      expect(disruptor.defaultCooldownMs).toBeGreaterThan(0);
    });
  });

  describe('New perturbators (v0.9.0)', () => {
    [
      'Flip Horizontal',
      'Flip Vertical',
      'Mosaic Burst',
      'Spin Vortex',
      'Psycho Shift',
      'Displacement Storm',
    ].forEach((name) => {
      it(`should have ${name} disruptor`, () => {
        const disruptor = DISRUPTORS.find((d) => d.name === name);
        expect(disruptor).toBeDefined();
      });
    });
  });
});
