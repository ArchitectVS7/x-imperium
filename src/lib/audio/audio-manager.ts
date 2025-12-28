/**
 * Audio Manager
 *
 * Centralized audio management using Howler.js.
 * Handles sound effects and ambient audio with graceful degradation
 * when audio files are unavailable.
 */

import { Howl, Howler } from "howler";

export type SoundEffect =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "alert"
  | "turnEnd"
  | "combat"
  | "build";

export type AmbientTrack = "starmap" | "combat";

// Lazy-load sounds to avoid issues with missing files
const soundCache = new Map<SoundEffect, Howl | null>();
const ambientCache = new Map<AmbientTrack, Howl | null>();

const SOUND_PATHS: Record<SoundEffect, string> = {
  click: "/audio/sfx/click.mp3",
  hover: "/audio/sfx/hover.mp3",
  success: "/audio/sfx/success.mp3",
  error: "/audio/sfx/error.mp3",
  alert: "/audio/sfx/alert.mp3",
  turnEnd: "/audio/sfx/turn-end.mp3",
  combat: "/audio/sfx/combat.mp3",
  build: "/audio/sfx/build.mp3",
};

const SOUND_VOLUMES: Record<SoundEffect, number> = {
  click: 0.3,
  hover: 0.15,
  success: 0.4,
  error: 0.4,
  alert: 0.5,
  turnEnd: 0.4,
  combat: 0.5,
  build: 0.3,
};

const AMBIENT_PATHS: Record<AmbientTrack, string> = {
  starmap: "/audio/ambient/space-ambient.mp3",
  combat: "/audio/ambient/tension.mp3",
};

const AMBIENT_VOLUMES: Record<AmbientTrack, number> = {
  starmap: 0.15,
  combat: 0.2,
};

function getSound(effect: SoundEffect): Howl | null {
  if (!soundCache.has(effect)) {
    try {
      const sound = new Howl({
        src: [SOUND_PATHS[effect]],
        volume: SOUND_VOLUMES[effect],
        onloaderror: () => {
          // Silently fail - audio files may not exist yet
          soundCache.set(effect, null);
        },
      });
      soundCache.set(effect, sound);
    } catch {
      soundCache.set(effect, null);
    }
  }
  return soundCache.get(effect) ?? null;
}

function getAmbient(track: AmbientTrack): Howl | null {
  if (!ambientCache.has(track)) {
    try {
      const ambient = new Howl({
        src: [AMBIENT_PATHS[track]],
        volume: AMBIENT_VOLUMES[track],
        loop: true,
        onloaderror: () => {
          ambientCache.set(track, null);
        },
      });
      ambientCache.set(track, ambient);
    } catch {
      ambientCache.set(track, null);
    }
  }
  return ambientCache.get(track) ?? null;
}

class AudioManager {
  private enabled = true;
  private volume = 0.5;
  private currentAmbient: AmbientTrack | null = null;

  play(sound: SoundEffect): void {
    if (!this.enabled) return;

    const howl = getSound(sound);
    if (howl) {
      howl.play();
    }
  }

  playAmbient(track: AmbientTrack): void {
    if (!this.enabled) return;

    // Fade out current if different
    if (this.currentAmbient && this.currentAmbient !== track) {
      const currentHowl = getAmbient(this.currentAmbient);
      if (currentHowl) {
        currentHowl.fade(currentHowl.volume(), 0, 1000);
        setTimeout(() => currentHowl.stop(), 1000);
      }
    }

    // Fade in new track
    const newHowl = getAmbient(track);
    if (newHowl) {
      this.currentAmbient = track;
      newHowl.volume(0);
      newHowl.play();
      newHowl.fade(0, AMBIENT_VOLUMES[track], 2000);
    }
  }

  stopAmbient(): void {
    if (this.currentAmbient) {
      const howl = getAmbient(this.currentAmbient);
      if (howl) {
        howl.fade(howl.volume(), 0, 1000);
        setTimeout(() => {
          howl.stop();
        }, 1000);
      }
      this.currentAmbient = null;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

export const audioManager = new AudioManager();
