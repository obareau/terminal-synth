/**
 * Entrée MIDI (Web MIDI) — utilisée comme **contrôle** des visuels.
 *
 * Deux modes :
 *  - "organ" (orgue visuel / dark ambient) : énergie soutenue tant que des notes
 *    sont tenues, enveloppes lentes.
 *  - "noise" (rhythmic noise) : chaque note = impact sec, décroissance rapide → percussif.
 *
 * Expose : energy (0..1), mod (mod wheel / aftertouch, 0..1), bend (-1..1),
 * polyphony (nb de notes tenues), held (notes → vélocité).
 */

export type MidiMode = "organ" | "noise";

export class MidiInput {
  enabled = false;
  deviceName = "";
  mode: MidiMode = "organ";
  energy = 0;
  mod = 0;
  bend = 0;
  readonly held = new Map<number, number>(); // note → vélocité 0..1
  onProgramChange?: (pc: number) => void;
  private last = performance.now();
  private lastCC: { cc: number; value: number } | null = null;
  private lastNote: { note: number; velocity: number } | null = null;
  private outputs: MIDIOutputLike[] = [];
  private access: MIDIAccessLike | null = null;
  /** Port choisi par l'utilisateur (id natif Web MIDI) ; undefined = tous les ports fusionnés. */
  selectedInputId: string | undefined;

  stop(): void {
    // Détache les handlers de la session en cours — sinon un nouveau start() empile un
    // listener fantôme en plus sur le même port physique (double réception des messages).
    if (this.access) this.access.inputs.forEach((inp) => { inp.onmidimessage = null; });
    this.enabled = false;
    this.held.clear();
    this.energy = 0;
    this.mod = 0;
    this.bend = 0;
    this.deviceName = "";
    this.outputs = [];
    this.access = null;
  }

  async start(deviceId?: string): Promise<void> {
    const nav = navigator as unknown as {
      requestMIDIAccess?: (opts?: { sysex: boolean }) => Promise<MIDIAccessLike>;
    };
    if (!nav.requestMIDIAccess) throw new Error("Web MIDI indisponible");
    const access = await nav.requestMIDIAccess({ sysex: false });
    this.access = access;
    this.selectedInputId = deviceId;
    const bind = (): void => this.rebind();
    bind();
    access.onstatechange = bind;
    this.enabled = true;
  }

  /** Liste les ports d'entrée détectés (pour le sélecteur UI). Nécessite `start()` déjà appelé. */
  listInputs(): { id: string; name: string }[] {
    if (!this.access) return [];
    const out: { id: string; name: string }[] = [];
    this.access.inputs.forEach((inp) => out.push({ id: inp.id, name: inp.name || "MIDI" }));
    return out;
  }

  /** Change le port actif sans redemander l'accès Web MIDI. */
  setInput(deviceId: string | undefined): void {
    this.selectedInputId = deviceId;
    this.rebind();
  }

  private rebind(): void {
    if (!this.access) return;
    const inputs: MIDIInputLike[] = [];
    this.access.inputs.forEach((inp) => {
      inp.onmidimessage = null;
      inputs.push(inp);
    });
    const target = this.selectedInputId ? inputs.find((i) => i.id === this.selectedInputId) : undefined;
    let name = "";
    if (target) {
      target.onmidimessage = (e) => this.onMessage(e.data);
      name = target.name || "MIDI";
    } else {
      // Pas de sélection (ou port débranché) → fusionne tous les ports disponibles.
      inputs.forEach((inp) => {
        inp.onmidimessage = (e) => this.onMessage(e.data);
        if (!name && inp.name) name = inp.name;
      });
    }
    this.outputs = [];
    this.access.outputs.forEach((out) => this.outputs.push(out));
    this.deviceName = name || "MIDI";
  }

  /** Éclaire un pad (Note On = couleur, vélocité 0 = éteint) sur toutes les sorties MIDI connectées. */
  sendNoteOn(note: number, velocity: number, channel = 0): void {
    const status = 0x90 | (channel & 0x0f);
    for (const out of this.outputs) out.send([status, note & 0x7f, velocity & 0x7f]);
  }

  private onMessage(data: Uint8Array | null): void {
    if (!data || data.length < 2) return;
    const status = data[0] & 0xf0;
    const d1 = data[1];
    const d2 = data[2] ?? 0;
    switch (status) {
      case 0x90: // note on (ou note off si vélocité 0)
        if (d2 > 0) {
          const v = d2 / 127;
          this.held.set(d1, v);
          if (this.mode === "noise") this.energy = Math.max(this.energy, v);
        } else {
          this.held.delete(d1);
        }
        this.lastNote = { note: d1, velocity: d2 }; // pour MIDI Learn (pads, etc.)
        break;
      case 0x80: // note off
        this.held.delete(d1);
        this.lastNote = { note: d1, velocity: 0 };
        break;
      case 0xa0: // aftertouch polyphonique
        this.mod = Math.max(this.mod, d2 / 127);
        if (this.held.has(d1)) this.held.set(d1, Math.max(this.held.get(d1) ?? 0, d2 / 127));
        break;
      case 0xd0: // aftertouch de canal
        this.mod = d1 / 127;
        break;
      case 0xb0: // control change
        if (d1 === 1) this.mod = d2 / 127; // mod wheel
        // Store all CC messages for MIDI Learn
        this.lastCC = { cc: d1, value: d2 };
        break;
      case 0xc0: // program change → rappel de scène
        this.onProgramChange?.(d1);
        break;
      case 0xe0: // pitch bend
        this.bend = (((d2 << 7) | d1) / 16383) * 2 - 1;
        break;
    }
  }

  /** À appeler une fois par frame : applique les enveloppes selon le mode. */
  update(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.mode === "organ") {
      let target = 0;
      for (const v of this.held.values()) target = Math.max(target, v);
      this.energy += (target - this.energy) * Math.min(1, dt * 6);
      this.mod *= Math.pow(0.2, dt);
    } else {
      this.energy *= Math.pow(0.0005, dt); // percussif : retombe vite
      this.mod *= Math.pow(0.05, dt);
    }
  }

  get polyphony(): number {
    return this.held.size;
  }

  getAndClearLastCC(): { cc: number; value: number } | null {
    const cc = this.lastCC;
    this.lastCC = null;
    return cc;
  }

  getAndClearLastNote(): { note: number; velocity: number } | null {
    const n = this.lastNote;
    this.lastNote = null;
    return n;
  }
}

// --- Types Web MIDI minimaux (évite une dépendance @types/webmidi) ---
interface MIDIMessage {
  data: Uint8Array | null;
}
interface MIDIInputLike {
  id: string;
  name: string | null;
  onmidimessage: ((e: MIDIMessage) => void) | null;
}
interface MIDIOutputLike {
  send: (data: number[]) => void;
}
interface MIDIAccessLike {
  inputs: { forEach: (cb: (input: MIDIInputLike) => void) => void };
  outputs: { forEach: (cb: (output: MIDIOutputLike) => void) => void };
  onstatechange: (() => void) | null;
}
