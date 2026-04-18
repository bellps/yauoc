import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="uppercase tracking-[0.4em] text-xs text-stone-500 mb-6">
          Save the date
        </p>
        <h1 className="font-serif text-5xl md:text-6xl text-stone-800 mb-6">
          Nosso Casamento
        </h1>
        <p className="text-stone-600 leading-relaxed mb-10">
          Estamos organizando cada detalhe para celebrarmos juntos este dia
          especial. Em breve, esta página trará todas as informações sobre o
          casamento, confirmação de presença e lista de presentes.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-stone-500 hover:text-stone-800 underline underline-offset-4"
          >
            Acesso administrativo
          </Link>
        </div>
      </div>
    </main>
  );
}
