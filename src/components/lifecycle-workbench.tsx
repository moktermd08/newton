"use client";
import { useState } from "react";
import { Badge, BarList, Banner, Button, Field, Section, StatTile, Stats, num } from "@gg/ui";

type Candidate = { name: string; score: number; notes: string[] };
type Pick = { pillarName: string; focusArea: string; candidates: Candidate[] };
type Result = {
  status: "OK" | "ERROR";
  errors?: string[];
  pillars: { pillar: number; name: string; weight: number; drivers: string[] }[];
  focus: number[];
  buildVsBuy: { pillar: number; name: string; verdict: string; buyScore: number; reasons: string[] }[];
  technology: Pick[];
  tools: Pick[];
  resources: { role: string; fte: number; sourcing: string; topStations: string[] }[];
  cost: { durationMonths: number; monthlyLabourGBP: number; totalGBP: { low: number; expected: number; high: number }; caveat: string; budget: { utilisation: number; withinBudget: boolean } | null };
  reports: { id: string; name: string; family: string }[];
  horizontals: Record<string, { vector: string; weight: number }[]>;
};

const gbp = (n: number) => `£${num(n)}`;
const ZONES = ["Discover", "Define", "Design", "Build", "Release", "Operate", "Retire"];
const LINES: [string, string][] = [
  ["str", "Strategy & Product"], ["ux", "Experience & Design"], ["arc", "Architecture & Integration"], ["dat", "Data & AI"],
  ["eng", "Engineering"], ["qa", "Quality"], ["sec", "Security & Compliance"], ["ops", "Delivery & Operations"],
  ["gov", "Governance & Finance"], ["doc", "Documentation"],
];
const SCALES: [string, string][] = [
  ["under-100", "Under 100 users"], ["100-1k", "100 to 1,000"], ["1k-10k", "1,000 to 10,000"],
  ["10k-100k", "10,000 to 100,000"], ["100k-plus", "Over 100,000"],
];
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const PRIORITIES = ["speed", "cost", "quality", "risk"] as const;
const COMPLIANCE = ["gdpr", "hipaa", "pci", "iso27001", "soc2", "wcag"];
const VERDICT_TONE: Record<string, "ok" | "warn" | "muted"> = { buy: "ok", configure: "warn", build: "muted" };

