/**
 * Autoplay — Random automation synced to BPM
 * Every N random measures: changes sources, blend modes, effects, perturbators
 * All sliders interpolate smoothly to random values
 */

export interface AutoplayConfig {
  enabled: boolean;
  bpm: number;
  minMeasures: number; // 4
  maxMeasures: number; // 32
  smoothDurationMs: number; // 500ms
}

export interface AutoplayState {
  isRunning: boolean;
  currentMeasure: number;
  nextChangeAt: number;
  nextChangeMeasures: number;
  smoothTargets: Map<string, number>; // slider ID → target value
  smoothStart: Map<string, { value: number; startTime: number }>;
}

class Autoplay {
  private config: AutoplayConfig = {
    enabled: false,
    bpm: 120,
    minMeasures: 4,
    maxMeasures: 32,
    smoothDurationMs: 500,
  };

  private state: AutoplayState = {
    isRunning: false,
    currentMeasure: 0,
    nextChangeAt: 0,
    nextChangeMeasures: 8,
    smoothTargets: new Map(),
    smoothStart: new Map(),
  };

  private measureDurationMs: number = 2000; // 500ms per beat, 4 beats per measure
  private frameStart: number = 0;
  private animationFrameId: number = 0;

  /**
   * Initialize autoplay
   */
  init(bpm: number) {
    this.config.bpm = bpm;
    this.updateMeasureDuration();
  }

  /**
   * Calculate measure duration from BPM
   * BPM = beats per minute
   * 1 beat = 60000 / BPM ms
   * 1 measure = 4 beats
   */
  private updateMeasureDuration() {
    const beatMs = 60000 / this.config.bpm;
    this.measureDurationMs = beatMs * 4;
  }

  /**
   * Start autoplay
   */
  start() {
    if (this.state.isRunning) return;

    this.config.enabled = true;
    this.state.isRunning = true;
    this.state.currentMeasure = 0;
    this.state.nextChangeMeasures = this.randomMeasures();
    this.state.nextChangeAt = this.state.nextChangeMeasures;
    this.frameStart = performance.now();

    console.log(
      `🎛️ Autoplay started: ${this.state.nextChangeMeasures} measures, ${this.config.bpm} BPM`
    );

    this.loop();
  }

  /**
   * Stop autoplay
   */
  stop() {
    this.config.enabled = false;
    this.state.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    console.log("⏹️ Autoplay stopped");
  }

  /**
   * Main loop — called every frame
   */
  private loop() {
    if (!this.state.isRunning) return;

    const now = performance.now();
    const elapsedMs = now - this.frameStart;
    const currentMeasure = Math.floor(elapsedMs / this.measureDurationMs);

    this.state.currentMeasure = currentMeasure;

    // Check if it's time to change
    if (currentMeasure >= this.state.nextChangeAt) {
      this.triggerChange();
      this.state.nextChangeMeasures = this.randomMeasures();
      this.state.nextChangeAt = currentMeasure + this.state.nextChangeMeasures;

      console.log(
        `🔀 Autoplay change! Next: ${this.state.nextChangeMeasures} measures (measure ${this.state.nextChangeAt})`
      );
    }

    // Update smooth transitions
    this.updateSmoothTransitions(now);

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  /**
   * Trigger random changes
   */
  private triggerChange() {
    // Random source change (A or B)
    this.randomizeSource();

    // Random blend mode
    this.randomizeBlendMode();

    // Random effects
    this.randomizeEffects();

    // Random perturbators
    this.randomizePerturbators();

    // Random slider targets (smooth transition)
    this.randomizeSliders();
  }

  /**
   * Randomize one source (A or B)
   */
  private randomizeSource() {
    const sources = document.querySelectorAll(".src-item");
    const randomSource = sources[Math.floor(Math.random() * sources.length)] as HTMLElement;
    if (randomSource) {
      randomSource.click();
      console.log(`  → Source: ${randomSource.textContent?.trim()}`);
    }
  }

  /**
   * Randomize blend mode
   */
  private randomizeBlendMode() {
    const blendSel = document.getElementById("blend-mode") as HTMLSelectElement;
    if (blendSel) {
      const randomIdx = Math.floor(Math.random() * blendSel.options.length);
      blendSel.selectedIndex = randomIdx;
      blendSel.dispatchEvent(new Event("input", { bubbles: true }));
      console.log(`  → Blend: ${blendSel.options[randomIdx].text}`);
    }
  }

  /**
   * Randomize effects (enable/disable random ones)
   */
  private randomizeEffects() {
    const effectCheckboxes = document.querySelectorAll(".fx input[type='checkbox']");
    let changedCount = 0;

    effectCheckboxes.forEach((checkbox: Element) => {
      const cb = checkbox as HTMLInputElement;
      // 50% chance to toggle each effect
      if (Math.random() < 0.5) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
        changedCount++;
      }
    });

    console.log(`  → Effects: ${changedCount} changed`);
  }

