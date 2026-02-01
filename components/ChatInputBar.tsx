"use client";

import { Mic, Send } from "lucide-react";

export default function ChatInputBar({
  input,
  setInput,
  onSend,
  onMic,
  listening,
  micError,
}: any) {
  return (
    <div className="input-wrapper">
      <div className="input-row">
        <button
          onClick={onMic}
          className={`icon-button ${listening ? "recording" : ""}`}
        >
          <Mic size={18} />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Ask Prem anything..."
          className="input-text"
        />

        <button onClick={onSend} className="send-button">
          <Send size={18} />
        </button>
      </div>

      {micError && <p className="mic-error">{micError}</p>}
    </div>
  );
}
