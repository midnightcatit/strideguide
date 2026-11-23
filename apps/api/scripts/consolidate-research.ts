/**
 * Consolidates the research wave JSON files into D1 seed SQL (PLAN.md §7.2 / §19).
 * Deterministic + idempotent: emits INSERT OR REPLACE keyed on stable ids.
 *
 *   pnpm --filter @strideguide/api research:consolidate
 *   wrangler d1 execute strideguide-db --local --file=./seed/seed-research.sql
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BODYWEIGHT_MOVES, PF_MACHINES } from '@strideguide/shared/plan';

const here = dirname(fileURLToPath(import.meta.url));
const researchDir = resolve(here, '../../../research');
const outFile = resolve(here, '../seed/seed-research.sql');

interface Citation {
	title: string;
	authors?: string;
	year?: number;
	venue?: string;
	type?: string;
	doi_or_url?: string;
	retrieved_at?: string;
}

interface Claim {
	topic: string;
	claim: string;
	evidence?: string;
	confidence?: string;
	citation: Citation;
}

interface ResearchFile {
	workstream: string;
	subtopic: string;
	generated_at?: string;
	claims?: Claim[];
	summary_tier_a?: string;
	unverified?: string[];
	notes?: string;
}

const KB_VERSION = 'wave-1-mvp';

function hash(input: string, len = 12): string {
	return createHash('sha256').update(input).digest('hex').slice(0, len);
}

/** No em dashes anywhere in published research text (house rule). */
function sanitize(text: string): string {
	return text
		.replace(/\s*—\s*/g, ', ')
		.replace(/\s+([,.;:])/g, '$1')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** Normalise a DOI to a resolvable URL, leave real URLs alone. */
function normDoi(value: string): string {
	const v = value.trim();
	if (!v) return '';
	if (/^https?:\/\//i.test(v)) return v;
	if (/^10\.\d{4,9}\//.test(v)) return `https://doi.org/${v}`;
	return v;
}

function sqlStr(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'number') return String(value);
	return `'${value.replace(/'/g, "''")}'`;
}

function toUnix(iso?: string): number | null {
	if (!iso) return null;
	const t = Date.parse(iso);
	return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

function collectFiles(): string[] {
	const files: string[] = [];
	for (const wave of readdirSync(researchDir, { withFileTypes: true })) {
		if (!wave.isDirectory() || !wave.name.startsWith('wave-')) continue;
		const waveDir = join(researchDir, wave.name);
		for (const f of readdirSync(waveDir)) {
			if (f.endsWith('.json')) files.push(join(waveDir, f));
		}
	}
	return files.sort();
}

/** The code catalog (machines + bodyweight) mirrors into the exercises table. */
function exerciseRows(): string[] {
	const machineNames = new Set(PF_MACHINES.map((m) => m.name));
	const rows: string[] = [];
	for (const m of [...PF_MACHINES, ...BODYWEIGHT_MOVES]) {
		const isMachine = machineNames.has(m.name);
		const refs = isMachine
			? ['wave-1/3b-strength-programming', 'wave-2/4a-pf-machines-form']
			: ['wave-1/3b-strength-programming', 'wave-1/3c-bodyweight-and-machines'];
		const whyFull = [m.why, `Feel: ${m.feel}`, `Common mistakes: ${m.mistakes.join('; ')}`].join(
			'\n\n',
		);
		rows.push(
			`INSERT OR REPLACE INTO exercises (id, name, modality, machine, muscle_groups, form_notes, purpose, why_full, research_refs) VALUES (` +
				[
					sqlStr(`ex-${hash(m.name.toLowerCase())}`),
					sqlStr(m.name),
					sqlStr('strength'),
					sqlStr(isMachine ? m.name : null),
					sqlStr(JSON.stringify(m.muscles)),
					sqlStr(JSON.stringify(m.form)),
					sqlStr(m.why),
					sqlStr(whyFull),
					sqlStr(JSON.stringify(refs)),
				].join(', ') +
				');',
		);
	}
	return rows;
}

function main(): void {
	if (!existsSync(researchDir)) {
		console.error(`No research dir at ${researchDir}`);
		process.exit(1);
	}

	const files = collectFiles();
	const sources = new Map<string, Citation & { id: string }>();
	const explanationRows: string[] = [];
	let claimCount = 0;

	for (const file of files) {
		let parsed: ResearchFile;
		try {
			parsed = JSON.parse(readFileSync(file, 'utf8')) as ResearchFile;
		} catch (err) {
			console.warn(`skip (invalid JSON): ${file}`);
			continue;
		}

		const claims = parsed.claims ?? [];
		claimCount += claims.length;
		const citationIds: string[] = [];
		const fullParts: string[] = [];

		for (const c of claims) {
			const doiUrl = normDoi(c.citation?.doi_or_url ?? '');
			const key = doiUrl || c.citation?.title || JSON.stringify(c.citation);
			const id = `src-${hash(key.toLowerCase())}`;
			if (!sources.has(id)) {
				sources.set(id, { ...c.citation, doi_or_url: doiUrl, title: sanitize(c.citation?.title ?? '') , id });
			}
			citationIds.push(id);
			fullParts.push(
				[
					`### ${sanitize(c.topic)}`,
					sanitize(c.claim),
					c.evidence ? `Evidence: ${sanitize(c.evidence)}` : '',
					`Confidence: ${c.confidence ?? 'n/a'}`,
					`Source: ${sanitize(c.citation?.title ?? 'unknown')}${c.citation?.year ? ` (${c.citation.year})` : ''}`,
				]
					.filter(Boolean)
					.join('\n'),
			);
		}

		const refId = file.replace(researchDir + '/', '').replace(/\.json$/, '');
		const explanationId = `exp-${hash(refId, 16)}`;
		const full = [sanitize(parsed.summary_tier_a ?? ''), ...fullParts].join('\n\n');
		explanationRows.push(
			`INSERT OR REPLACE INTO explanations (id, scope, ref_id, summary, full, citation_ids, model, kb_version) VALUES (` +
				[
					sqlStr(explanationId),
					sqlStr('topic'),
					sqlStr(refId),
					sqlStr(sanitize(parsed.summary_tier_a ?? '')),
					sqlStr(full),
					sqlStr(JSON.stringify([...new Set(citationIds)])),
					sqlStr('consolidate-script'),
					sqlStr(KB_VERSION),
				].join(', ') +
				');',
		);
	}

	const sourceRows = [...sources.values()].map(
		(s) =>
			`INSERT OR REPLACE INTO research_sources (id, title, authors, year, venue, type, doi_url, retrieved_at) VALUES (` +
			[
				sqlStr(s.id),
				sqlStr(sanitize(s.title ?? '')),
				sqlStr(s.authors ?? null),
				sqlStr(s.year ?? null),
				sqlStr(s.venue ? sanitize(s.venue) : null),
				sqlStr(s.type ?? null),
				sqlStr(s.doi_or_url ?? null),
				sqlStr(toUnix(s.retrieved_at)),
			].join(', ') +
			');',
	);

	const exerciseSql = exerciseRows();
	const header =
		`-- Generated by scripts/consolidate-research.ts. Do not edit by hand.\n` +
		`-- ${sources.size} sources, ${explanationRows.length} explanations, ${claimCount} claims, ${exerciseSql.length} exercises from ${files.length} files.\n` +
		`INSERT OR REPLACE INTO knowledge_base_versions (id, tier, generated_at, refreshed_by, notes) VALUES (` +
		`'${KB_VERSION}', 'core', unixepoch(), 'consolidate-script', ${sqlStr(`${claimCount} claims`)});\n`;

	writeFileSync(
		outFile,
		`${header}${sourceRows.join('\n')}\n${explanationRows.join('\n')}\n${exerciseSql.join('\n')}\n`,
	);
	console.log(
		`Wrote ${outFile}: ${sources.size} sources, ${explanationRows.length} explanations, ${claimCount} claims, ${exerciseSql.length} exercises, ${files.length} files.`,
	);
}

main();
