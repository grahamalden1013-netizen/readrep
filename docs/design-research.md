# Design research — sports technology and video analysis products

Internal working document for the NextRep design system. No competitor copy,
artwork, layout, branding or visual identity is reproduced here or in the
product. Everything below is a description of a *pattern*, followed by our own
decision about it.

## Method, and an honest limitation

The brief asked for first-hand inspection of the live sites and product
experiences of Hudl (Basketball / Studio / Balltime), Veo, HomeCourt, Spiideo,
Synergy Sports, Onform, Trace, WHOOP and Strava.

**That was not possible in this environment.** The organisation's egress proxy
rejects `CONNECT` for every one of those hosts with a 403 policy denial, and the
proxy documentation is explicit that a policy denial must be reported rather
than routed around. The same applies to third-party article and design-gallery
domains. Blocked hosts observed:

```
hudl.com  uniform.hudl.com  veo.co  homecourt.ai  spiideo.com
synergysports.com  onform.com  traceup.com  whoop.com  strava.com
```

`WebSearch` reaches a different network path and does work, so the research
below is **secondary**: documented descriptions of these products' positioning,
information architecture and interface patterns, plus general design-systems
literature. It is not a first-hand visual audit, and it is not presented as one.

Where a conclusion rests on judgement rather than a source, it says so.

### Sources consulted

- Hudl's public design system "Uniform" — referenced via
  [evernote.design's write-up](https://www.evernote.design/post/uniform-hudl-design-system/)
  (the system itself, `uniform.hudl.com`, is blocked).
- Product positioning and segmentation across Hudl / Veo / Spiideo / Pixellot —
  [Profluence, "The Big 4: AI Sports Cameras"](https://profluence.com/ai-sports-cameras-companies/);
  [Latterly, "Hudl Competitors"](https://www.latterly.org/hudl-competitors/);
  [Veo, "Sports Video Camera Systems Compared"](https://www.veo.com/article/sports-video-camera-systems-compared).
- Analysis-tool interface patterns (timeline scrubbing, tagging, lead-in/lead-out
  windows) — [Folio3, "Top Sports Video Analysis Software"](https://www.folio3.ai/blog/top-8-sports-video-analysis-software-solutions-for-coaches);
  [Video Tagger on the App Store](https://apps.apple.com/us/app/video-tagger-sports-analysis/id725815181).
- WHOOP's data-dense-but-calm interface approach —
  [925 Studios, "WHOOP Design Breakdown"](https://www.925studios.co/blog/whoop-design-breakdown);
  [aruliden's WHOOP project note](https://aruliden.com/project/whoop).
- Product-led marketing pages that lead with real UI —
  [Stan Vision, "Best SaaS website design"](https://www.stan.vision/journal/saas-website-design);
  [Framer, "Best SaaS websites"](https://www.framer.com/blog/best-saas-websites/).
- Semantic colour tokens across light and dark themes —
  [Imperavi, "Designing semantic colors"](https://imperavi.com/blog/designing-semantic-colors-for-your-system/);
  [Muzli, "Dark Mode Design Systems"](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/).
- The pedagogy NextRep is built on — video feedback combined with questioning as
  a decision-training method —
  [Developing sport expertise in youth sport: a decision training program in basketball (PMC6697037)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6697037/);
  [Basketball Immersion on decision training](https://basketballimmersion.com/learn-basketball-decision-training/).

## Patterns worth taking

**Lead with the running product, not a picture of it.** The strongest
product-led pages put a real interface — a recording, a live dashboard, an
interactive demo — above the fold instead of an illustration or a diagram, and
keep a primary action available at every scroll depth. This is the single most
transferable finding, and it is what NextRep already has the raw material for:
we can put a working rep on the page.

**The clip window is the unit of work.** Analysis tools converge on the same
model: a timeline, tagged moments, and a configurable lead-in / lead-out around
each moment so the clip carries context. NextRep's `clipStart → decisionPause →
clipEnd` is the same idea with the pause as the payload. The interface should
draw that window explicitly rather than presenting three unrelated number
fields.

**Dense, but calm.** WHOOP is repeatedly described as information-dense yet
uncluttered — achieved through hierarchy and restraint rather than by hiding
data. The lesson for Studio: density is fine, decoration is not.

**Segment by who holds the camera.** These products differentiate sharply by
audience (grassroots parent, club, high school, college, pro). NextRep's answer
to "who is it for?" has to be as concrete: a player with their own game film,
not a club buying an analysis suite.

**One design system across marketing and product.** Hudl maintains a single
system so every surface reads as the same company. Semantic colour tokens —
names that carry a *role* (`surface`, `text-primary`, `accent`) rather than a
value — are the mechanism that lets one brand span a light page and a dark
workspace without becoming two brands.

**Feedback lands harder when the athlete sees their own decision.** The decision
training literature pairs video with *questioning*, not narration — the athlete
is asked to commit before the answer is shown. That is precisely NextRep's loop,
and it is the argument that separates us from passive film review.

## Patterns deliberately rejected

- **The hardware-first hero.** Most of this category sells a camera. We sell what
  happens after the footage exists. Nothing on our page should imply hardware.
- **The club/organisation sales page** — pricing tiers, "book a demo", logo
  walls, seat counts. We have no customers yet, and manufacturing social proof
  would be dishonest. The working product is the proof.
- **Highlight-reel framing.** Highlights celebrate; NextRep interrogates. The
  page must actively distinguish itself from highlight generation and from
  passive film review, or it will be read as another clipping tool.
- **Coach-console density on the player's screens.** Coding windows, tag
  palettes and multi-panel layouts suit an analyst. A player taking five reps
  needs one decision on screen at a time.
- **Dashboard-as-analytics.** We have no data worth charting yet. Inventing
  charts would be the clearest possible signal that the product is a shell.
- **"AI-powered" badging.** The category is saturated with it, and in our case it
  would be untrue: reps are authored by a human in Studio.

## Design principles selected for NextRep

1. **The freeze is the brand.** Every surface is organised around one moment: the
   film stops, and a decision is owed. The accent colour exists to mark that
   moment and almost nothing else.
2. **Show the product, in the product's own clothes.** The marketing page embeds
   the real player component, not a mockup — so the transition from page to
   product is literally seamless.
3. **One system, three shells.** Marketing, application and film room differ in
   surface brightness only. Type, spacing, radii, control shapes, accent and
   motion are identical across all three.
4. **Neutral carries the weight; the accent is rationed.** Near-black type on a
   near-white ground, one signal colour. If the accent appears more than a few
   times per screen it has stopped meaning anything.
5. **Density where there is work, air where there is a decision.** Studio may be
   dense. A rep may not.
6. **Honest states.** Fixture mode, demo film and review-required states are
   labelled in the design, not apologised for in fine print.
7. **Motion only reports state.** The film pausing, a stage advancing, a rep
   being graded. No decorative animation.
