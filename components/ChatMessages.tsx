"use client";

import { Loader2 } from "lucide-react";

export default function ChatMessages({
  messages,
  thinking,
  speakingId,
}: any) {
  return (
    <div className="messages-list">
      {messages.map((m: any) => (
        <div
          key={m.id}
          className={`message-row ${
            m.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {m.role === "assistant" && <div className="avatar">P</div>}

          <div className={`bubble ${m.role}`}>
            {m.text}

            {m.role === "assistant" && speakingId === m.id && (
              <div className="waveform">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        </div>
      ))}

      {thinking && (
        <div className="message-row justify-start">
          <div className="avatar">P</div>
          <div className="bubble assistant">
            <Loader2 className="loader" size={16} />
          </div>
        </div>
      )}
    </div>
  );
}
