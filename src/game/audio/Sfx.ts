import type { Sound } from 'excalibur';
import { sfx } from '../assets';
import { AUDIO } from '../config';
import { clampVolume, loadVolume, saveVolume, stepVolume, volumeLabel } from './volume';

type LoopName = 'loop' | 'bubbleLoop1' | 'bubbleLoop2';

/**
 * Thin wrapper over the loaded Excalibur sounds. Every audio asset in the pack
 * gets a home: two music tracks, three ambient loops and one-shot effects.
 *
 * A master volume scales the mix, is persisted across reloads and can be
 * changed while loops are already playing.
 */
export class SfxManager {
  private music: Sound | null = null;
  private readonly activeLoops = new Set<LoopName>();
  private master = loadVolume();
  private lastAudible = this.master > 0 ? this.master : 1;

  get volume(): number {
    return this.master;
  }

  get muted(): boolean {
    return this.master <= 0;
  }

  get label(): string {
    return volumeLabel(this.master);
  }

  /** Set the master volume (0..1); applies to music, ambience and effects. */
  setVolume(value: number): void {
    this.master = clampVolume(value);
    if (this.master > 0) {
      this.lastAudible = this.master;
    }
    saveVolume(this.master);
    if (this.music) {
      this.music.volume = this.musicGain;
    }
    for (const name of this.activeLoops) {
      sfx[name].volume = this.ambientGain;
    }
  }

  /** One 10% step up or down. */
  nudgeVolume(direction: number): void {
    this.setVolume(stepVolume(this.master, direction));
  }

  /** Mute to 0, or restore the last audible level. */
  toggleMute(): void {
    this.setVolume(this.master > 0 ? 0 : this.lastAudible);
  }

  private get musicGain(): number {
    return AUDIO.musicVolume * this.master;
  }

  private get ambientGain(): number {
    return AUDIO.ambientVolume * this.master;
  }

  startMusic(track: 'theme' | 'watery'): void {
    this.stopMusic();
    const sound = track === 'theme' ? sfx.theme : sfx.watery;
    sound.loop = true;
    sound.volume = this.musicGain;
    void sound.play(this.musicGain);
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
    sound.volume = this.ambientGain;
    void sound.play(this.ambientGain);
    this.activeLoops.add(name);
  }

  private blip(sound: Sound, volume: number = AUDIO.sfxVolume, rate = 1): void {
    const gain = volume * this.master;
    sound.playbackRate = rate;
    sound.volume = gain;
    void sound.play(gain);
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
