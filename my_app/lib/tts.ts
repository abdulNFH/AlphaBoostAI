// lib/tts.ts
import * as Speech from 'expo-speech';

/** Check if letter is uppercase */
export function isUpper(ch: string) {
  return ch === ch.toUpperCase() && ch !== ch.toLowerCase();
}

/** Speak a letter as "Capital A" or "Small a" */
export function speakLetter(letter: string) {
  if (!letter) return;
  const phrase = isUpper(letter) ? `Capital ${letter}` : `Small ${letter}`;
  Speech.speak(phrase, { language: 'en-US', rate: 1.0, pitch: 1.0 });
}

/** Speak any custom text */
export function speak(text: string) {
  Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.0 });
}

/** Stop any ongoing speech */
export function stopSpeak() {
  Speech.stop();
}
