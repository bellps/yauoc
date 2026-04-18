import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Entrar — Admin",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <h1 className="font-serif text-2xl text-stone-800 mb-1">Admin</h1>
        <p className="text-sm text-stone-500 mb-6">
          Entre com suas credenciais para gerenciar o casamento.
        </p>
        <LoginForm
          callbackUrl={searchParams.callbackUrl ?? "/admin"}
          initialError={searchParams.error}
        />
      </div>
    </main>
  );
}
