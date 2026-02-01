"use client";

import { useEffect, useRef, useState } from "react";

export function useSpeechRecognition(setInput: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const win = window as any;
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setMicError("SpeechRecognition not supported");
      return;
    }

    const r = new SpeechRecognition();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;

    r.onstart = () => {
      setListening(true);
      setMicError(null);
    };

    r.onresult = (e: any) => {
      let interim = "";
      let final = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript || "";
        if (res.isFinal) final += t;
        else interim += t;
      }

      if (interim) setInput(interim);
      if (final) setInput(final);
    };

    r.onend = () => setListening(false);

    r.onerror = (ev: any) => {
      setMicError(ev?.error || "Mic error");
      setListening(false);
    };

    recognitionRef.current = r;
  }, [setInput]);

  async function toggleMic() {
    const r = recognitionRef.current;
    if (!r) return;

    if (listening) {
      r.stop();
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      r.start();
    } catch {
      setMicError("Microphone permission denied");
    }
  }

  return { listening, supported, micError, toggleMic };
}
