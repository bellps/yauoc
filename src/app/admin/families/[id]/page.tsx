import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FamilyForm } from "../FamilyForm";
import {
  deleteFamilyAction,
  regenerateTokenAction,
  updateFamilyAction,
} from "../actions";
import { TokenCard } from "./TokenCard";

export const dynamic = "force-dynamic";

export default async function FamilyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    include: { members: { orderBy: { name: "asc" } } },
  });

  if (!family) notFound();

  const updateAction = updateFamilyAction.bind(null, family.id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 text-sm">
        <Link
          href="/admin/families"
          className="text-stone-600 hover:text-stone-900 underline underline-offset-4"
        >
          ← Voltar para famílias
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">{family.name}</h1>
          <p className="text-stone-500 mt-1">
            Atualize as informações da família ou gerencie o token de acesso.
          </p>
        </div>
      </div>

      <TokenCard
        token={family.accessToken}
        onRegenerate={async () => {
          "use server";
          await regenerateTokenAction(family.id);
        }}
      />

      <div className="mt-8">
        <FamilyForm
          action={updateAction}
          submitLabel="Salvar alterações"
          cancelHref="/admin/families"
          initial={{
            name: family.name,
            notes: family.notes,
            members: family.members.map((m) => ({
              id: m.id,
              name: m.name,
              age: m.age,
              gender: m.gender,
            })),
          }}
        />
      </div>

      <section className="mt-12 bg-white border border-red-200 rounded-2xl p-6">
        <h2 className="font-medium text-red-700">Zona de perigo</h2>
        <p className="text-sm text-stone-600 mt-1 mb-4">
          Remover uma família apaga também todos os seus membros. Esta ação não
          pode ser desfeita.
        </p>
        <form
          action={async () => {
            "use server";
            await deleteFamilyAction(family.id);
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 text-sm"
          >
            Remover família
          </button>
        </form>
      </section>
    </div>
  );
}
