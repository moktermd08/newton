"use client";
import { useActionState } from "react";
import { Banner, Button, Field } from "@gg/ui";
import { removeRecord, saveFromForm, saveFromJson } from "@/app/actions/lab";
import type { CollectionDef, FieldDef } from "@/lib/lab-schema";

export type Choices = Record<string, { id: string; title: string }[]>;
type Rec = Record<string, unknown> | null;

const asText = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v, null, 2));

function Control({ f, value, choices }: { f: FieldDef; value: unknown; choices: Choices }) {
  const name = `f:${f.key}`;
  switch (f.type) {
    case "longtext": return <textarea name={name} rows={5} defaultValue={asText(value)} required={f.required} />;
    case "json": return <textarea name={name} rows={8} spellCheck={false} defaultValue={asText(value)} required={f.required} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} />;
    case "number": return <input type="number" name={name} step="any" defaultValue={typeof value === "number" ? value : ""} required={f.required} />;
    case "boolean": return <input type="checkbox" name={name} defaultChecked={value === true} />;
    case "select":
      return (
        <select name={name} defaultValue={asText(value)} required={f.required}>
          {!f.required && <option value="">None</option>}
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "tags": return <input type="text" name={name} defaultValue={Array.isArray(value) ? value.join(", ") : ""} placeholder="comma, separated" />;
    case "ref":
      return (
        <select name={name} defaultValue={asText(value)} required={f.required}>
          <option value="">None</option>
          {(choices[f.ref!] ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      );
    case "refs": {
      const picked = Array.isArray(value) ? (value as string[]) : [];
      const options = choices[f.ref!] ?? [];
      return (
        <select name={name} multiple size={Math.min(Math.max(options.length, 3), 8)} defaultValue={picked}>
          {options.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      );
    }
    default: return <input type="text" name={name} defaultValue={asText(value)} required={f.required} maxLength={500} />;
  }
}

function Status({ state }: { state: { error?: string; ok?: string } | undefined }) {
  return (
    <>
      {state?.error && <Banner tone="danger" icon="alert">{state.error}</Banner>}
      {state?.ok && <Banner tone="ok" icon="check">{state.ok}</Banner>}
    </>
  );
}

export function RecordForm({ def, record, choices }: { def: CollectionDef; record: Rec; choices: Choices }) {
  const [state, action, pending] = useActionState(saveFromForm, undefined);
  const id = record ? String(record.id) : "";
  return (
    // Keyed by revision so the fields reload after a save instead of showing stale input.
    <form action={action} key={String(record?.rev ?? "new")} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="collection" value={def.id} />
      <input type="hidden" name="id" value={id} />
      <Status state={state} />
      {def.fields.map((f) => (
        <Field key={f.key} label={f.label + (f.required ? " *" : "")} hint={f.hint ?? (f.type === "refs" ? "Hold Cmd/Ctrl to pick several." : undefined)}>
          <Control f={f} value={record?.[f.key]} choices={choices} />
        </Field>
      ))}
      <div><Button variant="primary" type="submit" disabled={pending}>{pending ? "Saving…" : record ? "Save changes" : `Create`}</Button></div>
    </form>
  );
}

export function JsonForm({ def, record }: { def: CollectionDef; record: Rec }) {
  const [state, action, pending] = useActionState(saveFromJson, undefined);
  const id = record ? String(record.id) : "";
  const shown = record
    ? Object.fromEntries(Object.entries(record).filter(([k]) => !["id", "createdAt", "updatedAt", "rev"].includes(k)))
    : Object.fromEntries(def.fields.map((f) => [f.key, f.type === "refs" || f.type === "tags" ? [] : f.type === "boolean" ? false : f.type === "number" ? 0 : ""]));
  return (
    <form action={action} key={String(record?.rev ?? "new")} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="collection" value={def.id} />
      <input type="hidden" name="id" value={id} />
      <Status state={state} />
      <textarea name="json" rows={14} spellCheck={false} defaultValue={JSON.stringify(shown, null, 2)}
        style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} />
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save JSON"}</Button></div>
    </form>
  );
}

export function DeleteButton({ collection, id, title }: { collection: string; id: string; title: string }) {
  const [state, action, pending] = useActionState(removeRecord, undefined);
  return (
    <form action={action} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="collection" value={collection} />
      <input type="hidden" name="id" value={id} />
      <Status state={state} />
      <div>
        <Button variant="danger" type="submit" disabled={pending}
          onClick={(e) => { if (!confirm(`Delete "${title}"? This cannot be undone.`)) e.preventDefault(); }}>Delete</Button>
      </div>
    </form>
  );
}
