import assess5 from './assess5.js';

const VALIDATOR_VERSION = '2026-09-04-v6-posting-validator';

function looksLikeRealPosting(text='') {
  const t = String(text).toLowerCase();
  const hasRoleContent = /(responsibilit|qualification|requirements|what you(?:'|’)ll do|about the role|job description|minimum qualifications|preferred qualifications|experience required)/.test(t);
  const hasEnough = text.length >= 1200;
  const obviousApplyPage = /(apply for this job|submit application|create an account|sign in to apply|candidate login)/.test(t) && !hasRoleContent;
  return hasEnough && hasRoleContent && !obviousApplyPage;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed', validatorVersion: VALIDATOR_VERSION });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const jobUrl = String(body.jobUrl || body.url || '').trim();
    const pasted = String(body.jobDescription || body.description || '').trim();

    if (pasted) {
      if (!looksLikeRealPosting(pasted)) {
        return res.status(422).json({
          error: 'The pasted text does not appear to contain a complete job posting. Paste the full job description before assessing.',
          stage: 'posting_validation',
          validatorVersion: VALIDATOR_VERSION
        });
      }
      req.body = { ...body, jobDescription: pasted };
      return assess5(req, res);
    }

    if (!jobUrl) {
      return res.status(400).json({ error: 'Provide a job URL or pasted job description.', validatorVersion: VALIDATOR_VERSION });
    }

    let parsed;
    try { parsed = new URL(jobUrl); }
    catch { return res.status(400).json({ error: 'The job URL is not valid.', validatorVersion: VALIDATOR_VERSION }); }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https job URLs are supported.', validatorVersion: VALIDATOR_VERSION });
    }

    // Common application-only URLs should not be treated as job descriptions.
    if (/\/careers\/apply(?:\?|$)/i.test(parsed.pathname + parsed.search) || /\/apply(?:\?|$)/i.test(parsed.pathname + parsed.search)) {
      return res.status(422).json({
        error: 'This appears to be an application/redirect link, not the actual job posting. Open the job-detail page and paste that URL, or use Job Description and paste the posting text.',
        stage: 'posting_validation',
        validatorVersion: VALIDATOR_VERSION
      });
    }

    const pageResp = await fetch('https://r.jina.ai/' + jobUrl, { headers: { 'User-Agent': 'CareerStrategyHub/6.0' } });
    if (!pageResp.ok) {
      return res.status(422).json({ error: 'I could not read that job page. Paste the full job description instead.', stage: 'posting_validation', validatorVersion: VALIDATOR_VERSION });
    }
    const jobText = (await pageResp.text()).slice(0, 45000);
    if (!looksLikeRealPosting(jobText)) {
      return res.status(422).json({
        error: 'That link did not resolve to a complete, assessable job posting. It may be an application page, expired role, or redirect. Open the actual job-detail page or paste the full job description instead.',
        stage: 'posting_validation',
        validatorVersion: VALIDATOR_VERSION
      });
    }

    req.body = { ...body, jobUrl, jobDescription: jobText };
    return assess5(req, res);
  } catch (err) {
    return res.status(500).json({ error: 'Posting validation failed: ' + String(err?.message || err), stage: 'posting_validation', validatorVersion: VALIDATOR_VERSION });
  }
}
