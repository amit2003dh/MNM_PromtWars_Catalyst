'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Mic } from 'lucide-react';

interface VoiceReaderProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  rate?: number; // 0.8 to 1.0 default for seniors
  className?: string;
}

export default function VoiceReader({
  text,
  label = 'Read aloud',
  size = 'md',
  rate = 0.88,
  className = '',
}: VoiceReaderProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setIsSupported(false);
    }
  }, []);

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel(); // Stop any pending speech

    const cleanText = text.replace(/<[^>]*>?/gm, ''); // strip HTML if any
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate; // slightly slower for elderly clarity
    utterance.pitch = 1.0;

    // Pick a natural english voice if available
    const voices = synth.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }, [text, rate, isSpeaking]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-5 py-3 text-lg font-bold gap-3 rounded-2xl min-h-[56px]',
  }[size];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak();
      }}
      className={`inline-flex items-center justify-center font-medium transition-all rounded-xl border focus:outline-none focus:ring-2 focus:ring-nest-500 ${
        isSpeaking
          ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm animate-pulse'
          : 'bg-white/80 hover:bg-nest-50 text-navy-800 border-slate-200 hover:border-nest-300 shadow-xs'
      } ${sizeClasses} ${className}`}
      title={isSpeaking ? 'Stop reading' : 'Read medicine instructions aloud'}
      aria-label={isSpeaking ? 'Stop reading' : `Listen to ${label}`}
    >
      {isSpeaking ? (
        <>
          <VolumeX className={size === 'lg' ? 'w-6 h-6 text-amber-700' : 'w-4 h-4 text-amber-700'} />
          <span>Stop Voice</span>
        </>
      ) : (
        <>
          <Volume2 className={size === 'lg' ? 'w-6 h-6 text-nest-600' : 'w-4 h-4 text-nest-600'} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
