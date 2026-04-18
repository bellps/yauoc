import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FamiliesPage() {
  const families = await prisma.family.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Famílias</h1>
          <p className="text-stone-500 mt-1">
            Cadastre as famílias convidadas e gere tokens de acesso.
          </p>
        </div>
        <Link
          href="/admin/families/new"
          className="rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-900"
        >
          Nova família
        </Link>
      </div>

      {families.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-10 text-center">
          <p className="text-stone-600">Nenhuma família cadastrada ainda.</p>
          <Link
            href="/admin/families/new"
            className="inline-block mt-4 text-sm text-stone-800 underline underline-offset-4"
          >
            Cadastrar a primeira família
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Família</th>
                <th className="text-left px-4 py-3 font-medium">Membros</th>
                <th className="text-left px-4 py-3 font-medium">Token</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 text-stone-800">{f.name}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {f._count.members}
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs bg-stone-100 text-stone-700 rounded px-2 py-1">
                      {f.accessToken}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/families/${f.id}`}
                      className="text-stone-700 hover:text-stone-900 underline underline-offset-4"
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
