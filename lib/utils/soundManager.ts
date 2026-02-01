/**
 * Sound manager for Lets chat-style notifications
 * Handles playing notification and chat sounds
 */

import {
  playMessageReceivedTone,
  playMessageSentTone,
  playNotificationTone,
} from "./audioGenerator";

type SoundType = "message-received" | "message-sent" | "notification";

interface SoundSettings {
  enabled: boolean;
  volume: number;
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
};

// Store sound settings in localStorage
const getSoundSettings = (): SoundSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem("soundSettings");
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSoundSettings = (settings: SoundSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("soundSettings", JSON.stringify(settings));
};

const playSound = (soundType: SoundType) => {
  if (typeof window === "undefined") return;

  const settings = getSoundSettings();
  if (!settings.enabled) return;

  try {
    // Try to play audio file first
    const soundMap: Record<SoundType, string> = {
      "message-received": "/sounds/message-received.mp3",
      "message-sent": "/sounds/message-sent.mp3",
      notification: "/sounds/notification.mp3",
    };

    const audio = new Audio(soundMap[soundType]);
    audio.volume = Math.min(Math.max(settings.volume, 0), 1);

    // If audio file fails to load, fall back to tone generator
    audio.onerror = () => {
      console.warn(
        `Audio file not found: ${soundMap[soundType]}, using tone generator`,
      );
      playToneByType(soundType, settings.volume);
    };

    audio.play().catch(() => {
      // If playback fails, try tone generator
      playToneByType(soundType, settings.volume);
    });
  } catch (error) {
    console.warn("Error playing audio, using tone generator:", error);
    playToneByType(soundType, settings.volume);
  }
};

const playToneByType = (soundType: SoundType, volume: number) => {
  switch (soundType) {
    case "message-received":
      playMessageReceivedTone(volume);
      break;
    case "message-sent":
      playMessageSentTone(volume);
      break;
    case "notification":
      playNotificationTone(volume);
      break;
  }
};

export const soundManager = {
  playMessageReceived: () => playSound("message-received"),
  playMessageSent: () => playSound("message-sent"),
  playNotification: () => playSound("notification"),
  getSoundSettings,
  saveSoundSettings,
  toggleSound: (enabled: boolean) => {
    const settings = getSoundSettings();
    settings.enabled = enabled;
    saveSoundSettings(settings);
  },
  setVolume: (volume: number) => {
    const settings = getSoundSettings();
    settings.volume = Math.min(Math.max(volume, 0), 1);
    saveSoundSettings(settings);
  },
};
