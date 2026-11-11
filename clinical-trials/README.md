# Clinical Trial Atlas

Twenty GPU-rendered, interactive explanations of how a global clinical trial actually works —
built for Labmarket, in Labmarket's visual language.

**Open `index.html`.**

---

## What this is

Twenty self-contained WebGL visuals, each one explaining a different part of the clinical trial
lifecycle. They are not decoration: each one is driven by a real model you can push on with the
controls, and the numbers in the panels are computed from that model, not written in by hand.

All twenty share a single synthetic study — **LMK-204**, a Phase III oncology protocol with
84 sites across 49 countries and 2,400 planned patients — so a site that is slow to activate in
#08 is the same site that is still behind on enrolment in #06 and flagged for monitoring in #17.

| # | Visual | What it explains | Technique |
|---|--------|------------------|-----------|
| 01 | The Phase Cascade | Phase I→IV attrition; why 1 in 13 candidates survives | GPGPU particle cascade |
| 02 | Protocol Lattice | Schedule of assessments as patient burden | Instanced lattice |
| 03 | The Eligibility Sieve | How inclusion/exclusion criteria collapse a population | GPGPU sieve |
| 04 | Site Feasibility Field | Weighted site selection on a globe | Instancing on a sphere |
| 05 | Regulatory Runway | Country startup timelines and the critical path | 3D gantt |
| 06 | Enrollment Accretion | 30 months of global enrolment, site by site | Globe + GPGPU |
| 07 | Follow the Sun | 24-hour coverage across time zones | Terminator shader |
| 08 | Activation Cascade | Site activation rippling outward | Flat map + ripples |
| 09 | Patient Journeys | 11,400 people → 2,400 randomised → outcomes | GPGPU alluvial |
| 10 | Cold Chain | IMP depot→site shipping and temperature excursions | GPGPU along arcs |
| 11 | Randomisation & Blind | Stratified permuted-block allocation | GPGPU + sequence texture |
| 12 | Dose Escalation | The 3+3, and how often it picks the wrong dose | Monte-Carlo simulation |
| 13 | Retention Surface | Kaplan–Meier, hazard ratio, log-rank | Survival simulation |
| 14 | Safety Signal Space | MedDRA volcano: which AEs are real signals | 3D scatter |
| 15 | Deviation Lattice | Quality texture across 84 sites × 30 months | 2,520 instances |
| 16 | Data Pipeline | Source → EDC → query → lock | GPGPU pipeline |
| 17 | Risk Surface | Risk-based monitoring as a landscape | Vertex-shader terrain |
| 18 | Endpoint Readout | Effect size, CI, power, and subgroup noise | Forest plot |
| 19 | Evidence Graph | Literature + entity resolution, force-directed | GPGPU n-body |
| 20 | The Digital Twin | Every layer at once on one clock | All of the above |

---

## Running it

**Easiest:** double-click `index.html`, or any file in `viz/`. They work straight from the
filesystem — there are no `fetch()` calls and no module imports, so `file://` is fine.

**Served** (recommended; some browsers are stricter about local fonts):

```
serve.cmd          # Windows
./serve.sh         # macOS / Linux
```

Then open <http://127.0.0.1:8731>.

Needs any modern browser with hardware WebGL — Chrome and Edge are the smoothest.
A page with no GPU available shows a plain message instead of failing silently.

---

## Self-hosted

Nothing is loaded from a CDN and nothing phones home at runtime.

```
assets/
  vendor/three.min.js        three.js r147 (MIT), UMD build — the only dependency
  fonts/archivo-*.woff2      Archivo (SIL OFL 1.1), latin + latin-ext subsets
  js/land.js                 Natural Earth 110m land outlines (public domain),
                             quantised to 0.1° and converted to a plain JS array
  js/lmviz.js                shared runtime (see below)
  css/base.css               the design system
```

To deploy, copy the whole folder anywhere that serves static files. No build step, no
`node_modules`, no configuration.

---

## The shared runtime — `assets/js/lmviz.js`

Everything the twenty pages have in common lives here, so a new visual is a single HTML file
of maybe 200 lines.

- `LM.boot(opts)` — renderer, scene, camera, resize, render loop, graceful WebGL failure.
  `fit:` frames an object of a given radius on **both** axes, so a tall narrow window pulls the
  camera back instead of cropping.
- `LM.Orbit` — self-contained orbit/dolly/pan with damping and idle auto-rotate. No `examples/`
  dependency.
- `LM.GPGPU` — ping-pong float render targets with a half-float fallback. Feed it a fragment
  shader and a seeding function; call `.step(dt, t)` and read `.texture`.
- `LM.globe(ctx, R, opts)` — the full styled planet: body, atmospheric rim, graticule,
  coastlines, land dot-matrix.
- `LM.geo` — lat/lon → sphere or equirectangular, coastline geometry, land mask raster, arcs.
- `LM.ui` — sliders, segmented controls, checkboxes, stat grids, legends, tooltip.
- `LM.study` — the canonical synthetic study, generated deterministically from a fixed seed.
- `LM.manifest` — the list of all twenty; the gallery and the prev/next nav both read it.
- `LM.glsl.psize` — physically-correct point sizing. `lmSize(worldDiameter, mvPosition)` returns
  `gl_PointSize` in device pixels, so dots look identical at any resolution or DPR.

**Adding a 21st visual:** copy any file in `viz/`, add an entry to `LM.manifest`, done — the
gallery, the numbering and the prev/next arrows all pick it up.

---

## A note on the data

The study is synthetic. It is generated from a fixed seed so it is identical on every machine
and every reload, and it is parameterised on published, realistic values:

- Phase transition success rates in #01 are the BIO / Informa / QLS 2011–2020 figures
  (12,728 transitions): Phase I→II 52%, II→III 28.9%, III→NDA 57.8%, NDA→approval 90.6%,
  and 7.9% overall from Phase I.
- Country startup durations in #05 are typical ranges for a Phase III oncology protocol.
- The immune-mediated adverse events in #14 (hypophysitis, hypothyroidism, pneumonitis, colitis)
  carry deliberately elevated risk ratios, so the signal-detection controls have something true
  to find under the noise.

**No real patient data is used anywhere in this project**, and none of it should be read as a
claim about any actual trial, site or compound.

---

## Keyboard

`←` `→` move between visuals · `Esc` returns to the gallery

---

## Licences

three.js — MIT. Archivo — SIL Open Font License 1.1. Natural Earth — public domain.
