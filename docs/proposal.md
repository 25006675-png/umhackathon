# TernakAI

**AI-Powered Decision Intelligence for Poultry Disease Prevention**

## Core Positioning

TernakAI transforms fragmented farm signals into actionable decisions by combining deterministic early-warning detection with Z.AI GLM-powered reasoning, diagnosis, and decision support.

---

## 1. Problem Alignment

### The Problem

Malaysia's poultry industry contributes ~RM13 billion annually, with smallholder farms (1,000–10,000 birds) forming a significant segment. These farmers face a critical decision-making gap:

- **Fragmented signals** — temperature, feed intake, mortality counts, and behavioural observations arrive separately with no unified interpretation
- **No analytical capability** — farmers lack tools to detect multi-signal patterns that precede outbreaks
- **Intuition-based, reactive decisions** — by the time symptoms are visually obvious, an outbreak is already 48–72 hours advanced, and losses are locked in

**The cost of late detection:**
A typical smallholder with 5,000 birds (valued at ~RM7 per bird at market) faces RM35,000 in stock value. An undetected respiratory outbreak can kill 30–50% of a flock within 5–7 days, resulting in RM10,500–17,500 in direct losses per incident — excluding feed waste, medication, and recovery downtime.

### How TernakAI Solves This

- Integrates structured data (temperature, feed, mortality) + unstructured data (farmer notes in Malay/English)
- Converts combined signals into decisions using Z.AI GLM
- Enables early, informed action — shifting intervention from reactive to preventive

---

## 2. System Architecture

### Layer 1 — Data Integration (Structured + Unstructured)

**Phase 1 (Hackathon MVP — No Hardware Required)**

Manual daily input via mobile form:
- Shed temperature (°C)
- Feed intake (kg)
- Mortality count
- Farmer notes — free text, e.g. "ayam senyap hari ini", "breathing fast", "less eating"

**Phase 2 (Post-Hackathon Scale)**

Optional low-cost IoT (~RM150–300 per shed):
- Temperature + humidity sensors
- Ammonia sensor (if available)

**Design principles:**
- Built for Malaysian smallholders — works fully without sensors
- Mobile-first, low-bandwidth compatible
- Supports Malay and English text input

### Layer 2 — Baseline & Deviation Engine (Deterministic)

**Logic:**
- Baseline = 3-day rolling average per signal
- Adjusted for flock age using simple normalization curves
- Deviation per signal:
  ```
  deviation = (current - baseline) / baseline
  ```

**Output:**
- Deviation magnitude and direction per signal
- Trend classification (stable / rising / falling)

### Layer 3 — Risk Scoring Engine (Deterministic)

**Logic:**
- Weighted composite score across signals:

| Signal              | Weight | Rationale                              |
|---------------------|--------|----------------------------------------|
| Feed drop           | 0.35   | Earliest and most reliable indicator   |
| Temperature change  | 0.25   | Environmental trigger for disease      |
| Mortality increase  | 0.25   | Direct outcome signal                  |
| Multi-signal interaction | 0.15 | Compound patterns amplify risk      |

**Output:**
- Risk score (0–100)
- Risk level: Low (0–30) / Moderate (31–60) / High (61–80) / Critical (81–100)
- Trend direction over last 3 entries

### Layer 4 — Projection Engine (Deterministic)

**Logic:**
- Maps current risk score to expected outcomes using predefined outbreak progression curves
- Estimates mortality range and financial loss based on flock size

**Output examples:**
- "Projected mortality: 30–50% within 5 days if no action taken"
- "Estimated loss: RM10,500–17,500 for a 5,000-bird flock"
- "Early intervention (within 12 hours) can reduce projected losses to RM1,750–3,500"

> **Note:** Projections are scenario-based estimates grounded in published outbreak data, not clinical predictions. They serve to quantify the cost of inaction for decision-making purposes.

---

## 3. Z.AI GLM Decision Intelligence Layer (Core)

This is where raw signals become actionable decisions. Every subsection below is powered by Z.AI's GLM and cannot function without it.

### 3.1 Interpretation Engine

**Input:** Structured deviations + farmer notes (unstructured text) + farm context (flock age, size, location)

**GLM task:** Fuse structured and unstructured signals into a coherent situation assessment.

**Output example:**
> "Feed intake dropped 18% over 2 days while farmer notes indicate birds are quieter than usual. Combined with rising shed temperature, this suggests early-stage heat stress or the onset of a respiratory condition — not yet visible physically but progressing."

### 3.2 Disease Hypothesis Generator (RAG-Grounded)

**Flow:**
1. Symptom pattern detected from Layer 3 risk signals
2. RAG retrieves matching disease profiles from veterinary knowledge base (see Section 3.8)
3. GLM compares retrieved profiles against observed signal combination
4. Outputs ranked hypotheses with confidence reasoning and source citations

