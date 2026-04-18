"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/token";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const memberInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  age: z
    .union([z.string(), z.number(), z.undefined(), z.null()])
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine((v) => v === null || (v >= 0 && v <= 130), {
      message: "Idade inválida",
    }),
  gender: z
    .union([genderEnum, z.literal(""), z.undefined(), z.null()])
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

const familySchema = z.object({
  name: z.string().trim().min(1, "Nome da família é obrigatório").max(120),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  members: z.array(memberInputSchema).min(1, "Adicione ao menos um membro"),
});

export type FamilyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

function parseMembersFromForm(formData: FormData) {
  const ids = formData.getAll("memberId").map(String);
  const names = formData.getAll("memberName").map(String);
  const ages = formData.getAll("memberAge").map(String);
  const genders = formData.getAll("memberGender").map(String);

  const rows: Array<{
    id?: string;
    name: string;
    age: string;
    gender: string;
  }> = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i]?.trim()) continue;
    rows.push({
      id: ids[i] || undefined,
      name: names[i],
      age: ages[i] ?? "",
      gender: genders[i] ?? "",
    });
  }
  return rows;
}

export async function createFamilyAction(
  _prev: FamilyFormState,
  formData: FormData
): Promise<FamilyFormState> {
  await ensureAdmin();

  const parsed = familySchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") ?? "",
    members: parseMembersFromForm(formData),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos" };
  }

  let accessToken = generateAccessToken();
  // Extremely unlikely collision, but guard anyway.
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.family.findUnique({ where: { accessToken } });
    if (!exists) break;
    accessToken = generateAccessToken();
  }

  const family = await prisma.family.create({
    data: {
      name: parsed.data.name,
      notes: parsed.data.notes,
      accessToken,
      members: {
        create: parsed.data.members.map((m) => ({
          name: m.name.trim(),
          age: m.age,
          gender: m.gender ?? null,
        })),
      },
    },
  });

  revalidatePath("/admin/families");
  redirect(`/admin/families/${family.id}`);
}

export async function updateFamilyAction(
  familyId: string,
  _prev: FamilyFormState,
  formData: FormData
): Promise<FamilyFormState> {
  await ensureAdmin();

  const parsed = familySchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") ?? "",
    members: parseMembersFromForm(formData),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos" };
  }

  const existing = await prisma.family.findUnique({
    where: { id: familyId },
    include: { members: { select: { id: true } } },
  });
  if (!existing) return { error: "Família não encontrada" };

  const submittedIds = new Set(
    parsed.data.members.map((m) => m.id).filter((x): x is string => !!x)
  );
  const toDelete = existing.members
    .map((m) => m.id)
    .filter((id) => !submittedIds.has(id));

  await prisma.$transaction([
    prisma.family.update({
      where: { id: familyId },
      data: { name: parsed.data.name, notes: parsed.data.notes },
    }),
    ...(toDelete.length
      ? [
          prisma.familyMember.deleteMany({
            where: { id: { in: toDelete }, familyId },
          }),
        ]
      : []),
    ...parsed.data.members.map((m) =>
      m.id
        ? prisma.familyMember.update({
            where: { id: m.id },
            data: {
              name: m.name.trim(),
              age: m.age,
              gender: m.gender ?? null,
            },
          })
        : prisma.familyMember.create({
            data: {
              familyId,
              name: m.name.trim(),
              age: m.age,
              gender: m.gender ?? null,
            },
          })
    ),
  ]);

  revalidatePath("/admin/families");
  revalidatePath(`/admin/families/${familyId}`);
  return { error: undefined };
}

export async function regenerateTokenAction(familyId: string) {
  await ensureAdmin();

  let token = generateAccessToken();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.family.findUnique({
      where: { accessToken: token },
    });
    if (!exists) break;
    token = generateAccessToken();
  }

  await prisma.family.update({
    where: { id: familyId },
    data: { accessToken: token },
  });

  revalidatePath("/admin/families");
  revalidatePath(`/admin/families/${familyId}`);
}

export async function deleteFamilyAction(familyId: string) {
  await ensureAdmin();
  await prisma.family.delete({ where: { id: familyId } });
  revalidatePath("/admin/families");
  redirect("/admin/families");
}
