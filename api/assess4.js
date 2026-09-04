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
    if (!jobUrl && !jobDescription) return res.status(400).json({ error: 'Provide a job URL or pasted job description.' });

    let jobText = jobDescription;
    let source = jobDescription ? 'pasted_description' : 'job_url';

    if (!jobText && jobUrl) {
      stage = 'job_page_retrieval';
      let parsed;
      try { parsed = new URL(jobUrl); } catch { return res.status(400).json({ error: 'The job URL is not valid.' }); }
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http/https job URLs are supported.' });
      const pageResp = await fetch('https://r.jina.ai/' + jobUrl, { headers: { 'User-Agent': 'CareerStrategyHub/5.0' } });
      if (!pageResp.ok) return res.status(422).json({ error: `Job page retrieval failed with status ${pageResp.status}. Paste the job description instead.`, stage });
      jobText = (await pageResp.text()).slice(0, 45000);
      if (jobText.length < 200) return res.status(422).json({ error: 'The job page did not return enough readable content. Paste the job description instead.', stage });
    }

    stage = 'ai_gateway';
    const systemPrompt = `You are a rigorous career strategy assessor. Evaluate the supplied job against the documented candidate profile below. Return ONLY valid JSON and no markdown.

DOCUMENTED CANDIDATE FACTS — TREAT THESE AS TRUE, NOT UNCERTAIN:
- More than 10 years of direct manufacturing / industrial experience.
- Manufacturing employers include Amsted Industries, Amsted Rail, and Vitro America.
- Direct heavy industrial / rail manufacturing experience through Amsted Rail.
- 6 years of direct agriculture / agribusiness experience through The Maschhoffs, a large pork-production / food-production organization.
- Direct life sciences / chemicals experience through Sigma-Aldrich.
- Direct financial services / banking exposure through First Horizon National Corp and recruiting support for Edward Jones.
- Direct higher-education experience through Briar Cliff University, Kaplan University, and Sanford Brown College.
- Direct recruiting / staffing experience through Professional Employment Group supporting Edward Jones.
- Direct HR/recruitment technology and B2B employer-marketplace exposure through CareerBuilder.
- Current career is global HRIS / HR technology leadership with enterprise HCM and WFM transformation, UKG Pro, UKG Pro WFM / MyTIME, people analytics, governance, adoption, global operations, compliance, vendor management, integrations, executive partnership, and cross-functional HR/IT/Operations/Payroll leadership.
- Operating-environment experience includes frontline/hourly workforces, multi-site plants and operations, payroll, timekeeping, scheduling, attendance, workforce management, labor-sensitive environments, union populations where applicable, safety/compliance/audit-heavy processes, and enterprise transformation.
- Early career includes admissions, recruiting, inside sales, territory management, career-fair sales, client development, customer communication, mentoring, and candidate/student experience.
- Thought-leadership profile includes industry speaking, podcasts, panels, and HR technology conference work.

CRITICAL INDUSTRY RULES:
1. Manufacturing experience is VERIFIED. Never state, imply, or condition the recommendation on whether manufacturing experience can be demonstrated.
2. If a posting requires manufacturing experience, that requirement is SATISFIED unless it requires a very narrow manufacturing subdomain with explicit non-transferable expertise not present in the profile.
3. Never use language such as "if manufacturing experience can be demonstrated," "limited manufacturing experience," "lacks manufacturing experience," or "manufacturing requirement may prevent consideration."
4. A manufacturing requirement by itself can NEVER be a blocker for this candidate.
5. Do not mark industry as a gap merely because the posting names a sector different from the candidate's industries. Determine whether the actual business problems, workforce environment, operating model, regulatory context, or transformation scope are transferable.
6. Only treat industry as a genuine blocker when the posting requires hard domain credentials, licensing, specialized regulatory expertise, or a narrow non-transferable track record.
7. If an exact subindustry is not documented, say "transferable industry experience" rather than "industry gap" unless the posting clearly requires exact subindustry expertise.
8. When the candidate has direct industry experience matching the posting, reflect it positively in Qualification Fit and Transferability / Differentiation.

CAREER DIRECTION:
- Move AWAY from tactical reporting, system administration, configuration-heavy support, ticket operations, purely transactional implementation, and narrow HRIS operations roles.
- Move TOWARD enterprise strategy, business transformation, workforce strategy, HR technology strategy, employee experience strategy, workforce intelligence, future of work, AI strategy/transformation, product strategy, executive advisory, thought leadership, customer transformation, and strategic professional services.

COMPENSATION BASELINE:
- Current estimated annual employer value: $222,862.
- $241K-$256K+ total value is a stronger financial upgrade.
- Below about $200K total value is generally a meaningful step back unless strategic upside is extraordinary.
- Travel-heavy roles should face a higher compensation and lifestyle bar.

SCORING MODEL:
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
    "mostRelevantCandidateIndustryExperience": [string],
    "operatingEnvironmentMatch": "Strong"|"Transferable"|"Partial"|"Gap"|"Unknown",
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
- overallFit must equal the weighted score using the six weights above, rounded to nearest whole number.
- hellYesFactor must be integer 1-5.
- Do not invent compensation details.
- A true employment-law, employee-relations, labor-relations, finance, legal, technical, licensing, or other functional gap may still be identified if the posting genuinely requires depth the candidate profile does not establish.
- Do not let a satisfied manufacturing requirement inflate the score excessively; simply treat it as met.
- Be rigorous about whether the role advances the desired strategic direction.

FINAL SELF-CHECK BEFORE RETURNING JSON:
- If any output says or implies manufacturing experience is missing, uncertain, or must be demonstrated, revise it because that contradicts the documented profile.
- If isIndustryARealBarrier=true solely because of a manufacturing requirement, revise it to false.
- If gapSeverity is "Potential blocker" solely because of manufacturing, reduce it appropriately. Other independent blockers may remain.`;

    const { text } = await generateText({
      model: 'openai/gpt-5.6-sol',
      system: systemPrompt,
      prompt: `Assess this job posting:\n\n${jobText}`,
      providerOptions: { gateway: { disallowPromptTraining: true } }
    });

    stage = 'response_parsing';
    const content = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const assessment = JSON.parse(content);

    // Hard guardrail against contradictions in model prose.
    const forbidden = /if manufacturing experience can be|limited manufacturing experience|lacks? manufacturing experience|manufacturing requirement may prevent consideration/ig;
    const fixText = v => typeof v === 'string' ? v.replace(forbidden, 'documented manufacturing experience satisfies the manufacturing requirement') : v;
    assessment.riskSummary = fixText(assessment.riskSummary);
    assessment.whyWorthIt = fixText(assessment.whyWorthIt);
    if (Array.isArray(assessment.keyGaps)) assessment.keyGaps = assessment.keyGaps.map(fixText).filter(x => !/manufacturing experience.*(missing|lack|demonstrat|prevent)/i.test(x));
    if (Array.isArray(assessment.strongestMatches)) assessment.strongestMatches = assessment.strongestMatches.map(fixText);
    if (assessment.industryAssessment) {
      assessment.industryAssessment.notes = fixText(assessment.industryAssessment.notes);
      const p = String(assessment.industryAssessment.postingIndustry || '').toLowerCase();
      const relevant = /manufactur|industrial|rail|automotive|aerospace|production/.test(p + ' ' + jobText.slice(0, 12000).toLowerCase());
      if (relevant) {
        assessment.industryAssessment.industryFit = assessment.industryAssessment.industryFit === 'Gap' ? 'Strong' : assessment.industryAssessment.industryFit;
        assessment.industryAssessment.isIndustryARealBarrier = false;
        const inds = Array.isArray(assessment.industryAssessment.candidateRelevantIndustries) ? assessment.industryAssessment.candidateRelevantIndustries : [];
        if (!inds.some(x => /manufactur/i.test(x))) inds.unshift('Manufacturing / Industrial (10+ years)');
        assessment.industryAssessment.candidateRelevantIndustries = inds;
      }
    }

    return res.status(200).json({ success: true, source, jobUrl: jobUrl || null, assessment });
  } catch (err) {
    const message = String(err?.message || err || 'Unknown error');
    console.error(`Assessment failed during ${stage}:`, err);
    return res.status(500).json({ error: `Assessment failed during ${stage}: ${message}`, stage });
  }
}
