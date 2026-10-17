# Newton

Weighted selections over the Software Lifecycle Map (31 pillars, 10 lines, 165 stations, 9 gates, 33 report journeys).

```js
import { runLifecycle } from 'newton';
runLifecycle({ orgType: 'public', teamSize: 40, ai: true, compliance: ['gdpr'], priorities: { cost: 0.9 } });
```

```bash
node bin/newton-lifecycle.js --org public --ai --compliance gdpr,wcag --team 40 --cost 0.9
npm test      # unit tests + 1,000 use-case benchmark
npm run bench     # prints hit rates
```

| Decision | Where | Basis |
|---|---|---|
| Pillar weights (31) | `src/weights.js` `pillarWeights` | stations that apply × nearby gates × reports, then context multipliers |
| Sub-pillar weights | `subPillarWeights` | stations within a pillar |
| Horizontal weights (v1-v18) | `horizontalWeights` | `weight.json` rows (analogs for pillars 24-32) shifted by profile |
| Tool / technology | `src/selectors.js` `selectTools` | `data/pillar_atlas.json` scores weighted by profile priorities |
| Build / buy / configure | `selectBuildVsBuy` | per-pillar commodity score plus context adjustments |
| Resources + cost | `src/resources.js` | station owners → FTE split of `teamSize`; placeholder day rates |

Every number that shapes a weight is in `data/tuning.json`. They are heuristic priors, not calibrated against outcomes.
Rebuild the data with `scripts/extract.mjs <map.html> <use-cases.xlsx>`.

Input: `orgType` (small|medium|large|public), `sector`, `ai`, `zones` (1-7 or names), `lines` (map line ids to focus on),
`teamSize`, `durationMonths`, `monthlyBudgetGBP`, `scale`, `growth`, `compliance[]`, `legacy`, `differentiator` (0-1),
`existingSkills[]`, `priorities` `{speed,cost,quality,risk}` (0-1).
