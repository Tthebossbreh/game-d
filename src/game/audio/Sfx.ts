import type { Sound } from 'excalibur';
import { sfx } from '../assets';
import { AUDIO } from '../config';

type LoopName = 'loop' | 'bubbleLoop1' | 'bubbleLoop2';

/**
 * Thin wrapper over the loaded Excalibur sounds. Every audio asset in the pack
 * gets a home: two music tracks, three ambient loops and one-shot effects.
 */
export class SfxManager {
  private music: Sound | null = null;
  private readonly activeLoops = new Set<LoopName>();

  startMusic(track: 'theme' | 'watery'): void {
    this.stopMusic();
    const sound = track === 'theme' ? sfx.theme : sfx.watery;
    sound.loop = true;
    sound.volume = AUDIO.musicVolume;
    void sound.play(AUDIO.musicVolume);
    this.music = sound;
  }

  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  startAmbience(): void {
    this.playLoop('loop');
    this.playLoop('bubbleLoop1');
    this.playLoop('bubbleLoop2');
  }

  stopAmbience(): void {
    for (const name of [...this.activeLoops]) {
      sfx[name].stop();
      this.activeLoops.delete(name);
    }
  }

  private playLoop(name: LoopName): void {
    if (this.activeLoops.has(name)) {
      return;
    }
    const sound = sfx[name];
    sound.loop = true;
    sound.volume = AUDIO.ambientVolume;
    void sound.play(AUDIO.ambientVolume);
    this.activeLoops.add(name);
  }

  private blip(sound: Sound, volume: number = AUDIO.sfxVolume, rate = 1): void {
    sound.playbackRate = rate;
    sound.volume = volume;
    void sound.play(volume);
  }

  jump(): void {
    this.blip(sfx.bubble1, AUDIO.sfxVolume * 0.7, 1.2);
  }

  boost(): void {
    this.blip(sfx.bubble2, AUDIO.sfxVolume * 0.8, 1.1);
  }

  land(): void {
    this.blip(sfx.bubble1, AUDIO.sfxVolume * 0.4, 0.8);
  }

  hurt(): void {
    this.blip(sfx.bubble3, AUDIO.sfxVolume, 0.7);
  }

  explosion(): void {
    this.blip(sfx.bubble3, AUDIO.sfxVolume, 0.5);
    this.blip(sfx.bubble2, AUDIO.sfxVolume * 0.6, 0.6);
  }

  enemyDeath(): void {
    this.blip(sfx.bubble2, AUDIO.sfxVolume * 0.7, 1.4);
  }

  pickup(): void {
    this.blip(sfx.pickup, AUDIO.sfxVolume);
  }
}

export const Sfx = new SfxManager();
