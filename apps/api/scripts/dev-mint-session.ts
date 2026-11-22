/** Dev-only helper: mint a session token for local end-to-end testing (never used in prod). */
import { createHash } from 'node:crypto';
import { SignJWT } from 'jose';

const secret = process.env.DEV_SESSION_SECRET;
const uid = process.env.USER_ID;
if (!secret || !uid) {
	console.error('set DEV_SESSION_SECRET and USER_ID');
	process.exit(1);
}

const token = await new SignJWT({ uid, email: 'test@example.com' })
	.setProtectedHeader({ alg: 'HS256' })
	.setIssuedAt()
	.setExpirationTime('14d')
	.sign(new TextEncoder().encode(secret));

const hash = createHash('sha256').update(token).digest('hex');
console.log(JSON.stringify({ token, hash, uid }));
