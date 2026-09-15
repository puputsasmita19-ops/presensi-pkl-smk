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
export type AdhanVoice = 'makkah' | 'indonesia';

interface ActiveAdhanState {
  isPlaying: boolean;
  stopHandle?: () => void;
  audioElement?: HTMLAudioElement;
  timerId?: ReturnType<typeof setTimeout>;
}

const adhanState: ActiveAdhanState = {
  isPlaying: false,
};

let currentAdhanVoice: AdhanVoice = 'makkah';

export function setAdhanVoice(voice: AdhanVoice): void {
  currentAdhanVoice = voice;
}

export function getAdhanVoice(): AdhanVoice {
  return currentAdhanVoice;
}

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

// Preloaded audio elements cache for instant, zero-buffer playback even on weak signal
const preloadedAudioElements: Record<AdhanVoice, HTMLAudioElement | null> = {
  makkah: null,
  indonesia: null,
};

/**
 * Preload adhan audio with preload="auto" in memory beforehand
 * Ensures audio plays instantaneously without buffering lag when prayer time arrives
 */
export function preloadAdhanAudio(voice?: AdhanVoice): void {
  if (typeof window === 'undefined') return;
  try {
    const voicesToPreload: AdhanVoice[] = voice ? [voice] : ['makkah', 'indonesia'];

    voicesToPreload.forEach((v) => {
      if (!preloadedAudioElements[v]) {
        const src = v === 'indonesia' ? '/audio/adhan_indonesia.mp3' : '/audio/adhan.mp3';
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 1.0;
        // Trigger background load
        audio.load();
        preloadedAudioElements[v] = audio;
      } else {
        // Refresh load state if needed
        const existing = preloadedAudioElements[v];
        if (existing && existing.readyState === 0) {
          existing.preload = 'auto';
          existing.load();
        }
      }
    });
  } catch (err) {
    console.warn('Preloading adhan audio failed:', err);
  }
}

/**
 * Stop any ongoing Adhan playback immediately
 */
export function stopAdhanAudio(): void {
  if (adhanState.audioElement) {
    try {
      adhanState.audioElement.pause();
      adhanState.audioElement.currentTime = 0;
      adhanState.audioElement.src = '';
    } catch {}
    adhanState.audioElement = undefined;
  }
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
 * Play authentic, real human recorded Adhan audio (Suara Asli Muadzin)
 * Uses high-fidelity MP3 recording:
 * - 'makkah': Syeikh Mishary Rashid Alafasy (Lantunan merdu penuh penghayatan)
 * - 'indonesia': Muadzin Nusantara / Indonesia (Khas masjid Indonesia)
 * With graceful Web Audio fallback if device blocks audio file loading.
 */
export function playAdhanAudio(onEnded?: () => void, voice?: AdhanVoice): () => void {
  // Stop existing playback first if running
  stopAdhanAudio();

  const selectedVoice = voice || currentAdhanVoice;
  const audioSrc = selectedVoice === 'indonesia' ? '/audio/adhan_indonesia.mp3' : '/audio/adhan.mp3';

  if (typeof window === 'undefined') return () => {};

  try {
    const audio = new Audio(audioSrc);
    audio.preload = 'auto';
    audio.volume = 1.0;
    adhanState.audioElement = audio;

    const handleEnded = () => {
      stopAdhanAudio();
      if (onEnded) onEnded();
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', () => notifyAdhanListeners(true));
    audio.addEventListener('pause', () => {
      if (audio.currentTime === 0 || audio.ended) {
        notifyAdhanListeners(false);
      }
    });

    const cleanup = () => {
      try {
        audio.removeEventListener('ended', handleEnded);
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch {}
      adhanState.audioElement = undefined;
      notifyAdhanListeners(false);
      if (onEnded) onEnded();
    };

    adhanState.stopHandle = cleanup;

    // Start playing
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          notifyAdhanListeners(true);
        })
        .catch((err) => {
          console.warn('Real adhan audio autoplay prevented, attempting Web Audio synthesis fallback:', err);
          playSynthesizedAdhan(onEnded);
        });
    }

    return cleanup;
  } catch (err) {
    console.warn('Real adhan audio playback failed, falling back:', err);
    return playSynthesizedAdhan(onEnded);
  }
}

/**
 * Fallback Web Audio synthesizer for Adhan if external audio file cannot be loaded
 */
function playSynthesizedAdhan(onEnded?: () => void): () => void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return () => {};

    const activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
    const now = ctx.currentTime + 0.05;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    masterGain.connect(ctx.destination);
    activeNodes.push(masterGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(860, now);
    filter.Q.setValueAtTime(1.8, now);
    filter.connect(masterGain);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(4.8, now);
    lfoGain.gain.setValueAtTime(3.5, now);
    lfo.connect(lfoGain);
    lfo.start(now);
    activeNodes.push(lfo);

    const adhanNotes = [
      { f: 293.66, t: 0.0, d: 0.8 },
      { f: 392.00, t: 0.7, d: 1.5 },
      { f: 440.00, t: 2.1, d: 0.7 },
      { f: 392.00, t: 2.7, d: 0.9 },
      { f: 349.23, t: 3.5, d: 2.2 },
      { f: 349.23, t: 6.0, d: 0.8 },
      { f: 440.00, t: 6.7, d: 1.6 },
      { f: 466.16, t: 8.2, d: 0.9 },
      { f: 440.00, t: 9.0, d: 0.8 },
      { f: 392.00, t: 9.7, d: 2.5 },
    ];

    adhanNotes.forEach(({ f, t, d }) => {
      const noteStart = now + t;
      const noteEnd = noteStart + d;

      const oscPrimary = ctx.createOscillator();
      oscPrimary.type = 'sine';
      oscPrimary.frequency.setValueAtTime(f, noteStart);
      lfoGain.connect(oscPrimary.frequency);

      const oscOvertone = ctx.createOscillator();
      oscOvertone.type = 'triangle';
      oscOvertone.frequency.setValueAtTime(f * 2, noteStart);

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
    }, 12000);

    return cleanup;
  } catch {
    notifyAdhanListeners(false);
    return () => {};
  }
}

