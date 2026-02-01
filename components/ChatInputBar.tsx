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
        
        {/* ✅ MIC BUTTON */}
        <button
          type="button"
          onClick={() => onMic()}   
          className={`icon-button ${listening ? "recording" : ""}`}
        >
          <Mic size={18} />
        </button>

        {/* ✅ TEXT INPUT */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
          placeholder="Ask Prem anything..."
          className="input-text"
        />

        {/* ✅ SEND BUTTON */}
        <button
          type="button"
          onClick={() => onSend()}   
          className="send-button"
        >
          <Send size={18} />
        </button>
      </div>

      {/* ✅ MIC ERROR MESSAGE */}
      {micError && <p className="mic-error">{micError}</p>}
    </div>
  );
}
