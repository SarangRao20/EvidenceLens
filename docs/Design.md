# Design — EvidenceLens

Tone: calm, credible, research-tool. Evidence and uncertainty are the visual hero, not decoration.

## Theme
Light theme by default, dark supported via Streamlit's theme. Configure in `.streamlit/config.toml`.

## Colors
| Role | Hex | Use |
|---|---|---|
| Background | `#FAFAF7` | Page |
| Surface | `#FFFFFF` | Cards |
| Text | `#1F2933` | Body |
| Muted text | `#616E7C` | Secondary, metadata |
| Border | `#E4E7EB` | Dividers |
| Primary / accent | `#2F5D8A` | Buttons, links |

### Status colors (evidence matrix)
Never rely on color alone: always pair with a label and icon.

| Status | Fill | Text/border | Icon |
|---|---|---|---|
| supported | `#DDF3E4` | `#1E7F3F` | ✓ |
| contradicted | `#FBE0E0` | `#B3261E` | ✕ |
| mixed | `#FFF3CC` | `#8A6A00` | ± |
| insufficient_evidence | `#E8EAED` | `#52606D` | ? |

### Source type badges
web `#E3EDF7` · news `#EFE3F7` · scholar `#E3F3F0` (dark text on each).

## Typography
- Headings: **Inter** (600/700). Body: **Inter** (400/500). Monospace for IDs (S1, C1): **JetBrains Mono**.
- Scale: H1 32px, H2 24px, H3 18px, body 15–16px, meta 13px.
- Line height 1.5 for body.

## Layout (top to bottom)
1. Title + one-line tagline, question input, Analyze button.
2. Executive summary (short, with a visible "not a verdict" note).
3. **Evidence Matrix**: rows = claims, columns = status, supporting count, contradicting count, quality signals. Status cell colored per table above.
4. Claim cards (expanders): claim text, status badge, rationale, uncertainty note, linked source chips (S1, S2 → scroll to ledger).
5. Source ledger: numbered list, clickable title, domain, type badge, date.
6. Limitations.
7. Search queries used (collapsed).

## Components
- **Status badge**: pill, icon + label, status colors.
- **Source chip**: monospace `S3`, links to ledger entry.
- **Uncertainty note**: muted italic block with a small "Uncertainty" label, always visible in the card.

## Accessibility
- Contrast at least 4.5:1 for text.
- Status communicated by label and icon, not color only.
- Links open in a new tab with visible domain.

## Tone of copy
Use "supported by", "contradicted by", "insufficient evidence". Avoid "proven", "fake", "true/false".
