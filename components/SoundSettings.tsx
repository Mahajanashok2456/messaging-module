"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundManager } from "@/lib/utils/soundManager";

interface SoundSettingsProps {
  onClose?: () => void;
}

export default function SoundSettings({ onClose }: SoundSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    const settings = soundManager.getSoundSettings();
    setEnabled(settings.enabled);
    setVolume(settings.volume);
  }, []);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    soundManager.toggleSound(newState);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const testSound = () => {
    soundManager.playMessageReceived();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Volume2 size={18} />
        Sound Settings
      </h3>

      <div className="space-y-3">
        {/* Toggle Sound */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Enable Notifications</label>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-[#25D366]" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Volume Control */}
        {enabled && (
          <div className="space-y-2">
            <label className="text-sm text-gray-700">Volume</label>
            <div className="flex items-center gap-2">
              <VolumeX size={16} className="text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#25D366]"
              />
              <Volume2 size={16} className="text-gray-500" />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {Math.round(volume * 100)}%
            </div>
          </div>
        )}

        {/* Test Button */}
        {enabled && (
          <button
            onClick={testSound}
            className="w-full mt-3 bg-[#25D366] text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition-colors"
          >
            Test Sound
          </button>
        )}
      </div>
    </div>
  );
}
