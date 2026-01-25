import { useState, useRef, useCallback } from 'react';

interface DemoMessage {
  role: 'ai' | 'elder';
  text: string;
  delay: number;
}

interface UseDemoAudioOptions {
  language: 'hindi' | 'english';
  messages: DemoMessage[];
  demoType: 'whatsapp' | 'voice';
  onMessageComplete: (index: number) => void;
  onComplete: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useDemoAudio({ language, messages, demoType, onMessageComplete, onComplete }: UseDemoAudioOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getStorageUrl = useCallback((index: number, role: string) => {
    // Pre-recorded audio file naming convention
    return `${SUPABASE_URL}/storage/v1/object/public/demo-audio/${demoType}-${language}-${role}-${index + 1}.mp3`;
  }, [language, demoType]);

  const generateTTSAudio = useCallback(async (text: string, role: string): Promise<string> => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/elevenlabs-demo-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language, role }),
        signal: abortControllerRef.current?.signal,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate TTS audio');
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }, [language]);

  const checkAudioExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        resolve();
      };

      audio.onerror = () => {
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }, []);

  const playSequence = useCallback(async () => {
    setIsPlaying(true);
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      for (let i = 0; i < messages.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break;

        const message = messages[i];
        setCurrentIndex(i);

        // Try pre-recorded audio first, fall back to TTS
        const storageUrl = getStorageUrl(i, message.role);
        let audioUrl: string;

        try {
          const exists = await checkAudioExists(storageUrl);
          if (exists) {
            audioUrl = storageUrl;
          } else {
            // Generate with ElevenLabs TTS
            setIsLoading(true);
            audioUrl = await generateTTSAudio(message.text, message.role);
          }
        } catch (error) {
          console.warn('Audio generation failed, using TTS fallback:', error);
          audioUrl = await generateTTSAudio(message.text, message.role);
        }

        setIsLoading(false);

        if (abortControllerRef.current?.signal.aborted) break;

        try {
          await playAudio(audioUrl);
          onMessageComplete(i + 1);
          
          // Small pause between messages for natural flow
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (error) {
          console.error('Audio playback error:', error);
          // Continue to next message even if playback fails
          onMessageComplete(i + 1);
        }

        // Clean up blob URLs
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
      }

      onComplete();
    } catch (error) {
      console.error('Sequence playback error:', error);
    } finally {
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentIndex(-1);
    }
  }, [messages, getStorageUrl, checkAudioExists, generateTTSAudio, playAudio, onMessageComplete, onComplete]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentIndex(-1);
  }, []);

  const reset = useCallback(() => {
    stop();
  }, [stop]);

  return {
    isPlaying,
    isLoading,
    currentIndex,
    play: playSequence,
    stop,
    reset,
  };
}
