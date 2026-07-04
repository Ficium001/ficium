/**
 * @page Advisor
 * @description
 *   FICO — the AI relationship manager. Thin orchestrator: wires the chat
 *   hook to the hero, the ask-rail, the briefing/chat stream and the
 *   composer. All content lives in ../config; all logic in ../hooks.
 * @owner Ficium Engineering
 */

import { useEffect, useRef, useState } from "react";
import { FiciumLogo, PageShell } from "@/shared/ui";
import { RefreshCw } from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { useAdvisorChat } from "../hooks/useAdvisorChat";
import { AdvisorHero, AskRail, ChatBubble, ThinkingBubble, Composer } from "../components";

export default function Advisor() {
  const { data: profile } = useProfile();
  const firstName = profile?.firstName ?? profile?.fullName?.split(" ")[0] ?? "there";

  const { messages, thinking, remaining, exhausted, send, reset } = useAdvisorChat(
    firstName,
    profile?.userId,
  );

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the stream as it grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const ask = (q: string) => send(q);
  const submit = () => { send(input); setInput(""); };

  return (
    <PageShell>

      {/* Chrome row — real brand lock-up + updated pill */}
      <div className="flex items-center justify-between mb-[18px]">
        <FiciumLogo heightPx={24} withWordmark />
        <button className="inline-flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-2
                           text-[12px] font-semibold text-ink/60 hover:bg-ink/3 transition-colors"
                onClick={reset} title="Refresh briefing">
          <RefreshCw size={13} /> Updated just now
        </button>
      </div>

      {/* Hero */}
      <AdvisorHero firstName={firstName} onReset={reset} />

      {/* Body grid: ask rail + briefing/chat stream */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 mt-5 items-start">
        <div className="order-2 lg:order-1">
          <AskRail onAsk={ask} />
        </div>

        <main className="order-1 lg:order-2 flex flex-col gap-[18px]">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} onChip={ask} />
          ))}
          {thinking && <ThinkingBubble />}
          <div ref={bottomRef} />

          <div className="sticky bottom-[88px] lg:bottom-4 pt-1">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={submit}
              onChip={ask}
              thinking={thinking}
              exhausted={exhausted}
              remaining={remaining}
            />
          </div>
        </main>
      </div>
    </PageShell>
  );
}
