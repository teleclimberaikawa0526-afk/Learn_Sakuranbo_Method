import { VOICE_MANIFEST } from '../data/voiceManifest';
import { withBase } from './assetUrl';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public unlock() {
    this.init();
    if (
      this.audioContext &&
      (this.audioContext.state === 'suspended' ||
        (this.audioContext.state as string) === 'interrupted')
    ) {
      this.audioContext.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime + delay;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  public playClick() {
    this.unlock();
    this.playTone(620, 'sine', 0.08, 0.1);
  }

  public playStepCorrect() {
    this.unlock();
    // Bright two-tone chime (E5 -> A5) + coin sparkle
    this.playTone(659.25, 'sine', 0.14, 0.12, 0);
    this.playTone(880.0, 'sine', 0.24, 0.14, 0.09);
  }

  public playQuestionComplete() {
    this.unlock();
    // C E G C fanfare arpeggio
    this.playTone(523.25, 'sine', 0.15, 0.12, 0);
    this.playTone(659.25, 'sine', 0.15, 0.12, 0.09);
    this.playTone(783.99, 'sine', 0.15, 0.12, 0.18);
    this.playTone(1046.5, 'sine', 0.35, 0.15, 0.27);
  }

  public playWrong() {
    this.unlock();
    // Gentle soft low boop (not harsh for 1st graders)
    this.playTone(220, 'triangle', 0.18, 0.12, 0);
    this.playTone(185, 'triangle', 0.25, 0.12, 0.16);
  }

  public playGacha() {
    this.unlock();
    for (let i = 0; i < 10; i++) {
      this.playTone(300 + i * 50, 'square', 0.05, 0.05, i * 0.05);
    }
    this.playTone(880, 'sine', 1.0, 0.15, 0.5);
    this.playTone(1108.73, 'sine', 1.0, 0.15, 0.5);
    this.playTone(1318.51, 'sine', 1.0, 0.15, 0.5);
  }
}

class VoiceGuideManager {
  private enabled = true;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const jaVoices = voices.filter((v) => v.lang.startsWith('ja'));
    if (jaVoices.length > 0) {
      // Prioritize bright/cute female Japanese voices (avoid male voices like Ichiro/Keita)
      const priorityPatterns = [
        /Nanami.*Natural/i,
        /Nanami/i,
        /Ayumi/i,
        /Kyoko/i,
        /Google\s*日本語/i,
        /Haruka/i,
        /O-Ren/i,
      ];
      for (const pattern of priorityPatterns) {
        const match = jaVoices.find((v) => pattern.test(v.name));
        if (match) {
          this.preferredVoice = match;
          return;
        }
      }
      this.preferredVoice =
        jaVoices.find((v) => !/Ichiro|Keita|Otoya|Hattori/i.test(v.name)) || jaVoices[0];
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stop();
    }
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private currentAudio: HTMLAudioElement | null = null;

  public speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      interrupt?: boolean;
      onEnd?: () => void;
    }
  ) {
    const finish = () => {
      options?.onEnd?.();
    };

    if (!this.enabled) {
      finish();
      return;
    }

    if (options?.interrupt !== false) {
      this.stop();
    }

    // 1. Prefer pre-generated kid character voice MP3
    const audioUrl = VOICE_MANIFEST[text];
    if (audioUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(withBase(audioUrl));
        this.currentAudio = audio;

        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          finish();
        };

        audio.onended = settle;
        audio.onerror = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          if (!settled) {
            settled = true;
            this.speakFallbackTTS(text, options);
          }
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            if (!settled) {
              settled = true;
              finish();
            }
          });
        }
        return;
      } catch (e) {
        console.warn('Audio playback error, falling back to SpeechSynthesis:', e);
      }
    }

    // 2. Fallback to browser Web Speech API
    this.speakFallbackTTS(text, options);
  }

  private speakFallbackTTS(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
    }
  ) {
    const finish = () => {
      options?.onEnd?.();
    };

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      finish();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = options?.rate ?? 1.05;
      utterance.pitch = options?.pitch ?? 1.5;
      utterance.volume = 1.0;

      if (!this.preferredVoice) {
        this.loadVoices();
      }
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        finish();
      };

      const estimatedMs = Math.max(2500, text.length * 180 + 1800);
      const fallbackTimer = window.setTimeout(settle, estimatedMs);

      utterance.onend = settle;
      utterance.onerror = settle;

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      finish();
    }
  }
}

export const sound = new SoundManager();
export const voiceGuide = new VoiceGuideManager();
