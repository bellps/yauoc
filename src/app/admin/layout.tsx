import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-stone-900 text-stone-100 flex flex-col">
        <div className="px-6 py-6 border-b border-stone-800">
          <p className="font-serif text-xl">Yauoc</p>
          <p className="text-xs text-stone-400 mt-1">Painel administrativo</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/admin" label="Visão geral" />
          <NavLink href="/admin/families" label="Famílias" />
        </nav>
        <div className="px-4 py-4 border-t border-stone-800 text-sm">
          <p className="text-stone-400 truncate">{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="mt-2 text-stone-300 hover:text-white underline underline-offset-4"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 bg-stone-50">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-stone-200 hover:bg-stone-800"
    >
      {label}
    </Link>
  );
}
