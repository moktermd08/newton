"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { deleteRecord, getCollection, importLab, saveRecord } from "@/lib/lab";
import { LabError } from "@/lib/lab-schema";

export type LabFormState = { error?: string; ok?: string } | undefined;

/** Everyone signed in can work the lab; changing the schema itself is for admins. */
async function authorise(collection: string) {
  const session = await requireSession();
  if (collection === "schema" && session.user.role !== "admin") throw new LabError("Only admins can change the schema.");
}

async function guarded(collection: string, run: () => Promise<string | void>): Promise<LabFormState> {
  try {
    await authorise(collection);
    const ok = await run();
    revalidatePath("/admin", "layout");
    return ok ? { ok } : undefined;
  } catch (e) {
    if (e instanceof LabError) return { error: e.message };
    throw e;
  }
}

/** Create or update from the generated form. Fields arrive as `f:<key>`. */
export async function saveFromForm(_prev: LabFormState, fd: FormData): Promise<LabFormState> {
  const collection = String(fd.get("collection") ?? "");
  const id = String(fd.get("id") ?? "") || undefined;
  let savedId = id;
  const res = await guarded(collection, async () => {
    const def = await getCollection(collection);
    if (!def) throw new LabError("Unknown collection.");
    const input: Record<string, unknown> = {};
    for (const f of def.fields) {
      const raw = f.type === "refs" ? fd.getAll(`f:${f.key}`).map(String) : fd.get(`f:${f.key}`) ?? undefined;
      if (f.type === "json" && typeof raw === "string" && raw.trim()) {
        try { input[f.key] = JSON.parse(raw); } catch { throw new LabError(`${f.label}: is not valid JSON.`); }
      } else input[f.key] = raw;
    }
    savedId = (await saveRecord(collection, input, id)).id;
    return "Saved.";
  });
  if (res?.ok && !id && savedId) redirect(`/admin/lab/${collection}/${savedId}`);
  return res;
}

/** Create or update from a raw JSON object. */
export async function saveFromJson(_prev: LabFormState, fd: FormData): Promise<LabFormState> {
  const collection = String(fd.get("collection") ?? "");
  const id = String(fd.get("id") ?? "") || undefined;
  let savedId = id;
  const res = await guarded(collection, async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(String(fd.get("json") ?? "")); } catch { throw new LabError("That is not valid JSON."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new LabError("The JSON must be an object.");
    const input = { ...(parsed as Record<string, unknown>) };
    if (id) input.id = id; // the URL decides which record this is
    savedId = (await saveRecord(collection, input, id)).id;
    return "Saved.";
  });
  if (res?.ok && !id && savedId) redirect(`/admin/lab/${collection}/${savedId}`);
  return res;
}

export async function removeRecord(_prev: LabFormState, fd: FormData): Promise<LabFormState> {
  const collection = String(fd.get("collection") ?? "");
  const res = await guarded(collection, async () => { await deleteRecord(collection, String(fd.get("id") ?? "")); return "Deleted."; });
  if (res?.ok) redirect(`/admin/lab/${collection}`);
  return res;
}

export type ImportState = { error?: string; summary?: Record<string, { created: number; updated: number }>; dryRun?: boolean } | undefined;

/** Merge an uploaded export into the lab. Admin only: an import can reshape the schema. */
export async function importFromFile(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const session = await requireSession();
  if (session.user.role !== "admin") return { error: "Only admins can import." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an exported JSON file." };
  if (file.size > 5_000_000) return { error: "That file is over 5 MB." };
  let doc: unknown;
  try { doc = JSON.parse(await file.text()); } catch { return { error: "That file is not valid JSON." }; }
  const dryRun = fd.get("dryRun") === "on";
  try {
    const summary = await importLab(doc, dryRun);
    if (!dryRun) revalidatePath("/admin", "layout");
    return { summary, dryRun };
  } catch (e) {
    if (e instanceof LabError) return { error: e.message };
    throw e;
  }
}
