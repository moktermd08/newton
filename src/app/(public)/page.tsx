import { Card, CardHeader, IconChip, LinkButton } from "@gg/ui";

const FEATURES = [
  { icon: "layers", title: "One design", body: "Public pages and the admin area share the same tokens, components and dark mode." },
  { icon: "shield", title: "Built for admins", body: "Dense tables, stat tiles and a side nav, with the same buttons you see here." },
  { icon: "bot", title: "Easy to extend", body: "Add a page with PageHeader and Card and it already matches." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>One look for every page.</h1>
        <p>The public site and the admin area are built from the same kit, so they never drift apart.</p>
        <div className="actions">
          <LinkButton href="/login" variant="primary">Sign in</LinkButton>
          <LinkButton href="/admin">Open admin</LinkButton>
        </div>
      </section>
      <div className="grid-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <IconChip icon={f.icon} />
            <CardHeader title={f.title} subtitle={f.body} />
          </Card>
        ))}
      </div>
    </>
  );
}
