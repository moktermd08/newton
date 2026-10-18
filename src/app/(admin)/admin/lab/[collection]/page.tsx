import { notFound } from "next/navigation";
import { Badge, EmptyState, LinkButton, PageHeader, Section, When } from "@gg/ui";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getCollection, listRecords } from "@/lib/lab";
import { titleOf, type FieldDef } from "@/lib/lab-schema";

const SHOWN: FieldDef["type"][] = ["select", "number", "boolean", "text", "ref", "refs", "tags"];

function Cell({ f, v }: { f: FieldDef; v: unknown }) {
  if (v === undefined || v === null || v === "") return <span style={{ opacity: 0.4 }}>-</span>;
  if (f.type === "boolean") return <Badge tone={v ? "ok" : "muted"}>{v ? "yes" : "no"}</Badge>;
  if (f.type === "select") return <Badge tone="muted">{String(v)}</Badge>;
  if (Array.isArray(v)) return <>{v.length} {f.type === "tags" ? v.slice(0, 3).join(", ") : "linked"}</>;
  const s = String(v);
  return <>{s.length > 60 ? `${s.slice(0, 60)}…` : s}</>;
}

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  await requireSession();
  const { collection } = await params;
  const def = await getCollection(collection);
  if (!def) notFound();
  const rows = await listRecords(collection);
  const cols = def.fields.filter((f) => f.key !== def.titleKey && SHOWN.includes(f.type)).slice(0, 4);
  return (
    <>
      <PageHeader icon={def.icon} title={def.label} subtitle={def.description}
        action={<LinkButton href={`/admin/lab/${collection}/new`} variant="primary">New</LinkButton>} />
      <Section title={`${rows.length} record${rows.length === 1 ? "" : "s"}`} flush>
        {rows.length === 0 ? <EmptyState bare title="Nothing here yet" body="Create the first record to get started." /> : (
          <table>
            <thead><tr><th>Name</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th>Rev</th><th>Updated</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/lab/${collection}/${r.id}`}>{titleOf(def, r)}</Link></td>
                  {cols.map((c) => <td key={c.key}><Cell f={c} v={r[c.key]} /></td>)}
                  <td>{r.rev}</td>
                  <td><When at={r.updatedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
