/**
 * Audio Chime Synthesizer using Web Audio API
 * Generates gentle bell / notification chimes without external audio assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a gentle two-tone reminder chime (pleasant marimba / bell chord)
 */
export function playReminderChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1 (High bell E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Tone 2 (Harmonic bell B5 - 987.77 Hz after 120ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
}

/**
 * Play a cheerful success chime when sync is complete
 */
export function playSyncSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (err) {
    console.warn('Sync success audio chime playback omitted:', err);
  }
}

/**
 * Play a soothing, majestic Islamic / prayer reminder chime (melodic adhan motif)
 * Synthesized purely with Web Audio API without any external assets.
 */
export function playPrayerCallChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Soothing Islamic prayer call melodic motif
    // D4 (293.66 Hz), F4 (349.23 Hz), G4 (392.00 Hz), A4 (440.00 Hz), D5 (587.33 Hz)
    const melody = [
      { f: 293.66, t: 0.0, d: 0.55 },
      { f: 349.23, t: 0.35, d: 0.5 },
      { f: 392.00, t: 0.72, d: 0.65 },
      { f: 440.00, t: 1.2, d: 0.8 },
      { f: 587.33, t: 1.85, d: 1.8 },
    ];

    melody.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + t;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      // Gentle attack and exponential reverberant decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + d);
    });
  } catch (err) {
    console.warn('Prayer call audio chime playback omitted:', err);
  }
}

// Active Adhan Audio Tracking & Management
interface ActiveAdhanState {
  isPlaying: boolean;
  stopHandle?: () => void;
  timerId?: ReturnType<typeof setTimeout>;
}

const adhanState: ActiveAdhanState = {
  isPlaying: false,
};

const adhanListeners: Array<(isPlaying: boolean) => void> = [];

export function isAdhanPlaying(): boolean {
  return adhanState.isPlaying;
}

export function addAdhanListener(callback: (isPlaying: boolean) => void): () => void {
  adhanListeners.push(callback);
  return () => {
    const idx = adhanListeners.indexOf(callback);
    if (idx !== -1) adhanListeners.splice(idx, 1);
  };
}

function notifyAdhanListeners(isPlaying: boolean): void {
  adhanState.isPlaying = isPlaying;
  adhanListeners.forEach((cb) => {
    try {
      cb(isPlaying);
    } catch {}
  });
}

/**
 * Stop any ongoing Adhan playback immediately
 */
export function stopAdhanAudio(): void {
  if (adhanState.stopHandle) {
    adhanState.stopHandle();
    adhanState.stopHandle = undefined;
  }
  if (adhanState.timerId) {
    clearTimeout(adhanState.timerId);
    adhanState.timerId = undefined;
  }
  notifyAdhanListeners(false);
}

/**
 * Play authentic, resonant Adhan call using Web Audio API synthesis
 * Melodic structure follows Maqam Bayati (Allahu Akbar, Allahu Akbar...)
 * Complete with harmonic formant filtering, subtle vocal vibrato, and reverberant decay.
 * Can be stopped anytime via stopAdhanAudio() or returning cleanup function.
 */
