import { useState, useRef, useCallback, useEffect } from 'react';

interface DemoMessage {
  role: 'ai' | 'elder';
  text: string;
}

interface UseDemoAudioOptions {
  language: 'hindi' | 'english';
  messages: DemoMessage[];
  demoType: 'voice';
  onMessageComplete: (index: number) => void;
  onComplete: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Global audio cache - persists across component remounts
const audioCache = new Map<string, string>();

export function useDemoAudio({ language, messages, demoType, onMessageComplete, onComplete }: UseDemoAudioOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = useCallback((index: number, role: string) => {
    return `${demoType}-${language}-${role}-${index}`;
  }, [language, demoType]);

  const getPublicUrl = useCallback((index: number, role: string) => {
    return `/demo-audio/${demoType}-${language}-${role}-${index + 1}.mp3`;
  }, [language, demoType]);

  const getStorageUrl = useCallback((index: number, role: string) => {
    return `${SUPABASE_URL}/storage/v1/object/public/demo-audio/${demoType}-${language}-${role}-${index + 1}.mp3`;
  }, [language, demoType]);

  const generateTTSAudio = useCallback(async (text: string, role: string): Promise<string | null> => {
    try {
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
        console.warn('TTS unavailable, falling back to text-only mode');
        return null;
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.warn('TTS generation failed, using text-only fallback');
      return null;
    }
  }, [language]);

  const checkAudioExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const getOrCreateAudio = useCallback(async (index: number, message: DemoMessage): Promise<string> => {
    const cacheKey = getCacheKey(index, message.role);
    
    // Return cached audio if available
    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
    }

    // Try public folder first (local assets)
    const publicUrl = getPublicUrl(index, message.role);
    const publicExists = await checkAudioExists(publicUrl);
    
    if (publicExists) {
      audioCache.set(cacheKey, publicUrl);
      return publicUrl;
    }

    // Try Supabase storage next
    const storageUrl = getStorageUrl(index, message.role);
    const storageExists = await checkAudioExists(storageUrl);
    
    if (storageExists) {
      audioCache.set(cacheKey, storageUrl);
      return storageUrl;
    }

    // Generate with ElevenLabs TTS as final fallback and cache
    const ttsUrl = await generateTTSAudio(message.text, message.role);
    audioCache.set(cacheKey, ttsUrl);
    return ttsUrl;
  }, [getCacheKey, getPublicUrl, getStorageUrl, checkAudioExists, generateTTSAudio]);

  // Preload all audio on mount
  const preloadAudio = useCallback(async () => {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Preload all audio files in parallel
      await Promise.all(
        messages.map((message, index) => getOrCreateAudio(index, message))
      );
    } catch (error) {
      console.warn('Preload failed, will load on demand:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, getOrCreateAudio]);

  const playAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Audio playback failed'));
      audio.play().catch(reject);
    });
  }, []);

  const playSequence = useCallback(async () => {
    setIsPlaying(true);
    abortControllerRef.current = new AbortController();

    try {
      for (let i = 0; i < messages.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break;

        const message = messages[i];
        setCurrentIndex(i);

        // Get cached audio (or generate if not cached)
        const audioUrl = await getOrCreateAudio(i, message);

        if (abortControllerRef.current?.signal.aborted) break;

        try {
          await playAudio(audioUrl);
          onMessageComplete(i + 1);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Audio playback error:', error);
          onMessageComplete(i + 1);
        }
      }

      onComplete();
    } catch (error) {
      console.error('Sequence playback error:', error);
    } finally {
      setIsPlaying(false);
      setCurrentIndex(-1);
    }
  }, [messages, getOrCreateAudio, playAudio, onMessageComplete, onComplete]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, []);

  return {
    isPlaying,
    isLoading,
    currentIndex,
    play: playSequence,
    stop,
    preload: preloadAudio,
  };
}
