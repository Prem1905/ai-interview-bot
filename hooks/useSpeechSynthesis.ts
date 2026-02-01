"use client";

import { useState } from "react";

export function useSpeechSynthesis() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  function speak(text: string, id: string) {
    if (!("speechSynthesis" in window)) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";

    utter.onstart = () => setSpeakingId(id);
    utter.onend = () => setSpeakingId(null);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return { speak, speakingId };
}
