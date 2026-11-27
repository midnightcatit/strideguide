---
id: web
name: Web app
paths:
  - "apps/web/**"
---

Svelte 5 and SvelteKit. This is the app people use on a phone.

What to check:

- Writing rules. Every string a person can see must read as human-written. No em
  dashes. No hype words (unlock, empower, seamless, revolutionary, thrilled). No
  filler transitions. No markdown in generated text. Mono is for data, never for
  prose.
- Mobile. Check the change at 320px and 390px. Tap targets at least 44px. No
  horizontal overflow. No text touching or clipping. Long words wrap.
- Layout. Use the spacing scale and the existing tokens. Do not add a one-off
  colour or size when a token exists.
- State. A derive over `$page` or URL state must survive a shallow route change.
  Prefer explicit component state seeded from the URL.
- Accessibility. Buttons are buttons, labels are tied to inputs, and a sheet or
  dialog traps focus and closes on Escape.
