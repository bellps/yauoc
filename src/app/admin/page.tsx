import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [familyCount, memberCount] = await Promise.all([
    prisma.family.count(),
    prisma.familyMember.count(),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-3xl text-stone-800 mb-2">Visão geral</h1>
      <p className="text-stone-500 mb-8">
        Gerencie as famílias convidadas e seus integrantes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Stat label="Famílias cadastradas" value={familyCount} />
        <Stat label="Convidados cadastrados" value={memberCount} />
      </div>

      <Link
        href="/admin/families"
        className="inline-flex items-center rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-900"
      >
        Gerenciar famílias
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-800">{value}</p>
    </div>
  );
}
