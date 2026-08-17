export function speakEnglishText(text: string, slow: boolean = false): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Web Speech API is not supported in this browser environment.');
      resolve();
      return;
    }

    // Cancel any active speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = slow ? 0.70 : 0.90; // Slower rate for educational pronunciation
    utterance.pitch = 1.0;

    // Try selecting a high quality English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Karen') ||
            v.name.includes('US'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function playAudioItem(text: string, audioUrl?: string, slow: boolean = false): Promise<void> {
  if (audioUrl && audioUrl.startsWith('http')) {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      if (slow) {
        audio.playbackRate = 0.75;
      }
      audio.onended = () => resolve();
      audio.onerror = () => {
        // Fallback to text-to-speech if audio file fails to load
        speakEnglishText(text, slow).then(resolve);
      };
      audio.play().catch(() => {
        speakEnglishText(text, slow).then(resolve);
      });
    });
  }
  return speakEnglishText(text, slow);
}

