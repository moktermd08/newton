import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, PageHeader, Section, When } from "@gg/ui";
import { DeleteButton, JsonForm, RecordForm, type Choices } from "@/components/lab-forms";
import { requireSession } from "@/lib/auth";
import { getCollection, getRecord, listCollections, listRecords, referencedBy } from "@/lib/lab";
import { titleOf } from "@/lib/lab-schema";

export default async function RecordPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { user } = await requireSession();
  const { collection, id } = await params;
  const def = await getCollection(collection);
  if (!def) notFound();
  const isNew = id === "new";
  const record = isNew ? null : await getRecord(collection, id);
  if (!isNew && !record) notFound();

  // Options for every ref/refs field, so the generated form can offer real records.
  const choices: Choices = {};
  for (const target of new Set(def.fields.flatMap((f) => (f.ref ? [f.ref] : [])))) {
    const targetDef = await getCollection(target);
    if (targetDef) choices[target] = (await listRecords(target)).map((r) => ({ id: r.id, title: titleOf(targetDef, r) }));
  }
  const used = record ? await referencedBy(collection, record.id) : [];
  const all = await listCollections();
  const label = (c: string) => all.find((d) => d.id === c)?.label ?? c;
  const locked = collection === "schema" && user.role !== "admin";

  return (
    <>
      <PageHeader icon={def.icon} title={record ? titleOf(def, record) : `New ${def.label.toLowerCase()} record`}
        subtitle={record ? <>{label(collection)} · id <code>{record.id}</code> · revision {record.rev} · updated <When at={record.updatedAt} /></> : def.description} />
      {locked ? <Section title="Read only"><p style={{ margin: 0 }}>Only admins can change the schema.</p></Section> : (
        <Section title="Details"><RecordForm def={def} record={record} choices={choices} /></Section>
      )}
      {record && used.length > 0 && (
        <Section title={`Used by (${used.length})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {used.map((u) => (
              <Link key={`${u.collection}/${u.id}/${u.field}`} href={`/admin/lab/${u.collection}/${u.id}`}>
                <Badge tone="muted">{label(u.collection)}: {u.id} ({u.field})</Badge>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {!locked && (
        <Section title="Raw JSON" subtitle="The same record as JSON. Unknown fields are refused: add them to the schema first.">
          <details>
            <summary style={{ cursor: "pointer", marginBottom: 10 }}>Edit as JSON</summary>
            <JsonForm def={def} record={record} />
          </details>
        </Section>
      )}
      {record && !locked && <Section title="Delete"><DeleteButton collection={collection} id={record.id} title={titleOf(def, record)} /></Section>}
    </>
  );
}
