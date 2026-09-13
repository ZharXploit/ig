import crypto from 'crypto';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body || {};

    const ADMIN_USER    = process.env.ADMIN_USER;
    const ADMIN_PASS    = process.env.ADMIN_PASS;
    const TOKEN_SECRET  = process.env.ADMIN_TOKEN_SECRET || 'default-secret-change-me';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const expires = Date.now() + (24 * 60 * 60 * 1000);
        const payload = `${username}:${expires}`;
        const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
        const token = Buffer.from(`${payload}:${sig}`).toString('base64');
        return res.status(200).json({ isAdmin: true, token });
    }

    return res.status(200).json({ isAdmin: false });
}