**Output example:**
> "Most likely causes based on current signals:
> 1. **Chronic Respiratory Disease (CRD)** — 72% pattern match (based on DVS respiratory management protocol, Section 4.2)
> 2. **Heat stress** — environmental mismatch detected, shed temp 3°C above baseline
> 3. **Newcastle disease** — lower likelihood given vaccination history, but high severity warrants monitoring
>
> *Sources: DVS Respiratory Disease Guidelines (2021), OIE Terrestrial Manual Ch. 3.3.14*"

**Key point:** Hypotheses are retrieved and grounded in authoritative sources, not invented by the model.

### 3.3 Insight Generation

GLM synthesises cross-signal patterns into forward-looking conclusions:
> "This pattern — concurrent feed drop, behavioural quietness, and rising temperature — has historically preceded respiratory outbreaks within 48 hours in similar flock profiles. The window for preventive action is narrowing."

### 3.4 Action Recommendation Engine

**Output — specific, prioritised, and operationally actionable:**
1. **Immediate (within 2 hours):** Increase fan runtime by ~30% to reduce ammonia concentration below 25 ppm
2. **Within 6 hours:** Add electrolyte supplement to water supply (dosage: 1g per litre)
3. **Within 12 hours:** Isolate affected zone if mortality clustering persists in specific shed section
4. **Within 24 hours:** Contact nearest DVS veterinary officer for inspection if risk score exceeds 80

**Characteristics:**
- Prioritised by impact and urgency
- Context-aware (considers flock age, shed conditions, available resources)
- Operationally specific (dosages, timeframes, thresholds)

### 3.5 Constraint-Based Decision Support

Farmers operate under real-world constraints — limited budget, limited labour, limited access to supplies. The GLM factors these in:

> "If only one action is feasible due to cost constraints, prioritise ventilation improvement — it has the highest impact-to-cost ratio for respiratory conditions. Electrolyte supplementation can be deferred 12 hours with minimal risk increase."

> "You mentioned only one worker is available today. Focus isolation efforts on Shed B (highest mortality cluster) and defer Shed A monitoring to tomorrow."

### 3.6 Scenario Narration

Translates deterministic projections into decision-driving narratives:

> "**If no action is taken:** Up to 50% of your flock (approximately 2,500 birds) may be lost within 5 days, representing ~RM17,500 in losses.
>
> **If you act within 12 hours:** Projected losses drop to 5–10% (~RM1,750–3,500). The most critical window is the next 6 hours.
>
> **If you act within 48 hours:** Losses may still reach 20–30%, with partial flock recovery expected over 2 weeks."

### 3.7 Conversational Interface (Bilingual — Stretch Goal)

Allows farmers to ask follow-up questions in Malay or English:

> **Farmer:** "Kenapa risiko tinggi? Ayam nampak normal je."
>
> **TernakAI:** "Risiko tinggi kerana gabungan tiga isyarat: pengambilan makanan turun 18%, suhu reban naik 3°C, dan nota anda semalam sebut ayam lebih senyap. Tanda-tanda ini biasanya muncul 1–2 hari sebelum gejala fizikal kelihatan. Ini peluang untuk bertindak awal."

> **Note:** The bilingual conversational interface is a stretch goal. Core functionality (interpretation, diagnosis, recommendations) will be delivered first via the dashboard. Chat is added if time permits.

### 3.8 RAG Knowledge Layer (Explicit Sources)

**Curated veterinary knowledge base:**
- Jabatan Perkhidmatan Veterinar (DVS) Malaysia — disease protocols and management guidelines
- MARDI / local university poultry research publications
- World Organisation for Animal Health (WOAH/OIE) — Terrestrial Manual, poultry disease chapters

**Implementation:**
- Source documents chunked and embedded for semantic retrieval
- Retrieved context injected into GLM prompts before hypothesis generation
- All GLM outputs include source citations for traceability

**Output includes citation:**
> "According to DVS respiratory disease management guidelines (Section 4.2), flocks showing concurrent feed reduction and behavioural changes should be assessed for CRD within 24 hours..."

---

## 4. Smart Alerts

**Trigger conditions:**
- Risk score crosses threshold (e.g. Moderate → High)
- Rapid single-signal change (e.g. mortality doubles in 24 hours)
- GLM identifies urgent pattern requiring immediate action

**Output example:**
> "⚠ CRITICAL: Outbreak risk score 78 (High). Feed intake down 22%, mortality up 3x in 24 hours. Immediate ventilation and isolation recommended. Tap for full analysis."

---

## 5. Dashboard

**Displays:**
- Risk score trend (last 7 days, visual graph)
- Signal breakdown (feed, temperature, mortality — with deviation indicators)
- GLM-generated recommended actions (prioritised list)
- Projection summary (mortality range, financial impact)
- Alert history
- Last farmer notes and GLM interpretation

**Design principles:** Mobile-first, minimal text, colour-coded risk levels (green/yellow/orange/red), accessible to users with limited tech literacy.

---

## 6. Feedback Loop

