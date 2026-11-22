-- Stride Guide seed data.
-- Built-in goal profiles live in code (@strideguide/shared/profiles); this file seeds
-- reference rows. The research program (M3) will populate `exercises`, `explanations`,
-- and `research_sources` from the consolidated knowledge base.

INSERT OR IGNORE INTO knowledge_base_versions (id, tier, generated_at, refreshed_by, notes)
VALUES ('seed-initial', 'core', unixepoch(), 'seed', 'Initial scaffold seed');
