"use client";

import { useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { apiPost } from "@/lib/client/api";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function ChatPanel() {
  const { activeBranchId, activeBranchLabel, isNetworkScope } = useBranch();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: 'Pergunte sobre a equipe, ponto, férias, folha, desempenho ou compliance. Ex.: "quem está com banco de horas mais alto?"',
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    try {
      const res = await apiPost("/api/chat", { message: question, branchId: activeBranchId });
      setMessages((prev) => [...prev, { role: "assistant", text: res.answer as string }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Não consegui responder agora. Tente de novo." }]);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button className="assistant-toggle" onClick={() => setOpen(true)} aria-label="Abrir assistente">
        <ChatIcon />
      </button>
    );
  }

  return (
    <div className="assistant-panel" role="dialog" aria-label="Assistente de RH">
      <div className="assistant-header">
        <div>
          <strong>Assistente</strong>
          <p>Escopo: {isNetworkScope ? "Rede toda" : activeBranchLabel}</p>
        </div>
        <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Fechar assistente">
          <CloseIcon />
        </button>
      </div>

      <div className="assistant-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
            {m.text}
          </div>
        ))}
        {pending && <p className="assistant-pending">Consultando...</p>}
      </div>

      <form onSubmit={handleSubmit} className="assistant-input-row">
        <input
          aria-label="Pergunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo..."
        />
        <button className="assistant-send" type="submit" disabled={pending} aria-label="Enviar">
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 15.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 8h12M8 2.5 13.5 8 8 13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
