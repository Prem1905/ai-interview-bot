'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Loader2, Volume2, Play } from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const PRESETS = [
  'Tell me about yourself',
  'Superpower',
  'Why 100x?',
  'Growth areas',
  'Philosophy on AI'
];

export default function VoiceInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll on new messages
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  useEffect(() => {
    // Setup speech recognition with better handlers and interim results
    const win = typeof window !== 'undefined' ? (window as any) : null;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      setMicError('SpeechRecognition API not supported in this browser');
      return;
    }

    setSupported(true);
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.interimResults = true; // show interim transcript in input
    r.maxAlternatives = 1;
    r.continuous = false;

    r.onstart = () => {
      console.info('SpeechRecognition started');
      setListening(true);
      setMicError(null);
    };

    r.onresult = (e: any) => {
      // Build interim and final transcripts
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript || '';
        if (res.isFinal) final += t;
        else interim += t;
      }
      if (interim) setInput(interim);
      if (final) setInput(final);
    };

    r.onend = () => {
      console.info('SpeechRecognition ended');
      setListening(false);
    };

    r.onerror = (ev: any) => {
      console.error('SpeechRecognition error', ev);
      const err = ev?.error || 'Speech recognition error';
      // map common errors to user-friendly messages
      if (err === 'not-allowed' || err === 'permission-denied') setMicError('Microphone permission denied');
      else if (err === 'no-speech') setMicError('No speech detected');
      else setMicError(err);
      setListening(false);
    };

    recognitionRef.current = r;
  }, []);

  async function handleMic() {
    const r = recognitionRef.current;
    if (!r) {
      setMicError('SpeechRecognition not supported in this browser');
      return;
    }

    if (listening) {
      r.stop();
      return;
    }

    // Request microphone permission proactively to get clearer errors
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // immediately stop tracks to avoid keeping mic open
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      console.error('getUserMedia error', err);
      setMicError('Microphone access denied or unavailable');
      return;
    }

    setMicError(null);

    try {
      r.start();
    } catch (err: any) {
      console.error('Failed to start recognition', err);
      setMicError('Failed to start speech recognition');
    }
  }

  async function handleSend(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text) return;
    setInput('');

    const userMsg: Message = { id: String(Date.now()) + '-u', role: 'user', text };
    setMessages((m) => [...m, userMsg]);

    setThinking(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const replyText = data?.reply || data?.error || 'Something went wrong';
      const agentMsg: Message = { id: String(Date.now()) + '-a', role: 'assistant', text: replyText };
      setMessages((m) => [...m, agentMsg]);
      setThinking(false);
      speak(replyText, agentMsg.id);
    } catch (err) {
      setThinking(false);
      const agentMsg: Message = { id: String(Date.now()) + '-a', role: 'assistant', text: 'Failed to get response' };
      setMessages((m) => [...m, agentMsg]);
    }
  }

  function speak(text: string, id: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.onstart = () => setSpeakingId(id);
    utter.onend = () => setSpeakingId(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <div className="container app-root">
      <header className="header">
        <h1 className="title">Prem | 100x AI Candidate</h1>
        <div className="subtitle">Voice interview demo</div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="chat-panel" ref={chatRef}>
          <div className="preset-chips">
            {PRESETS.map((p) => (
              <button
                key={p}
                className="preset-chip"
                onClick={() => {
                  setInput(p);
                  // instant test = send
                  setTimeout(() => handleSend(p), 50);
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="messages-list">
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'text-right message-row' : 'text-left message-row'}>
                <div className={m.role === 'user' ? 'user-bubble' : 'agent-bubble'}>
                  {m.text}
                </div>
                {m.role === 'assistant' && speakingId === m.id && (
                  <div className="speaking-indicator"><Play size={12} /> <span>Speaking...</span></div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="thinking">Prem is thinking <Loader2 className="loader" size={14} /></div>
            )}
          </div>
        </div>
      </main>

      <div className="input-bar">
        <div className="input-row">
          <button
            title="Record (fills input with transcript)"
            onClick={handleMic}
            disabled={!supported}
            aria-pressed={listening}
            className={`icon-button ${listening ? 'recording' : ''} ${!supported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Mic />
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            className="input-text"
            placeholder="Ask Prem anything..."
          />

          <div className="text-xs text-neutral-400 ml-2">
            {listening ? 'Listening...' : micError ? micError : ''}
          </div>

          <button
            title="Send"
            onClick={() => handleSend()}
            className="send-button"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}
