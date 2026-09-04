import { generateText } from 'ai';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.6-sol',
      prompt: 'Reply with exactly: AI_GATEWAY_OK'
    });

    return res.status(200).json({
      ok: true,
      gateway: 'reachable',
      model: 'openai/gpt-5.6-sol',
      text: String(text || '').trim()
    });
  } catch (err) {
    const message = String(err?.message || err || 'Unknown error');
    console.error('AI Gateway health check failed:', err);
    return res.status(500).json({
      ok: false,
      stage: 'ai_gateway',
      error: message,
      hasAiGatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY),
      hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN)
    });
  }
}
