/**
 * Audio tone generator for notification sounds
 * Creates simple beep tones similar to WhatsApp
 */

type AudioContext = typeof window.AudioContext;

let audioContext: InstanceType<AudioContext> | null = null;

const getAudioContext = (): InstanceType<AudioContext> | null => {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioContext = new AudioContextClass();
      } catch (e) {
        console.warn("Web Audio API not supported:", e);
      }
    }
  }
  return audioContext;
};

/**
 * Play a simple tone using Web Audio API
 * @param frequency - Frequency in Hz
 * @param duration - Duration in milliseconds
 * @param volume - Volume (0-1)
 */
export const playTone = (frequency: number = 800, duration: number = 150, volume: number = 0.3) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.warn("Failed to play tone:", error);
  }
};

/**
 * Play WhatsApp-like message received notification
 * Two tones: ascending
 */
export const playMessageReceivedTone = (volume: number = 0.3) => {
  playTone(800, 100, volume);
  setTimeout(() => playTone(1000, 100, volume), 150);
};

/**
 * Play WhatsApp-like message sent notification
 * Single tone: mid-high
 */
export const playMessageSentTone = (volume: number = 0.3) => {
  playTone(900, 80, volume);
};

/**
 * Play notification tone
 * Short double beep
 */
export const playNotificationTone = (volume: number = 0.3) => {
  playTone(700, 60, volume);
  setTimeout(() => playTone(700, 60, volume), 100);
};
