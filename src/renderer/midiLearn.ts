export interface MidiCCMapping {
  cc: number;
  paramId: string;
  min: number;
  max: number;
  curve?: "linear" | "log" | "exp";
}

export class MidiLearner {
  private mappings: Map<number, MidiCCMapping> = new Map();
  private learnMode: boolean = false;
  private learnParamId: string = "";
  private learnCallback?: (cc: number, paramId: string) => void;

  enterLearnMode(paramId: string, callback: (cc: number, paramId: string) => void): void {
    this.learnMode = true;
    this.learnParamId = paramId;
    this.learnCallback = callback;
  }

  exitLearnMode(): void {
    this.learnMode = false;
    this.learnParamId = "";
    this.learnCallback = undefined;
  }

  isLearning(): boolean {
    return this.learnMode;
  }

  getLearningParamId(): string {
    return this.learnParamId;
  }

  onMidiCC(cc: number, value: number): boolean {
    if (this.learnMode && this.learnCallback) {
      this.learnCallback(cc, this.learnParamId);
      this.mapCC(cc, this.learnParamId, 0, 1, "linear");
      this.exitLearnMode();
      return true;
    }
    return false;
  }

  mapCC(cc: number, paramId: string, min = 0, max = 1, curve: "linear" | "log" | "exp" = "linear"): void {
    this.mappings.set(cc, { cc, paramId, min, max, curve });
  }

  unmap(cc: number): void {
    this.mappings.delete(cc);
  }

  getValue(cc: number, rawValue: number): number | null {
    const mapping = this.mappings.get(cc);
    if (!mapping) return null;

    const norm = Math.max(0, Math.min(1, rawValue / 127));
    let curved = norm;

    switch (mapping.curve) {
      case "log":
        curved = Math.log(norm + 0.001) / Math.log(1.001);
        break;
      case "exp":
        curved = Math.pow(norm, 0.5);
        break;
    }

    return mapping.min + (mapping.max - mapping.min) * curved;
  }

  getMappings(): MidiCCMapping[] {
    return Array.from(this.mappings.values());
  }

  getMappingByCC(cc: number): MidiCCMapping | null {
    return this.mappings.get(cc) ?? null;
  }

  getMappingsByParam(paramId: string): MidiCCMapping[] {
    return this.getMappings().filter(m => m.paramId === paramId);
  }

  clearMappings(): void {
    this.mappings.clear();
  }

  toJSON(): MidiCCMapping[] {
    return this.getMappings();
  }

  fromJSON(data: MidiCCMapping[]): void {
    this.clearMappings();
    data.forEach(m => this.mappings.set(m.cc, m));
  }
}
