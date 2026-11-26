# Spacing

How vertical space is set across the app. The aim is one rhythm, in relative
units, so the gaps scale with the device and with the reader's font size instead
of breaking at a fixed pixel size.

## The scale

Every vertical gap comes from the Tailwind spacing scale, which is `rem`-based
(`1` is `0.25rem`, and a step grows with the root font size). Use a step from
this scale; do not use `px`, and do not invent a value between the steps.

| Step | Value | What it separates |
| --- | --- | --- |
| `0.5` | 0.125rem | A label and the line under it: a tile's label and its value, a heading and its subline. |
| `1` | 0.25rem | A form label and the control under it. |
| `2` | 0.5rem | A section header and its content; the rows of a list. |
| `3` | 0.75rem | A sub-group inside a card, such as a control group under its intro line. |
| `4` | 1rem | A card's internal padding on a phone; a standard block gap. |
| `5` | 1.25rem | A card's internal padding from the small breakpoint up. |
| `6` | 1.5rem | A large gap that is not a section boundary: a banner above the content, a control below it. |
| `7` | 1.75rem | Between a page's major sections, and between a page title and the first section. |

## The relationships that repeat

These are the gaps that recur, and the shared piece that owns each one. Keeping
the owner in one place is the point: a page should not have to know the value.

- **A section header and its content**: `space-2` (`mb-2`). Owned by
  `SectionHeader`, so the gap is the same wherever a header is used.
- **A page's major sections**: `space-7` (`mt-7`). Also owned by `SectionHeader`,
  which carries the gap above itself. A section therefore never depends on the
  block before it, so a card or any other block that precedes a section still
  leaves the right gap. This is what a bare block between two sections used to
  get wrong: with the gap only on the section above, the next section's header
  landed flush against it.
- **A card's internal padding**: `space-4`, and `space-5` from the small
  breakpoint. Owned by `Card`.
- **A list's rows**: `space-2` between the rows of a spaced list (`space-y-2`),
  or `py-2` on each row of a divided list. A deliberately dense or airy list may
  use a neighbouring step, but still one from this scale.
- **A label and the value under it**: `space-0.5`.

## Applying it

- A page-level block that sits where a section would, but has no header of its
  own (a card with no header, for example), carries `space-7` itself, so it lines
  up with the sections around it.
- A `SectionHeader` used inside a card, where the card already owns the space,
  sets `topGap={false}` and lets the card's own layout set the rhythm.
- The page title follows the same `space-7` rhythm: `MetricHeader` and
  `SettingsHeader` both leave `space-7` under the title.
