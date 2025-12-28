"use client";

/**
 * Audio Provider Component
 *
 * React context provider for audio functionality.
 * Wraps the AudioManager for use in React components.
 */

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import {
  audioManager,
  type SoundEffect,
  type AmbientTrack,
} from "@/lib/audio/audio-manager";

interface AudioContextType {
  play: (sound: SoundEffect) => void;
  playAmbient: (track: AmbientTrack) => void;
  stopAmbient: () => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  volume: number;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(audioManager.isEnabled());
  const [volume, setVolumeState] = useState(audioManager.getVolume());

  const play = useCallback((sound: SoundEffect) => {
    audioManager.play(sound);
  }, []);

  const playAmbient = useCallback((track: AmbientTrack) => {
    audioManager.playAmbient(track);
  }, []);

  const stopAmbient = useCallback(() => {
    audioManager.stopAmbient();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    audioManager.setEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  const setVolume = useCallback((vol: number) => {
    audioManager.setVolume(vol);
    setVolumeState(vol);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        play,
        playAmbient,
        stopAmbient,
        setEnabled,
        setVolume,
        isEnabled,
        volume,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    // Return a no-op implementation if not within provider
    // This allows components to work without the provider during SSR
    return {
      play: () => {},
      playAmbient: () => {},
      stopAmbient: () => {},
      setEnabled: () => {},
      setVolume: () => {},
      isEnabled: false,
      volume: 0.5,
    };
  }
  return context;
}
