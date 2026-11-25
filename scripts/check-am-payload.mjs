/**
 * Check an Agent Manager payload before it is sent.
 *
 * The tool has one schema for two operations: starting sessions (action null)
 * and every other action (a string). A start request must carry the brief
 * inside tasks[].prompt, and the top-level prompt is only read for
 * action "prompt". A call with the brief in the wrong field, or a task that
 * carries model/variant/provider/agent without a prompt, is rejected, and
 * three invalid-argument calls in a row abort the turn. This script catches
 * that shape here, before the call is made.
 *
 * Usage:
 *   node scripts/check-am-payload.mjs payload.json
 *   cat payload.json | node scripts/check-am-payload.mjs
 *
 * Reads a file path argument or stdin, prints what is wrong in plain words,
 * and exits 1 on a bad shape or 0 when the shape is acceptable. Node built-ins
 * only.
 */
import { readFileSync } from 'node:fs';

const ALLOWED_ACTIONS = ['list', 'prompt', 'stop', 'move', 'answer'];
const PROMPT_ONLY_KEYS = ['model', 'variant', 'provider', 'agent'];

function readInput() {
	const path = process.argv[2];
	if (path && path !== '-') {
		return readFileSync(path, 'utf8');
	}
	return readFileSync(0, 'utf8');
}

function reject(errors) {
	for (const line of errors) {
		console.error(`- ${line}`);
	}
	console.error('Agent Manager payload rejected.');
	process.exit(1);
}

let raw;
try {
	raw = readInput();
} catch (error) {
	console.error(`Could not read the payload: ${error.message}`);
	process.exit(1);
}

let payload;
try {
	payload = JSON.parse(raw);
} catch (error) {
	console.error(`Payload is not valid JSON: ${error.message}`);
	process.exit(1);
}

if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
	console.error('Payload must be a JSON object.');
	process.exit(1);
}

const errors = [];
const action = payload.action;

if (action !== null && action !== undefined && !ALLOWED_ACTIONS.includes(action)) {
	errors.push(
		`"action" must be null for a start request, or one of ${ALLOWED_ACTIONS.join(', ')} (got ${JSON.stringify(action)}).`,
	);
}

// A start request is action null. Treat a missing action as a start request
// too, so the task checks still run on the shape that usually fails.
const isStart = action === null || action === undefined;

if (action === undefined) {
	errors.push('"action" is missing. A start request sets it to null.');
}

if (isStart) {
	if (!Array.isArray(payload.tasks) || payload.tasks.length === 0) {
		errors.push('A start request needs a "tasks" array with at least one task.');
	} else {
		payload.tasks.forEach((task, index) => {
			const where = `tasks[${index}]`;
			if (task === null || typeof task !== 'object' || Array.isArray(task)) {
				errors.push(`${where} must be an object.`);
				return;
			}
			const hasPrompt = typeof task.prompt === 'string' && task.prompt.trim() !== '';
			if (!hasPrompt) {
				errors.push(
					`${where} needs a non-empty string "prompt". The brief goes in tasks[].prompt, not the top-level "prompt".`,
				);
			}
			const withoutPrompt = PROMPT_ONLY_KEYS.filter((key) => key in task);
			if (!hasPrompt && withoutPrompt.length > 0) {
				errors.push(
					`${where} carries ${withoutPrompt.join(', ')} without a prompt. Those keys are rejected unless a prompt is present.`,
				);
			}
		});
	}

	if (typeof payload.prompt === 'string' && payload.prompt.trim() !== '') {
		errors.push(
			'This is a start request, so the top-level "prompt" must be null or absent. Put the brief in tasks[].prompt.',
		);
	}
}

if (errors.length > 0) {
	reject(errors);
}

if (isStart) {
	console.log(`Payload OK: start request with ${payload.tasks.length} task(s).`);
} else {
	console.log(`Payload OK: "${action}" request.`);
}
