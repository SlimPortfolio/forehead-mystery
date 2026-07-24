"use client";

import { useState } from "react";
import { PostGameChatMessage } from "./types";

const REFRACTORY_MS = 2000;

type PostGameChatProps = {
  messages: PostGameChatMessage[];
  playerId: string | null;
  onSend: (text: string) => boolean;
};

/** Free-text chat for the results screen. `onSend` returns false when the
 * caller's own 2s refractory window is still active (see handleSendPostGameChat
 * in page.tsx) — in that case the draft is left in place instead of clearing,
 * and the button/input stay disabled locally so a player can't queue up a
 * burst of requests by mashing send. */
export default function PostGameChat({
  messages,
  playerId,
  onSend,
}: PostGameChatProps) {
  const [draft, setDraft] = useState("");
  const [onCooldown, setOnCooldown] = useState(false);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || onCooldown) return;

    const sent = onSend(text);
    if (!sent) return;

    setDraft("");
    setOnCooldown(true);
    setTimeout(() => setOnCooldown(false), REFRACTORY_MS);
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="font-semibold text-ink">Postgame Chat</h4>
      <div className="mt-2 h-56 space-y-1.5 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <p key={message.id} className="text-sm">
              <span
                className={`font-semibold ${
                  message.playerId === playerId ? "text-ink" : "text-pink-600"
                }`}
              >
                {message.playerId === playerId ? "You" : message.playerName}:
              </span>{" "}
              <span className="text-slate-700">{message.text}</span>
            </p>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          maxLength={200}
          placeholder="Say something..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || onCooldown}
          className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
