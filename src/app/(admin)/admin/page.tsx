import { PageHeader, Section, StatTile, Stats, Badge } from "@gg/ui";

export default function Dashboard() {
  return (
    <>
      <PageHeader icon="grid" title="Dashboard" subtitle="A quick look at how things are going." />
      <Stats>
        <StatTile label="Users" value="128" hint="+6 this week" icon="users" />
        <StatTile label="Active today" value="42" icon="heart" />
        <StatTile label="Open issues" value="3" icon="alert" tone="warn" />
      </Stats>
      <Section title="Recent activity" icon="clock">
        <p style={{ margin: 0 }}>
          <Badge tone="ok">ok</Badge> All systems running.
        </p>
      </Section>
    </>
  );
}
