"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/messages";
import type { Message } from "@/lib/types";

export function ChatPanel({
  bookingId,
  currentUserId,
  initialMessages,
  participantNames,
}: {
  bookingId: string;
  currentUserId: string;
  initialMessages: Message[];
  participantNames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`booking-${bookingId}-messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    setSending(true);
    await sendMessage({ bookingId, body: text });
    setSending(false);
  }

  return (
    <div className="mt-6 rounded-lg border border-stone-200">
      <h2 className="border-b border-stone-200 p-3 text-sm font-medium text-stone-900">
        Messages
      </h2>
      <div className="max-h-80 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-stone-400">
            No messages yet — say hi to coordinate handover.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.sender_id === currentUserId
                ? "ml-auto bg-stone-900 text-white"
                : "bg-stone-100 text-stone-900"
            }`}
          >
            <p className="text-[10px] opacity-70">
              {participantNames[m.sender_id] ?? "ClosetSwap user"}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-stone-200 p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message..."
          maxLength={2000}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