export function playAdhanAudio(onEnded?: () => void): () => void {
  // Stop existing playback first if running
  stopAdhanAudio();

  try {
    const ctx = getAudioContext();
    if (!ctx) return () => {};

    const activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
    const now = ctx.currentTime + 0.05;

    // Master bus for Adhan
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    masterGain.connect(ctx.destination);
    activeNodes.push(masterGain);

    // Warm resonant bandpass filter simulating acoustic mosque hall formant
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(860, now);
    filter.Q.setValueAtTime(1.8, now);
    filter.connect(masterGain);

    // Vibrato LFO (4.8 Hz gentle pitch modulation characteristic of adhan vocalization)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(4.8, now);
    lfoGain.gain.setValueAtTime(3.5, now); // ~3.5 Hz pitch modulation depth
    lfo.connect(lfoGain);
    lfo.start(now);
    activeNodes.push(lfo);

    // Melodic notes sequence in Maqam Bayati (Takbir 1, Takbir 2, & Shahadah phrases)
    // D4 = 293.66, Eb4 = 311.13, F4 = 349.23, G4 = 392.00, A4 = 440.00, Bb4 = 466.16, C5 = 523.25, D5 = 587.33
    const adhanNotes = [
      // Phrase 1: "Allaaahu Akbar..."
      { f: 293.66, t: 0.0, d: 0.8 },   // Al-
      { f: 392.00, t: 0.7, d: 1.5 },   // laa-
      { f: 440.00, t: 2.1, d: 0.7 },   // hu
      { f: 392.00, t: 2.7, d: 0.9 },   // Ak-
      { f: 349.23, t: 3.5, d: 2.2 },   // bar...

      // Phrase 2: "Allaaahu Akbar..."
      { f: 349.23, t: 6.0, d: 0.8 },   // Al-
      { f: 440.00, t: 6.7, d: 1.6 },   // laa-
      { f: 466.16, t: 8.2, d: 0.9 },   // hu
      { f: 440.00, t: 9.0, d: 0.8 },   // Ak-
      { f: 392.00, t: 9.7, d: 2.5 },   // bar...

      // Phrase 3: "Ash-hadu allaa ilaaha illallaah..."
      { f: 293.66, t: 12.5, d: 0.7 },  // Ash-
      { f: 349.23, t: 13.1, d: 1.0 },  // hadu
      { f: 392.00, t: 14.0, d: 0.9 },  // al-
      { f: 440.00, t: 14.8, d: 1.8 },  // laa
      { f: 392.00, t: 16.5, d: 0.8 },  // i-
      { f: 349.23, t: 17.2, d: 1.2 },  // laaha
      { f: 392.00, t: 18.3, d: 1.4 },  // il-lal-
      { f: 293.66, t: 19.6, d: 3.2 },  // laah...
    ];

    const totalDuration = 23.5; // ~23 seconds rich melodic Azan preview

    adhanNotes.forEach(({ f, t, d }) => {
      const noteStart = now + t;
      const noteEnd = noteStart + d;

      // Primary warm vocal oscillator (sine)
      const oscPrimary = ctx.createOscillator();
      oscPrimary.type = 'sine';
      oscPrimary.frequency.setValueAtTime(f, noteStart);
      lfoGain.connect(oscPrimary.frequency);

      // Secondary overtone oscillator (triangle for subtle harmonic body)
      const oscOvertone = ctx.createOscillator();
      oscOvertone.type = 'triangle';
      oscOvertone.frequency.setValueAtTime(f * 2, noteStart);

      // Note envelope gain
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.001, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.32, noteStart + 0.12);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteEnd + 0.35);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.001, noteStart);
      overtoneGain.gain.linearRampToValueAtTime(0.08, noteStart + 0.15);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, noteEnd + 0.25);

      oscPrimary.connect(noteGain);
      oscOvertone.connect(overtoneGain);
      noteGain.connect(filter);
      overtoneGain.connect(filter);

      oscPrimary.start(noteStart);
      oscPrimary.stop(noteEnd + 0.4);
      oscOvertone.start(noteStart);
      oscOvertone.stop(noteEnd + 0.4);

      activeNodes.push(oscPrimary, oscOvertone, noteGain, overtoneGain);
    });

    notifyAdhanListeners(true);

    const cleanup = () => {
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        setTimeout(() => {
          activeNodes.forEach((node) => {
            try {
              if (typeof node.stop === 'function') node.stop();
              node.disconnect();
            } catch {}
          });
        }, 180);
      } catch {}
      notifyAdhanListeners(false);
      if (onEnded) onEnded();
    };

    adhanState.stopHandle = cleanup;
    adhanState.timerId = setTimeout(() => {
      stopAdhanAudio();
      if (onEnded) onEnded();
    }, totalDuration * 1000);

    return cleanup;
  } catch (err) {
    console.warn('Adhan audio synthesis failed:', err);
    notifyAdhanListeners(false);
    return () => {};
  }
}

