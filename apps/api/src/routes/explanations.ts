import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { explanationRefFor } from '@strideguide/shared/plan';
import { schema } from '../db';
import type { AppBindings } from '../types';

const explanations = new Hono<AppBindings>();

interface Claim {
	topic: string;
	claim: string;
	evidence?: string;
	confidence?: string;
	source?: string;
}

/** Parse the assembled `full` text into structured per-claim blocks. */
function parseClaims(full: string): Claim[] {
	const out: Claim[] = [];
	for (const block of full.split('\n\n')) {
		const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
		if (!lines.length || !lines[0]!.startsWith('###')) continue;
		const claim: Claim = { topic: lines[0]!.replace(/^###\s*/, ''), claim: lines[1] ?? '' };
		for (const line of lines.slice(2)) {
			if (line.startsWith('Evidence:')) claim.evidence = line.slice(9).trim();
			else if (line.startsWith('Confidence:')) claim.confidence = line.slice(11).trim();
			else if (line.startsWith('Source:')) claim.source = line.slice(7).trim();
		}
		out.push(claim);
	}
	return out;
}

explanations.get('/', async (c) => {
	const type = c.req.query('type') ?? '';
	const ref = c.req.query('ref') ?? explanationRefFor(type);
	if (!ref) return c.json({ error: 'unknown_topic' }, 404);

	const db = c.get('db');
	const rows = await db
		.select()
		.from(schema.explanations)
		.where(eq(schema.explanations.refId, ref))
		.limit(1);
	const row = rows[0];
	if (!row) return c.json({ error: 'not_found' }, 404);

	const ids = ((row.citationIds as string[] | null) ?? []).slice(0, 24);
	const sourceRows = ids.length
		? await db.select().from(schema.researchSources).where(inArray(schema.researchSources.id, ids))
		: [];

	return c.json({
		ref,
		summary: row.summary ?? '',
		claims: parseClaims(row.full ?? ''),
		sources: sourceRows.map((s) => ({
			title: s.title,
			authors: s.authors,
			year: s.year,
			venue: s.venue,
			doiUrl: s.doiUrl,
		})),
		kbVersion: row.kbVersion,
	});
});

export default explanations;
