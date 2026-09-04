import { generateText } from 'ai';

export default async function handler(req, res) {
  let stage = 'request';
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const jobUrl = String(body.jobUrl || body.url || '').trim();
    const jobDescription = String(body.jobDescription || body.description || '').trim();

    if (!jobUrl && !jobDescription) {
      return res.status(400).json({ error: 'Provide a job URL or pasted job description.' });
    }

    let jobText = jobDescription;
    let source = jobDescription ? 'pasted_description' : 'job_url';

    if (!jobText && jobUrl) {
      stage = 'job_page_retrieval';
      let parsed;
      try { parsed = new URL(jobUrl); }
      catch { return res.status(400).json({ error: 'The job URL is not valid.' }); }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'Only http/https job URLs are supported.' });
      }

      const pageResp = await fetch('https://r.jina.ai/' + jobUrl, {
        headers: { 'User-Agent': 'CareerStrategyHub/4.0' }
      });

      if (!pageResp.ok) {
        return res.status(422).json({
          error: `Job page retrieval failed with status ${pageResp.status}. Paste the job description instead.`,
          stage
        });
      }

      jobText = (await pageResp.text()).slice(0, 45000);
      if (jobText.length < 200) {
        return res.status(422).json({
          error: 'The job page did not return enough readable content. Paste the job description instead.',
          stage
        });
      }
    }

    stage = 'ai_gateway';
    const systemPrompt = `You are a career strategy assessor. Evaluate the supplied job against this candidate profile and return ONLY valid JSON, no markdown.

Candidate profile:
- Global HRIS / HR technology operations leader with enterprise HCM and WFM transformation experience.
- Deep UKG Pro and UKG Pro WFM / MyTIME experience, plus people analytics, governance, adoption, global operations, and cross-functional HR/IT/Operations/Payroll leadership.
- Experienced in enterprise implementation, change governance, operating models, executive business partnership, customer/practitioner perspective, and complex multi-business/global environments.
- INDUSTRY EXPERIENCE: More than 10 years working in manufacturing environments, including complex, multi-site, operations-intensive organizations and workforce populations.
- INDUSTRY EXPERIENCE: 6 years working in agriculture.
- This manufacturing and agriculture background is material career experience, not incidental exposure. It gives the candidate direct familiarity with frontline/hourly workforces, operational environments, workforce management, labor-sensitive processes, adoption challenges, business-unit variation, and technology implementation in operational settings.
- Building a visible thought-leadership profile through industry speaking, podcasts, panels, and HR technology conference work.
- Career direction: move AWAY from tactical reporting, system administration, configuration-heavy support, ticket operations, and purely transactional implementation work.
- Career direction: move TOWARD enterprise strategy, business transformation, workforce strategy, HR technology strategy, employee experience strategy, workforce intelligence, future of work, AI strategy/transformation, product strategy, executive advisory, thought leadership, customer transformation, and strategic professional services.
- Current estimated annual employer compensation value: $222,862. Roles around $241K-$256K+ total value are stronger financial upgrades. Below about $200K total value is generally a meaningful step back unless the strategic upside is extraordinary.
- Travel-heavy roles should face a higher compensation and lifestyle bar.

Industry-fit rules:
- Do NOT mark industry as a gap merely because the posting names a sector different from manufacturing or agriculture.
- First determine whether the posting truly requires hard industry-specific knowledge, credentials, regulatory expertise, licensed practice, or a domain-specific track record that cannot reasonably transfer.
- Manufacturing and agriculture experience should be treated as a meaningful advantage for roles involving enterprise operations, frontline/hourly workforces, labor strategy, workforce management, HR technology, transformation, employee experience, industrial or distributed workforces, change/adoption, multi-site operations, or operational leadership.
- If a posting says an industry is "preferred" rather than required, do not treat the absence of that exact industry as a reason to skip the role when the candidate's transferable experience is strong.
- A different-industry role may still be a strong fit when the underlying business problems, workforce environment, transformation scope, customer profile, or operating model are transferable.
- If industry is a genuine gap, explain exactly why. Do not use vague statements such as "limited industry experience." Specify the missing domain and whether it is learnable or a true blocker.
- Never say the candidate lacks manufacturing experience or operations-intensive industry experience.

Scoring model and weights:
1. Qualification Fit 25%
2. Strategic Career Fit 25%
3. Leadership & Scope Fit 15%
4. Compensation Fit 15%
5. Transferability / Differentiation 10%
6. Lifestyle / Practical Fit 10%

Return exactly this JSON shape:
{
  "roleTitle": string|null,
  "company": string|null,
  "location": string|null,
  "workStyle": string|null,
  "travelPercent": number|null,
  "publishedBaseMin": number|null,
  "publishedBaseMax": number|null,
  "targetBonusPercent": number|null,
  "equityOrRsuEstimate": number|null,
  "scores": {
    "qualification": number,
    "strategicCareer": number,
    "leadershipScope": number,
    "compensation": number,
    "differentiation": number,
    "lifestyle": number
  },
  "overallFit": number,
  "recommendation": "Priority Apply"|"Apply"|"Strategic Stretch"|"Selective Apply"|"Deprioritize"|"Skip",
  "worthLeavingFor": "Worth Leaving For"|"Worth Exploring"|"Strong Job, Wrong Direction"|"Financial Step Back"|"Strategic Stretch Worth Taking"|"Not Worth Pursuing",
  "gapSeverity": "Minor"|"Manageable"|"Significant"|"Potential blocker",
  "keyGaps": [string],
  "strongestMatches": [string],
  "transferableExperienceOffsetsGap": "Yes"|"Partially"|"No",
  "industryAssessment": {
    "candidateRelevantIndustries": [string],
    "postingIndustry": string|null,
    "exactIndustryRequired": boolean,
    "industryFit": "Strong"|"Transferable"|"Partial"|"Gap"|"Unknown",
    "manufacturingRelevance": string,
    "agricultureRelevance": string,
    "isIndustryARealBarrier": boolean,
    "notes": string
  },
  "careerDirection": {
    "moreStrategic": boolean,
    "moreExecutiveExposure": boolean,
    "lessTactical": boolean,
    "greaterEnterpriseScope": boolean,
    "buildsFutureMarketValue": boolean,
    "riskOfOperationalPigeonhole": "Low"|"Medium"|"High"
  },
  "compensationAssessment": {
    "estimatedLowTotal": number|null,
    "estimatedLikelyTotal": number|null,
    "estimatedStrongTotal": number|null,
    "financialPosition": "Upgrade"|"Neutral/Negotiation"|"Tradeoff"|"Step Back"|"Unknown",
    "notes": string
  },
  "careerTrajectory": string,
  "whyWorthIt": string,
  "riskSummary": string,
  "hellYesFactor": number
}

Rules:
- Scores must be integers 0-100.
- overallFit must equal the weighted score using the six weights above, rounded to the nearest whole number.
- hellYesFactor must be an integer 1-5.
- candidateRelevantIndustries must include "Manufacturing (10+ years)" and "Agriculture (6 years)".
- Do not invent compensation details that are not in the posting. If unavailable, use null and state uncertainty.
- Do not penalize the candidate for lacking an exact industry unless the posting demonstrates that exact industry expertise is materially required and not reasonably transferable.
- When industry experience is transferable, reflect that positively in Qualification Fit and/or Transferability / Differentiation rather than listing it as a weakness.
- Be rigorous. A role should not score highly simply because the candidate is qualified; it must also advance the desired strategic career direction.`;

    const { text } = await generateText({
      model: 'openai/gpt-5.6-sol',
      system: systemPrompt,
      prompt: `Assess this job posting:\n\n${jobText}`,
      providerOptions: { gateway: { disallowPromptTraining: true } }
    });

    stage = 'response_parsing';
    const content = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const assessment = JSON.parse(content);

    return res.status(200).json({ success: true, source, jobUrl: jobUrl || null, assessment });
  } catch (err) {
    const message = String(err?.message || err || 'Unknown error');
    console.error(`Assessment failed during ${stage}:`, err);
    return res.status(500).json({
      error: `Assessment failed during ${stage}: ${message}`,
      stage
    });
  }
}