- Farmer confirms actual outcome after alert (e.g. "birds recovered" / "outbreak happened")
- Logs actions taken vs. recommended
- Enables future refinement of risk weights and GLM prompts
- Builds farm-specific historical baselines over time

---

## 7. GLM Centrality — Why Z.AI is Non-Removable

### Without GLM, the system produces:
- Risk score: 78
- Feed deviation: -22%
- Projected mortality: 30–50%

These are **numbers without meaning**. The farmer still does not know:
- What disease is emerging
- What action to take first
- Why this combination of signals matters
- How their specific constraints affect the optimal decision
- What happens if they wait vs. act now

**This is exactly the fragmented-data problem described in the competition brief — the system reproduces it, not solves it.**

### With GLM, the same signals become:
- **Diagnosis:** "Likely CRD based on signal pattern and DVS guidelines"
- **Prioritised actions:** "Ventilation first, electrolytes second, isolate if clustering continues"
- **Context-aware reasoning:** "Given your budget constraint, focus on ventilation — highest impact per ringgit"
- **Clear explanation:** "These signals typically precede visible symptoms by 48 hours — this is your window"

### Therefore:
> **"A system without GLM produces signals, not decisions. It does not solve the problem — it reproduces it. Z.AI's GLM is the reasoning layer that transforms data into decision intelligence."**

---

## 8. Capability Mapping (Explicit for Judges)

| Competition Requirement | Where Implemented | How |
|---|---|---|
| Interpretation of structured + unstructured data | Layer 1 + Section 3.1 | Mobile form captures structured metrics + free-text farmer notes; GLM fuses both into unified assessment |
| Context-aware reasoning & insight generation | Sections 3.2, 3.3 | RAG-grounded disease hypothesis generation + cross-signal pattern synthesis |
| Recommendation of actions or strategies | Sections 3.4, 3.5 | Prioritised, constraint-aware action plans with dosages and timeframes |
| Explanation of decisions in clear, user-understandable manner | Sections 3.1, 3.6, 3.7 | Plain-language scenario narration + bilingual conversational Q&A |

---

## 9. Quantifiable Impact & Validation

### Target Metrics

| Metric | Without TernakAI | With TernakAI | Improvement |
|---|---|---|---|
| Detection speed | 48–72 hours after onset | Same day (early signals) | 2–3 days earlier |
| Outbreak mortality | 30–50% of flock | 5–10% of flock (projected) | 60–80% reduction |
| Financial loss per incident (5,000-bird flock) | RM10,500–17,500 | RM1,750–3,500 | RM7,000–14,000 saved |
| Decision time | Hours to days (vet visit required) | Minutes (immediate GLM analysis) | ~90% faster |
| Action specificity | Generic advice / intuition | Prioritised, dosage-specific, constraint-aware | Qualitative leap |

### Validation Approach — Simulated 3-Day Outbreak Scenario

We validate TernakAI using a realistic simulated scenario based on published CRD outbreak progression data:

**Day 1 — Early Signal Detection**
- Feed intake: -8% from baseline → deviation flagged
- Farmer note: "ayam senyap sikit hari ini"
- Risk score: 42 (Moderate)
- GLM output: Interpretation + early monitoring recommendation

**Day 2 — Risk Escalation**
- Feed intake: -18% from baseline
- Mortality: 3 birds (up from 1/day baseline)
- Shed temperature: +3°C above baseline
- Risk score: 72 (High)
- GLM output: Disease hypothesis (CRD likely) + prioritised action plan + scenario projection

**Day 3 — With vs. Without TernakAI**
- **Without TernakAI:** Farmer notices sick birds visually, calls vet. By now mortality is accelerating. Projected final loss: 30–50% of flock.
- **With TernakAI:** Farmer acted on Day 2 recommendations (ventilation + electrolytes + isolation). Mortality stabilises. Projected final loss: 5–10% of flock.

**Delta:** RM7,000–14,000 saved per incident for a 5,000-bird farm.

> This scenario will be the centrepiece of our live demo, showing real-time data entry → deterministic processing → GLM analysis → actionable output.

---

## 10. Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| Frontend | React (Next.js) or Flutter Web | Mobile-first, responsive dashboard |
| Backend API | Python (FastAPI) | Lightweight, async, easy GLM integration |
| Deterministic Engine | Python | Rolling averages, risk scoring, projections |
| GLM Integration | Z.AI API (HTTP/SDK) | Core reasoning, hypothesis generation, recommendations |
| RAG / Vector Store | FAISS or ChromaDB (local) | Lightweight, no infra dependency for hackathon |
| Knowledge Base | Markdown/PDF chunks from DVS, MARDI, OIE | Embedded and indexed for semantic retrieval |
| Database | SQLite (hackathon) / PostgreSQL (scale) | Simple, portable for demo |

---

## Final One-Liner

> **"TernakAI converts fragmented farm signals into actionable decisions by combining deterministic early-warning detection with Z.AI GLM-powered reasoning, diagnosis, and context-aware decision support — saving Malaysian poultry farmers up to RM14,000 per outbreak."**
