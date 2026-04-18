"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FamilyFormState } from "./actions";

type MemberInitial = {
  id?: string;
  name: string;
  age: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
};

type DraftMember = MemberInitial & { key: string };

type FormAction = (
  state: FamilyFormState,
  formData: FormData
) => Promise<FamilyFormState>;

function toDraft(members: MemberInitial[]): DraftMember[] {
  return members.map((m, idx) => ({
    ...m,
    key: m.id ?? `draft-${idx}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

export function FamilyForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: FormAction;
  initial?: {
    name: string;
    notes: string | null;
    members: MemberInitial[];
  };
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useFormState<FamilyFormState, FormData>(
    action,
    {}
  );

  const [members, setMembers] = useState<DraftMember[]>(() =>
    toDraft(
      initial?.members && initial.members.length > 0
        ? initial.members
        : [{ name: "", age: null, gender: null }]
    )
  );

  function addMember() {
    setMembers((prev) => [
      ...prev,
      {
        key: `draft-${prev.length}-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        age: null,
        gender: null,
      },
    ]);
  }

  function removeMember(key: string) {
    setMembers((prev) =>
      prev.length > 1 ? prev.filter((m) => m.key !== key) : prev
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-stone-700 mb-1">
            Nome da família
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            defaultValue={initial?.name ?? ""}
            placeholder="Família Silva"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm text-stone-700 mb-1">
            Observações (opcional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={initial?.notes ?? ""}
            placeholder="Restrições alimentares, preferências de mesa, etc."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </section>

      <section className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-stone-800">Membros da família</h2>
          <button
            type="button"
            onClick={addMember}
            className="text-sm text-stone-700 hover:text-stone-900 underline underline-offset-4"
          >
            + Adicionar membro
          </button>
        </div>
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.key}
              className="grid grid-cols-12 gap-2 items-start"
            >
              <input
                type="hidden"
                name="memberId"
                defaultValue={m.id ?? ""}
              />
              <input
                name="memberName"
                type="text"
                required
                defaultValue={m.name}
                placeholder="Nome"
                className="col-span-6 rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <input
                name="memberAge"
                type="number"
                min={0}
                max={130}
                defaultValue={m.age ?? ""}
                placeholder="Idade"
                className="col-span-2 rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <select
                name="memberGender"
                defaultValue={m.gender ?? ""}
                className="col-span-3 rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">Gênero</option>
                <option value="FEMALE">Feminino</option>
                <option value="MALE">Masculino</option>
                <option value="OTHER">Outro</option>
              </select>
              <button
                type="button"
                onClick={() => removeMember(m.key)}
                disabled={members.length <= 1}
                className="col-span-1 text-stone-500 hover:text-red-600 disabled:opacity-30 text-sm"
                aria-label="Remover membro"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="text-sm text-stone-600 hover:text-stone-900 underline underline-offset-4"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-800 text-white px-5 py-2.5 text-sm font-medium hover:bg-stone-900 disabled:opacity-60"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}
