import Link from "next/link";
import { FamilyForm } from "../FamilyForm";
import { createFamilyAction } from "../actions";

export const metadata = { title: "Nova família — Admin" };

export default function NewFamilyPage() {
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
      <h1 className="font-serif text-3xl text-stone-800 mb-2">Nova família</h1>
      <p className="text-stone-500 mb-8">
        Um token de acesso único será gerado automaticamente para esta família.
      </p>
      <FamilyForm
        action={createFamilyAction}
        submitLabel="Criar família"
        cancelHref="/admin/families"
      />
    </div>
  );
}
