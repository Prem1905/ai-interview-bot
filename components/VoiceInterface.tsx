"use client";

import { useState } from "react";
import PresetChips from "./PresetChips";
import ChatMessages from "./ChatMessages";
import ChatInputBar from "./ChatInputBar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

type Message = { id: string; role: "user" | "assistant"; text: string };

export default function VoiceInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const { speak, speakingId } = useSpeechSynthesis();
  const { listening, micError, toggleMic } =
    useSpeechRecognition(setInput);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    setInput("");

    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: "user",
      text,
    };

    const updated = [...messages, userMsg];
    setMessages(updated);

    setThinking(true);

    try {
      const history = updated.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();
      const reply = data.reply;

      const agentMsg: Message = {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: reply,
      };

      setMessages((prev) => [...prev, agentMsg]);
      setThinking(false);

      speak(reply, agentMsg.id);
    } catch {
      setThinking(false);
    }
  }

  return (
    <div className="app-root">
      <header className="header">
        <h1>Prem | 100x AI Candidate</h1>
      </header>

      <PresetChips onSelect={(q) => handleSend(q)} />

      <ChatMessages
        messages={messages}
        thinking={thinking}
        speakingId={speakingId}
      />

      <ChatInputBar
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onMic={toggleMic}
        listening={listening}
        micError={micError}
      />
    </div>
  );
}
