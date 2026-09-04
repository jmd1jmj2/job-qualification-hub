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
        headers: { 'User-Agent': 'CareerStrategyHub/4.1' }
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

Full industry and career breadth:
- MANUFACTURING / INDUSTRIAL: More than 10 years working in manufacturing environments, including Amsted Industries, Amsted Rail, Vitro America, and other complex, multi-site, operations-intensive organizations.
- RAIL / TRANSPORTATION EQUIPMENT: Direct experience through Amsted Rail in heavy industrial and rail manufacturing environments.
- AGRICULTURE / AGRIBUSINESS: 6 years working in agriculture through The Maschhoffs, including HRIS work in a large pork-production / food-production organization.
- LIFE SCIENCES / CHEMICALS: Direct experience through Sigma-Aldrich in a life-sciences, laboratory-products, and chemical-products environment.
- FINANCIAL SERVICES / BANKING: Direct prior experience through First Horizon National Corp and an embedded recruiting assignment supporting Edward Jones compliance, investment-representative hiring, and registration functions.
- HIGHER EDUCATION: Direct experience at Briar Cliff University, Kaplan University, and Sanford Brown College in student recruitment/admissions. Approximately two years of direct higher-education experience across traditional, online, and career-focused education models.
- RECRUITING / STAFFING: Direct experience with Professional Employment Group as an HR Staff Recruiter supporting Edward Jones; earlier career included recruiting, screening, interviewing, hiring support, and candidate management.
- HR / RECRUITMENT TECHNOLOGY AND TALENT MARKETPLACE: Direct experience at CareerBuilder in career-fair sales and employer account development, creating first-hand exposure to recruiting technology, employer talent acquisition needs, and B2B customer relationships.
- EARLY CAREER COMMERCIAL / CUSTOMER EXPERIENCE: Admissions, recruiting, career-fair sales, territory recruitment, inside sales, account development, client management, and mentoring experience. These experiences are relevant to strategic customer success, consulting, product, go-to-market, thought leadership, and advisory roles when the job values customer empathy, communication, influence, or commercial understanding.

Operating-environment strengths:
- Frontline and hourly workforce environments.
- Multi-site and geographically distributed operations.
- Manufacturing plants, production workforces, and labor-sensitive operations.
- Payroll, timekeeping, scheduling, attendance, and workforce-management complexity.
- Union and labor-sensitive populations where applicable.
- Safety, compliance, regulatory, and audit-heavy processes.
- Enterprise technology implementation, adoption, governance, and transformation across different business units and workforce types.
- Experience translating between corporate functions and operational environments.

Career positioning:
- This manufacturing, agriculture, life-sciences, financial-services, education, recruiting, and HR-technology background is material career experience, not incidental exposure.
- The candidate has demonstrated the ability to operate successfully across different industries. Cross-industry breadth should generally be treated as evidence of adaptability and transferability, not as instability or lack of specialization.
- Building a visible thought-leadership profile through industry speaking, podcasts, panels, and HR technology conference work.
- Career direction: move AWAY from tactical reporting, system administration, configuration-heavy support, ticket operations, and purely transactional implementation work.
- Career direction: move TOWARD enterprise strategy, business transformation, workforce strategy, HR technology strategy, employee experience strategy, workforce intelligence, future of work, AI strategy/transformation, product strategy, executive advisory, thought leadership, customer transformation, and strategic professional services.
- Current estimated annual employer compensation value: $222,862. Roles around $241K-$256K+ total value are stronger financial upgrades. Below about $200K total value is generally a meaningful step back unless the strategic upside is extraordinary.
- Travel-heavy roles should face a higher compensation and lifestyle bar.

Industry-fit rules:
- Do NOT mark industry as a gap merely because the posting names a sector different from manufacturing, agriculture, life sciences, financial services, education, recruiting, or HR technology.
- First determine whether the posting truly requires hard industry-specific knowledge, credentials, regulatory expertise, licensed practice, or a domain-specific track record that cannot reasonably transfer.
- Manufacturing and agriculture experience should be treated as a meaningful advantage for roles involving enterprise operations, frontline/hourly workforces, labor strategy, workforce management, HR technology, transformation, employee experience, industrial or distributed workforces, change/adoption, multi-site operations, or operational leadership.
- Higher-education experience should be recognized for roles involving education technology, learning, workforce development, student/learner experience, enrollment, customer journeys, or mission-driven education organizations.
- Financial-services exposure should be recognized for roles involving regulated environments, compliance, risk, controls, workforce technology, or enterprise operations in banking/investment organizations.
- CareerBuilder and recruiting/staffing experience should be recognized for roles involving talent acquisition technology, HR tech, recruitment platforms, customer success, product, sales enablement, employer solutions, marketplace models, or consulting.
- Life-sciences / chemicals experience should be recognized as direct regulated-industry exposure, especially where compliance, safety, data, manufacturing, or global operations are relevant.
- If a posting says an industry is "preferred" rather than required, do not treat the absence of that exact industry as a reason to skip the role when the candidate's transferable experience is strong.
- A different-industry role may still be a strong fit when the underlying business problems, workforce environment, transformation scope, customer profile, regulatory environment, or operating model are transferable.
- If industry is a genuine gap, explain exactly why. Do not use vague statements such as "limited industry experience." Specify the missing domain and whether it is learnable or a true blocker.
- Never say the candidate lacks manufacturing, industrial, agriculture, higher-education, financial-services, recruiting/staffing, HR-tech/talent-marketplace, or life-sciences/chemicals exposure when the posting overlaps those areas.

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
- overallFit must equal the weighted score using the six weights above, rounded to the nearest whole number.
- hellYesFactor must be an integer 1-5.
- candidateRelevantIndustries should include only industries actually relevant to the posting, selected from the candidate's documented experience above.
- Do not invent compensation details that are not in the posting. If unavailable, use null and state uncertainty.
- Do not penalize the candidate for lacking an exact industry unless the posting demonstrates that exact industry expertise is materially required and not reasonably transferable.
- When industry or operating-environment experience is transferable, reflect that positively in Qualification Fit and/or Transferability / Differentiation rather than listing it as a weakness.
- Distinguish a true credential/domain blocker from an industry label mismatch.
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
