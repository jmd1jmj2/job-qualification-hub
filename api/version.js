export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    ok: true,
    version: '2026-09-04-v6-routing-check',
    assessorRoute: '/api/assess5.js',
    assessorVersion: '2026-09-04-v5-industry-verified',
    message: 'Production should now be using the industry-verified assessor.'
  });
}
