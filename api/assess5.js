import { generateText } from 'ai';

const ASSESSOR_VERSION = '2026-09-04-v5-industry-verified';

export default async function handler(req, res) {
  let stage = 'request';
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed', assessorVersion: ASSESSOR_VERSION });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const jobUrl = String(body.jobUrl || body.url || '').trim();
    const jobDescription = String(body.jobDescription || body.description || '').trim();
    if (!jobUrl && !jobDescription) return res.status(400).json({ error: 'Provide a job URL or pasted job description.', assessorVersion: ASSESSOR_VERSION });

    let jobText = jobDescription;
    let source = jobDescription ? 'pasted_description' : 'job_url';

    if (!jobText && jobUrl) {
      stage = 'job_page_retrieval';
      let parsed;
      try { parsed = new URL(jobUrl); } catch { return res.status(400).json({ error: 'The job URL is not valid.', assessorVersion: ASSESSOR_VERSION }); }
      if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'Only http/https job URLs are supported.', assessorVersion: ASSESSOR_VERSION });
      const pageResp = await fetch('https://r.jina.ai/' + jobUrl, { headers: { 'User-Agent': 'CareerStrategyHub/5.1' } });
      if (!pageResp.ok) return res.status(422).json({ error: `Job page retrieval failed with status ${pageResp.status}. Paste the job description instead.`, stage, assessorVersion: ASSESSOR_VERSION });
      jobText = (await pageResp.text()).slice(0, 45000);
      if (jobText.length < 200) return res.status(422).json({ error: 'The job page did not return enough readable content. Paste the job description instead.', stage, assessorVersion: ASSESSOR_VERSION });
    }

    stage = 'ai_gateway';
    const systemPrompt = `You are a rigorous career strategy assessor. Evaluate the supplied job against the documented candidate profile. Return ONLY valid JSON, no markdown.

DOCUMENTED CANDIDATE FACTS — THESE ARE VERIFIED FACTS:
- 10+ years of direct manufacturing / industrial experience through Amsted Industries, Amsted Rail, Vitro America, and related operating environments.
- Direct heavy industrial / rail manufacturing experience through Amsted Rail.
- 6 years of direct agriculture / agribusiness experience through The Maschhoffs.
- Direct life sciences / chemicals experience through Sigma-Aldrich.
- Direct financial services / banking exposure through First Horizon National Corp and recruiting support for Edward Jones.
- Direct higher-education experience through Briar Cliff University, Kaplan University, and Sanford Brown College.
- Direct recruiting / staffing experience through Professional Employment Group supporting Edward Jones.
- Direct HR/recruitment technology and employer-marketplace exposure through CareerBuilder.
- Current career: global HRIS / HR technology leadership with enterprise HCM and WFM transformation, UKG Pro, UKG Pro WFM / MyTIME, people analytics, governance, adoption, global operations, compliance, vendor management, integrations, executive partnership, and cross-functional HR/IT/Operations/Payroll leadership.
- Operating environments include frontline/hourly workforces, plants, multi-site operations, payroll, timekeeping, scheduling, attendance, workforce management, labor-sensitive environments, union populations where applicable, safety/compliance/audit-heavy processes, and enterprise transformation.
- Early career includes admissions, recruiting, inside sales, territory management, career-fair sales, client development, customer communication, mentoring, and candidate/student experience.
- Thought leadership includes industry speaking, podcasts, panels, and HR technology conference work.

NON-NEGOTIABLE INDUSTRY LOGIC:
- Manufacturing experience is VERIFIED and SATISFIES a general manufacturing-industry requirement.
- Never say or imply the candidate may lack manufacturing experience, must demonstrate manufacturing experience, or could be screened out for a general manufacturing requirement.
- A manufacturing requirement can only remain a gap if the posting requires a narrow, explicit, non-transferable manufacturing specialty not supported by the profile, such as a specific licensed engineering discipline or specialized technical manufacturing credential.
- If the role is manufacturing, industrial, rail, automotive, aerospace manufacturing, production, or another operations-intensive sector, treat the candidate's manufacturing/industrial background as direct or strongly transferable experience.
- Evaluate functional gaps separately. Employment law, employee relations, labor relations, legal, finance, technical, licensing, or other functional depth may be genuine gaps if the posting clearly requires more than the candidate profile establishes.

CAREER DIRECTION:
Move away from tactical reporting, system administration, configuration-heavy support, ticket operations, purely transactional implementation, and narrow HRIS operations. Move toward enterprise strategy, business transformation, workforce strategy, HR technology strategy, employee experience strategy, workforce intelligence, future of work, AI strategy/transformation, product strategy, executive advisory, thought leadership, customer transformation, and strategic professional services.

COMPENSATION:
Current estimated annual employer value is $222,862. $241K-$256K+ total value is a stronger upgrade. Below about $200K total value is generally a meaningful step back unless strategic upside is extraordinary. Travel-heavy roles face a higher compensation/lifestyle bar.

SCORING WEIGHTS:
Qualification 25%; Strategic Career 25%; Leadership & Scope 15%; Compensation 15%; Transferability/Differentiation 10%; Lifestyle 10%.

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
  "scores": {"qualification": number,"strategicCareer": number,"leadershipScope": number,"compensation": number,"differentiation": number,"lifestyle": number},
  "overallFit": number,
  "recommendation": "Priority Apply"|"Apply"|"Strategic Stretch"|"Selective Apply"|"Deprioritize"|"Skip",
  "worthLeavingFor": "Worth Leaving For"|"Worth Exploring"|"Strong Job, Wrong Direction"|"Financial Step Back"|"Strategic Stretch Worth Taking"|"Not Worth Pursuing",
  "gapSeverity": "Minor"|"Manageable"|"Significant"|"Potential blocker",
  "keyGaps": [string],
  "strongestMatches": [string],
  "transferableExperienceOffsetsGap": "Yes"|"Partially"|"No",
  "industryAssessment": {"candidateRelevantIndustries":[string],"postingIndustry":string|null,"exactIndustryRequired":boolean,"industryFit":"Strong"|"Transferable"|"Partial"|"Gap"|"Unknown","mostRelevantCandidateIndustryExperience":[string],"operatingEnvironmentMatch":"Strong"|"Transferable"|"Partial"|"Gap"|"Unknown","isIndustryARealBarrier":boolean,"notes":string},
  "careerDirection": {"moreStrategic":boolean,"moreExecutiveExposure":boolean,"lessTactical":boolean,"greaterEnterpriseScope":boolean,"buildsFutureMarketValue":boolean,"riskOfOperationalPigeonhole":"Low"|"Medium"|"High"},
  "compensationAssessment": {"estimatedLowTotal":number|null,"estimatedLikelyTotal":number|null,"estimatedStrongTotal":number|null,"financialPosition":"Upgrade"|"Neutral/Negotiation"|"Tradeoff"|"Step Back"|"Unknown","notes":string},
  "careerTrajectory": string,
  "whyWorthIt": string,
  "riskSummary": string,
  "hellYesFactor": number
}

Rules: scores are integers 0-100; overallFit equals the weighted score rounded to nearest integer; hellYesFactor 1-5; do not invent compensation; distinguish industry fit from functional fit; do not penalize a satisfied manufacturing requirement.`;

    const { text } = await generateText({
      model: 'openai/gpt-5.6-sol',
      system: systemPrompt,
      prompt: `Assess this job posting:\n\n${jobText}`,
      providerOptions: { gateway: { disallowPromptTraining: true } }
    });

    stage = 'response_parsing';
    const content = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const assessment = JSON.parse(content);

    // Deterministic correction: the model is not allowed to contradict documented manufacturing history.
    const posting = jobText.toLowerCase();
    const manufacturingRole = /manufactur|industrial|rail|automotive|aerospace|production|plant\b/.test(posting);
    const manufacturingGap = /manufactur(?:ing)?[^.]{0,120}(?:lack|missing|insufficient|demonstrat|prevent|requirement|experience)|(?:lack|missing|insufficient)[^.]{0,120}manufactur/i;

    const cleanManufacturingContradiction = (value) => {
      if (typeof value !== 'string') return value;
      if (!manufacturingGap.test(value)) return value;
      return value
        .replace(/(?:the )?(?:mandatory )?manufacturing requirement may prevent consideration[,;]?\s*/ig, '')
        .replace(/if manufacturing experience can be credibly demonstrated[,;]?\s*/ig, '')
        .replace(/if manufacturing experience can be demonstrated[,;]?\s*/ig, '')
        .replace(/limited manufacturing experience/ig, '10+ years of verified manufacturing experience')
        .replace(/lacks? manufacturing experience/ig, 'has 10+ years of verified manufacturing experience')
        .replace(/insufficient manufacturing experience/ig, '10+ years of verified manufacturing experience');
    };

    assessment.riskSummary = cleanManufacturingContradiction(assessment.riskSummary);
    assessment.whyWorthIt = cleanManufacturingContradiction(assessment.whyWorthIt);
    assessment.careerTrajectory = cleanManufacturingContradiction(assessment.careerTrajectory);
    if (Array.isArray(assessment.keyGaps)) {
      assessment.keyGaps = assessment.keyGaps
        .filter(x => !(manufacturingRole && manufacturingGap.test(String(x))))
        .map(cleanManufacturingContradiction);
    }
    if (Array.isArray(assessment.strongestMatches)) assessment.strongestMatches = assessment.strongestMatches.map(cleanManufacturingContradiction);

    if (manufacturingRole) {
      assessment.industryAssessment = assessment.industryAssessment || {};
      assessment.industryAssessment.industryFit = 'Strong';
      assessment.industryAssessment.operatingEnvironmentMatch = 'Strong';
      assessment.industryAssessment.isIndustryARealBarrier = false;
      assessment.industryAssessment.notes = 'The candidate has 10+ years of verified manufacturing/industrial experience. General manufacturing-industry requirements are satisfied; evaluate any remaining gaps on functional depth, scope, credentials, or role direction.';
      const inds = Array.isArray(assessment.industryAssessment.candidateRelevantIndustries) ? assessment.industryAssessment.candidateRelevantIndustries : [];
      if (!inds.some(x => /manufactur/i.test(String(x)))) inds.unshift('Manufacturing / Industrial (10+ years)');
      assessment.industryAssessment.candidateRelevantIndustries = inds;
      const matches = Array.isArray(assessment.strongestMatches) ? assessment.strongestMatches : [];
      if (!matches.some(x => /10\+ years.*manufactur|manufactur.*10\+ years/i.test(String(x)))) matches.unshift('10+ years of direct manufacturing / industrial experience satisfies the general manufacturing requirement.');
      assessment.strongestMatches = matches;
    }

    return res.status(200).json({ success: true, assessorVersion: ASSESSOR_VERSION, source, jobUrl: jobUrl || null, assessment });
  } catch (err) {
    const message = String(err?.message || err || 'Unknown error');
    console.error(`Assessment failed during ${stage}:`, err);
    return res.status(500).json({ error: `Assessment failed during ${stage}: ${message}`, stage, assessorVersion: ASSESSOR_VERSION });
  }
}