  /**
   * Randomize perturbators (enable/disable random ones)
   */
  private randomizePerturbators() {
    const disruptorCheckboxes = document.querySelectorAll(".disruptor input[type='checkbox']");
    let changedCount = 0;

    disruptorCheckboxes.forEach((checkbox: Element) => {
      const cb = checkbox as HTMLInputElement;
      // 50% chance to toggle each perturbator
      if (Math.random() < 0.5) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
        changedCount++;
      }
    });

    console.log(`  → Perturbators: ${changedCount} changed`);
  }

  /**
   * Set random targets for all sliders (will smooth transition)
   */
  private randomizeSliders() {
    const allSliders = document.querySelectorAll(".fx input[type='range'], .disruptor input[type='range']");
    const now = performance.now();

    allSliders.forEach((slider: Element) => {
      const s = slider as HTMLInputElement;
      const min = parseFloat(s.min) || 0;
      const max = parseFloat(s.max) || 1;
      const randomValue = min + Math.random() * (max - min);

      // Store smooth transition target
      const id = s.id || `slider-${Math.random()}`;
      this.state.smoothTargets.set(id, randomValue);
      this.state.smoothStart.set(id, { value: parseFloat(s.value), startTime: now });
    });

    console.log(`  → Sliders: ${allSliders.length} randomized (smooth over ${this.config.smoothDurationMs}ms)`);
  }

  /**
   * Update smooth slider transitions
   */
  private updateSmoothTransitions(now: number) {
    const allSliders = document.querySelectorAll(
      ".fx input[type='range'], .disruptor input[type='range']"
    );

    allSliders.forEach((slider: Element) => {
      const s = slider as HTMLInputElement;
      const id = s.id || `slider-${Math.random()}`;
      const target = this.state.smoothTargets.get(id);
      const start = this.state.smoothStart.get(id);

      if (target !== undefined && start !== undefined) {
        const elapsed = now - start.startTime;
        const progress = Math.min(elapsed / this.config.smoothDurationMs, 1);

        // Ease-in-out cubic
        const easeProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const newValue = start.value + (target - start.value) * easeProgress;
        s.value = String(newValue);
        s.dispatchEvent(new Event("input", { bubbles: true }));

        // Done with this transition
        if (progress >= 1) {
          this.state.smoothTargets.delete(id);
          this.state.smoothStart.delete(id);
        }
      }
    });
  }

  /**
   * Generate random measure count
   */
  private randomMeasures(): number {
    return (
      this.config.minMeasures +
      Math.floor(Math.random() * (this.config.maxMeasures - this.config.minMeasures + 1))
    );
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.state.isRunning,
      currentMeasure: this.state.currentMeasure,
      nextChangeAt: this.state.nextChangeAt,
      nextChangeMeasures: this.state.nextChangeMeasures,
      bpm: this.config.bpm,
      measureDurationMs: this.measureDurationMs,
    };
  }

  /**
   * Set BPM
   */
  setBPM(bpm: number) {
    this.config.bpm = bpm;
    this.updateMeasureDuration();
  }

  /**
   * Set smooth duration
   */
  setSmoothDuration(ms: number) {
    this.config.smoothDurationMs = Math.max(100, Math.min(5000, ms));
  }
}

// Export singleton
export const autoplay = new Autoplay();
