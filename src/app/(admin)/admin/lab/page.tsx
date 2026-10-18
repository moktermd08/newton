import { LinkButton, PageHeader, Section, StatTile, Stats } from "@gg/ui";
import { ImportForm } from "@/components/lab-forms";
import { requireSession } from "@/lib/auth";
import { listCollections, listRecords } from "@/lib/lab";

export default async function LabHome() {
  const { user } = await requireSession();
  const defs = await listCollections();
  const counts = await Promise.all(defs.map(async (d) => (await listRecords(d.id)).length));
  return (
    <>
      <PageHeader icon="flask" title="Lab"
        subtitle="A small, all-JSON workspace for the software lifecycle. Try a pattern, record what happened, improve it, then export what works."
        action={<a className="btn subtle md" href="/api/lab/export" download>Export all as JSON</a>} />
      <Stats>
        {defs.map((d, i) => <StatTile key={d.id} label={d.label} value={String(counts[i])} icon={d.icon} href={`/admin/lab/${d.id}`} />)}
      </Stats>
      <Section title="How the lab works" icon="layers">
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Each area is a JSON file in <code>lab/</code>. Commit them: git is the history of how a pattern improved.</li>
          <li>The <b>Schema</b> says what fields each area has. Change it, and the forms change with it.</li>
          <li>Record <b>Feedback</b> against a pattern or journey, then edit the pattern and raise its confidence.</li>
          <li>When a pattern is proven, <b>Export</b> the lab and load the parts you need into the live platform.</li>
        </ol>
        <p style={{ margin: "12px 0 0" }}><LinkButton href="/admin/lab/patterns/new" variant="primary">New pattern</LinkButton></p>
      </Section>
      {user.role === "admin" && <Section title="Import" icon="download" subtitle="Bring in a file from Export, for example from another lab."><ImportForm /></Section>}
    </>
  );
}
