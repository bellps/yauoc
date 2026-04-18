"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(formData: FormData, callbackUrl: string) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: callbackUrl || "/admin",
      redirect: false,
    });
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Email ou senha inválidos." };
      }
      return { error: "Não foi possível entrar. Tente novamente." };
    }
    throw err;
  }
}
