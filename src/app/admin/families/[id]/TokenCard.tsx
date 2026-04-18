"use client";

import { useState, useTransition } from "react";

export function TokenCard({
  token,
  onRegenerate,
}: {
  token: string;
  onRegenerate: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function regenerate() {
    if (
      !confirm(
        "Gerar um novo token invalidará o atual. Deseja continuar?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      await onRegenerate();
    });
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6">
      <p className="text-sm text-stone-500">Token de acesso</p>
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <code className="font-mono text-lg bg-stone-100 text-stone-800 rounded-lg px-3 py-2">
          {token}
        </code>
        <button
          type="button"
          onClick={copyToken}
          className="text-sm text-stone-700 hover:text-stone-900 underline underline-offset-4"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="text-sm text-stone-700 hover:text-stone-900 underline underline-offset-4 disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar novo token"}
        </button>
      </div>
      <p className="text-xs text-stone-500 mt-3">
        Compartilhe este token com a família para que confirmem presença.
      </p>
    </div>
  );
}