export function LifecycleWorkbench() {
  const [orgType, setOrgType] = useState("medium");
  const [teamSize, setTeamSize] = useState(20);
  const [months, setMonths] = useState(9);
  const [growth, setGrowth] = useState("medium");
  const [ai, setAi] = useState(true);
  const [legacy, setLegacy] = useState(false);
  const [compliance, setCompliance] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [scale, setScale] = useState("");
  const [zones, setZones] = useState<number[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [differentiator, setDifferentiator] = useState(0.5);
  const [budget, setBudget] = useState("");
  const [skills, setSkills] = useState("");
  const [prio, setPrio] = useState<Record<string, number>>({ speed: 0.5, cost: 0.5, quality: 0.5, risk: 0.5 });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lifecycle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgType, teamSize, durationMonths: months, growth, ai, legacy, compliance, priorities: prio, differentiator,
          ...(sector.trim() && { sector: sector.trim() }),
          ...(scale && { scale }),
          ...(zones.length && { zones }),
          ...(lines.length && { lines }),
          ...(+budget > 0 && { monthlyBudgetGBP: +budget }),
          existingSkills: skills.split(",").map((x) => x.trim()).filter(Boolean),
        }),
      });
      const data: Result = await res.json();
      if (data.status !== "OK") throw new Error((data.errors ?? ["Request failed"]).join("; "));
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const focus = result ? result.pillars.filter((p) => result.focus.includes(p.pillar)) : [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="Organisation profile">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Field label="Organisation type">
            <select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
              <option value="small">Small</option><option value="medium">Medium</option>
              <option value="large">Large</option><option value="public">Public sector</option>
            </select>
          </Field>
          <Field label="Team size">
            <input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(Math.max(1, +e.target.value || 1))} />
          </Field>
          <Field label="Duration (months)">
            <input type="number" min={1} value={months} onChange={(e) => setMonths(Math.max(1, +e.target.value || 1))} />
          </Field>
          <Field label="Sector" hint="Free text, e.g. fintech, nhs">
            <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Any" />
          </Field>
          <Field label="User scale">
            <select value={scale} onChange={(e) => setScale(e.target.value)}>
              <option value="">Default for org type</option>
              {SCALES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Monthly budget (£)" hint="Optional. Shows a budget check.">
            <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Not set" />
          </Field>
          <Field label="Growth">
            <select value={growth} onChange={(e) => setGrowth(e.target.value)}>
              <option value="stable">Stable</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="hypergrowth">Hypergrowth</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "14px 0" }}>
          <label><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} /> AI / ML in scope</label>
          <label><input type="checkbox" checked={legacy} onChange={(e) => setLegacy(e.target.checked)} /> Modernising an existing system</label>
        </div>
        <Field label="Lifecycle phases" hint="None selected = the whole lifecycle">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ZONES.map((z, i) => (
              <Button key={z} size="sm" variant={zones.includes(i + 1) ? "primary" : "subtle"} aria-pressed={zones.includes(i + 1)}
                onClick={() => setZones((cur) => toggle(cur, i + 1))}>{i + 1} {z}</Button>
            ))}
          </div>
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Discipline focus" hint="Weights the chosen disciplines up. None = no focus.">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LINES.map(([id, name]) => (
              <Button key={id} size="sm" variant={lines.includes(id) ? "primary" : "subtle"} aria-pressed={lines.includes(id)}
                onClick={() => setLines((cur) => toggle(cur, id))}>{name}</Button>
            ))}
          </div>
        </Field>
        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <Field label={`Differentiator: ${differentiator.toFixed(2)}`} hint="How much this capability sets you apart. High favours build.">
            <input type="range" min={0} max={1} step={0.05} value={differentiator} onChange={(e) => setDifferentiator(+e.target.value)} />
          </Field>
          <Field label="In-house skills" hint="Comma separated. Empty means none declared, which favours buying.">
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="react, postgres, security" />
          </Field>
        </div>
        <div style={{ height: 12 }} />
        <Field label="Compliance regimes">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COMPLIANCE.map((c) => (
              <Button key={c} size="sm" variant={compliance.includes(c) ? "primary" : "subtle"} aria-pressed={compliance.includes(c)}
                onClick={() => setCompliance((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}>
                {c.toUpperCase()}
              </Button>
            ))}
          </div>
        </Field>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", margin: "14px 0" }}>
          {PRIORITIES.map((k) => (
            <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} priority: ${prio[k].toFixed(2)}`}>
              <input type="range" min={0} max={1} step={0.05} value={prio[k]} onChange={(e) => setPrio({ ...prio, [k]: +e.target.value })} />
            </Field>
          ))}
        </div>
        <Button variant="primary" onClick={run} disabled={busy}>{busy ? "Running…" : "Run Newton"}</Button>
      </Section>

      {error && <Banner tone="danger" icon="alert">{error}</Banner>}

      {result && (
        <>
          <Stats>
            <StatTile label="Expected cost" value={gbp(result.cost.totalGBP.expected)} hint={`${gbp(result.cost.totalGBP.low)} to ${gbp(result.cost.totalGBP.high)}`} icon="layers" />
            <StatTile label="Monthly labour" value={gbp(result.cost.monthlyLabourGBP)} hint={`${result.cost.durationMonths} months`} icon="clock" />
            <StatTile label="Focus pillars" value={String(focus.length)} hint="cover 80% of the weight" icon="grid" />
          </Stats>
          {result.cost.budget && (
            <Banner tone={result.cost.budget.withinBudget ? "ok" : "warn"} icon={result.cost.budget.withinBudget ? "check" : "alert"}>
              Monthly labour is {Math.round(result.cost.budget.utilisation * 100)}% of the monthly budget{result.cost.budget.withinBudget ? "." : ", so the team is larger than the budget supports."}
            </Banner>
          )}
          <Banner tone="muted" icon="alert">{result.cost.caveat}</Banner>

          <Section title="Pillar weights" subtitle="Where the lifecycle effort should go.">
            <BarList items={focus.map((p) => ({ label: p.name, value: p.weight, display: `${(p.weight * 100).toFixed(1)}%`, hint: p.drivers.join("; ") }))} />
          </Section>

          <Section title="Build, buy or configure" flush>
            <table>
              <thead><tr><th>Pillar</th><th>Verdict</th><th>Buy score</th><th>Why</th></tr></thead>
              <tbody>
                {result.buildVsBuy.slice(0, 12).map((b) => (
                  <tr key={b.pillar}>
                    <td>{b.name}</td>
                    <td><Badge tone={VERDICT_TONE[b.verdict]}>{b.verdict}</Badge></td>
                    <td>{b.buyScore.toFixed(2)}</td>
                    <td>{b.reasons.slice(0, 3).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {([["Technology", result.technology], ["Tools", result.tools]] as const).map(([title, rows]) => (
            <Section key={title} title={title} flush>
              <table>
                <thead><tr><th>Pillar / focus area</th><th>Ranked candidates</th></tr></thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={`${r.pillarName}-${r.focusArea}-${i}`}>
                      <td>{r.pillarName} / {r.focusArea}</td>
                      <td>{r.candidates.map((c) => `${c.name} (${c.score})`).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          ))}

          <Section title="Resources" flush>
            <table>
              <thead><tr><th>Role</th><th>FTE</th><th>Sourcing</th><th>Mainly owns</th></tr></thead>
              <tbody>
                {result.resources.slice(0, 15).map((r) => (
                  <tr key={r.role}><td>{r.role}</td><td>{r.fte}</td><td>{r.sourcing}</td><td>{r.topStations.join(", ")}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Reports worth generating">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.reports.map((r) => <Badge key={r.id} title={r.family}>{r.name}</Badge>)}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
