export interface SequencerKeyframe {
  stepIndex: number;
  parameter: string;
  value: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  duration?: number;
}

export interface SequencerTrack {
  name: string;
  enabled: boolean;
  keyframes: SequencerKeyframe[];
}

export interface SequencerState {
  enabled: boolean;
  isPlaying: boolean;
  bpm: number;
  beatsPerMeasure: number;
  stepCount: number;
  loopMeasures: number;
  tracks: SequencerTrack[];
  playStartTime: number;
  currentMeasure: number;
  currentStep: number;
  currentBeat: number;
}

export class Sequencer {
  private state: SequencerState;
  private measureDurationMs: number = 0;
  private stepDurationMs: number = 0;

  constructor(initialBpm: number = 120) {
    this.state = {
      enabled: false,
      isPlaying: false,
      bpm: initialBpm,
      beatsPerMeasure: 4,
      stepCount: 16,
      loopMeasures: 4,
      tracks: [
        { name: "Track 1", enabled: true, keyframes: [] },
        { name: "Track 2", enabled: false, keyframes: [] },
        { name: "Track 3", enabled: false, keyframes: [] },
        { name: "Track 4", enabled: false, keyframes: [] },
      ],
      playStartTime: 0,
      currentMeasure: 0,
      currentStep: 0,
      currentBeat: 0,
    };
    this.updateTimings();
  }

  update(now: number): void {
    if (!this.state.isPlaying) return;

    const elapsedMs = now - this.state.playStartTime;
    const totalSteps = this.state.loopMeasures * this.state.stepCount;
    const currentStepFloat = (elapsedMs / this.stepDurationMs) % totalSteps;

    this.state.currentStep = Math.floor(currentStepFloat) % this.state.stepCount;
    this.state.currentMeasure = Math.floor(currentStepFloat / this.state.stepCount) % this.state.loopMeasures;
    this.state.currentBeat = currentStepFloat / (this.state.stepCount / this.state.beatsPerMeasure);
  }

  getParameterValue(paramId: string): number | null {
    const enabledTrack = this.state.tracks.find(t => t.enabled);
    if (!enabledTrack) return null;

    const kfs = enabledTrack.keyframes.filter(kf => kf.parameter === paramId);
    if (!kfs.length) return null;

    const current = kfs.find(kf => kf.stepIndex === this.state.currentStep);
    if (current && !current.duration) return current.value;

    const nextIdx = kfs.findIndex(kf => kf.stepIndex > this.state.currentStep);
    if (nextIdx === -1) return kfs[kfs.length - 1].value;
    if (nextIdx === 0) return kfs[0].value;

    const from = kfs[nextIdx - 1];
    const to = kfs[nextIdx];

    const stepRange = to.stepIndex - from.stepIndex;
    const stepProgress = (this.state.currentStep - from.stepIndex) % stepRange;
    const t = stepProgress / stepRange;

    return this.easeValue(from.value, to.value, Math.max(0, Math.min(1, t)), from.easing ?? "linear");
  }

  private easeValue(from: number, to: number, t: number, easing: string): number {
    let easedT = t;
    switch (easing) {
      case "ease-in":
        easedT = t * t;
        break;
      case "ease-out":
        easedT = 1 - (1 - t) * (1 - t);
        break;
      case "ease-in-out":
        easedT = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
        break;
    }
    return from + (to - from) * easedT;
  }

  play(fromTime?: number): void {
    this.state.playStartTime = fromTime ?? performance.now();
    this.state.isPlaying = true;
  }

  stop(): void {
    this.state.isPlaying = false;
  }

  addKeyframe(trackIndex: number, kf: SequencerKeyframe): void {
    if (trackIndex < 0 || trackIndex >= this.state.tracks.length) return;
    this.state.tracks[trackIndex].keyframes.push(kf);
    this.state.tracks[trackIndex].keyframes.sort((a, b) => a.stepIndex - b.stepIndex);
  }

  removeKeyframe(trackIndex: number, stepIndex: number, paramId: string): void {
    if (trackIndex < 0 || trackIndex >= this.state.tracks.length) return;
    this.state.tracks[trackIndex].keyframes = this.state.tracks[trackIndex].keyframes.filter(
      kf => !(kf.stepIndex === stepIndex && kf.parameter === paramId)
    );
  }

  getState(): SequencerState {
    return this.state;
  }

  setBpm(bpm: number): void {
    this.state.bpm = Math.max(60, Math.min(240, bpm));
    this.updateTimings();
  }

  setStepCount(count: number): void {
    this.state.stepCount = count;
    this.updateTimings();
  }

  setTrackEnabled(trackIndex: number, enabled: boolean): void {
    if (trackIndex >= 0 && trackIndex < this.state.tracks.length) {
      this.state.tracks[trackIndex].enabled = enabled;
    }
  }

  private updateTimings(): void {
    this.measureDurationMs = (60000 / this.state.bpm) * this.state.beatsPerMeasure;
    this.stepDurationMs = this.measureDurationMs / this.state.stepCount;
  }

  toJSON() {
    return this.state;
  }

  fromJSON(data: SequencerState): void {
    this.state = { ...data };
    this.updateTimings();
  }
}
