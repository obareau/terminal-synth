import { SHADERS } from '../src/renderer/shaders';

describe('Shaders', () => {
  it('should have at least 35 generators', () => {
    expect(SHADERS.length).toBeGreaterThanOrEqual(35);
  });

  it('should have unique shader names', () => {
    const names = SHADERS.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have valid shader source code', () => {
    SHADERS.forEach((shader) => {
      expect(shader.src).toBeDefined();
      expect(shader.src.length).toBeGreaterThan(0);
      expect(shader.src).toContain('vec3 render');
    });
  });

  it('should have parameters with valid ranges', () => {
    SHADERS.forEach((shader) => {
      if (shader.params) {
        shader.params.forEach((param) => {
          expect(param.label).toBeDefined();
          expect(param.key).toBeDefined();
          expect(param.min).toBeLessThanOrEqual(param.max);
          expect(param.default).toBeGreaterThanOrEqual(param.min);
          expect(param.default).toBeLessThanOrEqual(param.max);
        });
      }
    });
  });

  describe('MIRE ORTF shader', () => {
    it('should be the first shader (startup screen)', () => {
      expect(SHADERS[0].name).toBe('MIRE ORTF');
    });
  });

  describe('RECTA shader', () => {
    it('should have holdMs parameter', () => {
      const recta = SHADERS.find((s) => s.name === 'RECTA (texte)');
      expect(recta).toBeDefined();
      expect(recta?.params).toBeDefined();
      const holdMs = recta?.params?.find((p) => p.key === 'holdMs');
      expect(holdMs).toBeDefined();
    });
  });
});
