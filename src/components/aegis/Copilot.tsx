import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = [
  "Show strongest suspect",
  "Why is CCTV-0418 suspicious?",
  "Replay victim movements",
  "Find contradictions",
];

export type CopilotHandle = {
  send: (text: string) => void;
};

export type CopilotProps = {
  variant?: "floating" | "embedded";
};

export const Copilot = forwardRef<CopilotHandle, CopilotProps>(function Copilot(
  { variant = "floating" },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ who: "user" | "ai"; text: string }[]>([
    {
      who: "ai",
      text: "AEGIS Copilot online — case C-2041. Ask about suspects, CCTV, contradictions, autopsy, or evidence.",
    },
  ]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;

    setLog((l) => [...l, { who: "user", text: t }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: t, case_id: "C-2041" }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || res.statusText);
      }

      const data = await res.json();
      let reply = data.answer ?? "No answer returned.";

      if (data.sources?.length) {
        reply += "\n\n— Sources —";
        data.sources.forEach((s: { type: string; confidence?: number; snippet: string }) => {
          reply += `\n• [${(s.type || "evidence").toUpperCase()}${s.confidence != null ? ` · ${s.confidence}%` : ""}] ${s.snippet}`;
        });
      }

      setLog((l) => [...l, { who: "ai", text: reply.trim() }]);
    } catch {
      setLog((l) => [
        ...l,
        {
          who: "ai",
          text:
            "Could not reach the Copilot API. Start the backend:\n\n" +
            "cd backend && source .venv/bin/activate && uvicorn main:app --port 8000",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useImperativeHandle(ref, () => ({ send }), [send]);

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/35 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium tracking-tight">AEGIS Copilot</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {variant === "embedded" ? "briefing session · C-2041" : "holographic assistant · online"}
          </div>
        </div>
        <Badge variant="secondary" className="hidden border border-primary/35 bg-secondary/40 sm:inline-flex">
          RAG
        </Badge>
      </div>
      {variant === "floating" ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
          <X />
        </Button>
      ) : null}
    </div>
  );

  const transcript = (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {log.map((m, i) => (
        <div key={i} className={m.who === "user" ? "ml-auto max-w-[90%]" : "mr-auto max-w-[92%]"}>
          <div
            className={[
              "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
              m.who === "user"
                ? "bg-primary/18 text-foreground ring-1 ring-primary/20"
                : "border border-primary/30 bg-secondary/35 text-[12px] text-foreground/95",
            ].join(" ")}
          >
            {m.who === "ai" && (
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] text-primary">
                <span className="opacity-70">AEGIS</span>
                <span className="text-muted-foreground">▸</span>
              </div>
            )}
            {m.text}
          </div>
        </div>
      ))}
      {loading && (
        <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Searching evidence index…
        </div>
      )}
    </div>
  );

  const composer = (
    <div className="shrink-0 border-t border-border/40 bg-secondary/20 px-3 pb-3 pt-2">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => send(s)}
            className="rounded-full border border-primary/35 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/55 hover:text-primary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about suspects, CCTV, evidence…"
          className="h-10 flex-1 border-primary/35 bg-input/50 font-mono text-xs focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
        />
        <Button
          variant="secondary"
          size="icon"
          disabled={loading}
          onClick={() => send(input)}
          className="h-10 w-10 shrink-0 border border-primary/25 bg-primary/15 text-primary hover:bg-primary/25"
          aria-label="Send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  const shellClass =
    variant === "embedded"
      ? "flex h-full min-h-[min(560px,calc(100vh-10rem))] flex-col overflow-hidden rounded-2xl border-2 border-primary/45 bg-card scanline"
      : "glass-strong flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl";

  const inner = (
    <div className={shellClass}>
      {header}
      {transcript}
      {composer}
    </div>
  );

  if (variant === "embedded") {
    return inner;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-neon-2/55 bg-primary text-primary-foreground animate-float"
        aria-label={open ? "Close AEGIS Copilot" : "Open AEGIS Copilot"}
      >
        <Bot className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-20 right-5 z-40"
          >
            {inner}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
