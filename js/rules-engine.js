// ==============================================================================
// SchemeMatch AI — Deterministic Eligibility Reverse-Matching Engine
// Evaluates citizen profile against verified criteria without hallucination
// ==============================================================================

export const rulesEngine = {
  /**
   * Evaluates a single scheme against a citizen profile
   * Returns: { status: 'potential_match' | 'needs_information' | 'criteria_not_met', conditions: [...], docGap: [...] }
   */
  evaluateScheme(scheme, profile) {
    const conditions = [];
    let metCount = 0;
    let notMetCount = 0;
    let unknownCount = 0;

    // 1. Domicile Check
    if (scheme.scope && scheme.scope.includes('Maharashtra')) {
      if (profile.domicile_state) {
        if (profile.domicile_state.toLowerCase() === 'maharashtra') {
          conditions.push({
            id: 'domicile',
            label: 'Maharashtra Domicile',
            status: 'met',
            explanation: `Citizen is resident of ${profile.district_taluka || 'Maharashtra'}. Verified via domicile records.`
          });
          metCount++;
        } else {
          conditions.push({
            id: 'domicile',
            label: 'Maharashtra Domicile',
            status: 'not_met',
            explanation: `Scheme is restricted to Maharashtra residents. Current domicile is ${profile.domicile_state}.`
          });
          notMetCount++;
        }
      } else {
        conditions.push({
          id: 'domicile',
          label: 'State Domicile Verification',
          status: 'unknown',
          explanation: 'State domicile is not provided in profile.'
        });
        unknownCount++;
      }
    }

    // 2. Gender Target Check
    if (scheme.gender_target) {
      if (profile.gender) {
        if (profile.gender.toLowerCase() === scheme.gender_target.toLowerCase()) {
          conditions.push({
            id: 'gender',
            label: `Target Gender (${scheme.gender_target})`,
            status: 'met',
            explanation: `Citizen gender matches target demographic requirement (${profile.gender}).`
          });
          metCount++;
        } else {
          conditions.push({
            id: 'gender',
            label: `Target Gender (${scheme.gender_target})`,
            status: 'not_met',
            explanation: `Scheme is exclusively designed for ${scheme.gender_target} beneficiaries.`
          });
          notMetCount++;
        }
      } else {
        conditions.push({
          id: 'gender',
          label: 'Gender Verification',
          status: 'unknown',
          explanation: 'Gender is not specified.'
        });
        unknownCount++;
      }
    }

    // 3. Age Range Check
    if (profile.date_of_birth) {
      const birthYear = new Date(profile.date_of_birth).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      const minOk = scheme.age_min !== null && scheme.age_min !== undefined ? age >= scheme.age_min : true;
      const maxOk = scheme.age_max !== null && scheme.age_max !== undefined ? age <= scheme.age_max : true;

      if (scheme.age_min !== null || scheme.age_max !== null) {
        if (minOk && maxOk) {
          conditions.push({
            id: 'age',
            label: `Age Bracket (${scheme.age_min || 0} to ${scheme.age_max || 'Any'} Yrs)`,
            status: 'met',
            explanation: `Current age is ${age} years, which satisfies scheme requirement.`
          });
          metCount++;
        } else {
          conditions.push({
            id: 'age',
            label: `Age Bracket (${scheme.age_min || 0} to ${scheme.age_max || 'Any'} Yrs)`,
            status: 'not_met',
            explanation: `Current age (${age} yrs) falls outside the eligible age range.`
          });
          notMetCount++;
        }
      }
    } else if (scheme.age_min !== null || scheme.age_max !== null) {
      conditions.push({
        id: 'age',
        label: 'Age Eligibility',
        status: 'unknown',
        explanation: 'Date of birth is not specified.'
      });
      unknownCount++;
    }

    // 4. Family Income Ceiling Check
    if (scheme.income_max !== null && scheme.income_max !== undefined) {
      const income = Number(profile.annual_income);
      if (!isNaN(income) && income > 0) {
        // Special case: Orange/Yellow ration card often exempts or qualifies income
        const isRationCardWaiver = (profile.ration_card_category === 'Orange (APL)' || profile.ration_card_category === 'Yellow (BPL)');
        if (income <= scheme.income_max || isRationCardWaiver) {
          conditions.push({
            id: 'income',
            label: `Annual Income Threshold (≤ ₹${(scheme.income_max / 100000).toFixed(1)}L)`,
            status: 'met',
            explanation: `Declared annual income is ₹${income.toLocaleString('en-IN')}${isRationCardWaiver ? ' (Supported by Orange/Yellow Ration Card)' : ''}.`
          });
          metCount++;
        } else {
          conditions.push({
            id: 'income',
            label: `Annual Income Threshold (≤ ₹${(scheme.income_max / 100000).toFixed(1)}L)`,
            status: 'not_met',
            explanation: `Family income ₹${income.toLocaleString('en-IN')} exceeds the maximum allowed ceiling of ₹${scheme.income_max.toLocaleString('en-IN')}.`
          });
          notMetCount++;
        }
      } else {
        conditions.push({
          id: 'income',
          label: 'Family Income Check',
          status: 'unknown',
          explanation: 'Annual family income is missing or unconfirmed.'
        });
        unknownCount++;
      }
    }

    // 5. Land Holding Check (For agricultural schemes like PM Kisan)
    if (scheme.id === 'pm-kisan') {
      const land = Number(profile.land_holding_acres);
      if (!isNaN(land) && land > 0) {
        conditions.push({
          id: 'land',
          label: 'Cultivable Agricultural Land',
          status: 'met',
          explanation: `Possesses ${land} acres of cultivable agricultural land.`
        });
        metCount++;
      } else {
        conditions.push({
          id: 'land',
          label: 'Cultivable Agricultural Land',
          status: 'not_met',
          explanation: 'Requires registered cultivable agricultural land in revenue records (7/12 extract).'
        });
        notMetCount++;
      }
    }

    // Overall Status Computation
    let overall_status = 'potential_match';
    let status_badge = 'Potential Match';
    let summary_reason = 'All evaluated criteria match your citizen dossier.';

    if (notMetCount > 0) {
      overall_status = 'criteria_not_met';
      status_badge = 'Criteria Not Met';
      summary_reason = `${notMetCount} mandatory condition${notMetCount > 1 ? 's do' : ' does'} not match your profile.`;
    } else if (unknownCount > 0) {
      overall_status = 'needs_information';
      status_badge = 'Needs Confirmation';
      summary_reason = `${unknownCount} condition${unknownCount > 1 ? 's require' : ' requires'} additional details to verify.`;
    }

    // Document Gap Analysis
    const docGap = (scheme.required_documents || []).map(doc => {
      // Determine if citizen likely has the document based on profile
      let ready = false;
      let note = doc.note || '';

      if (doc.name.includes('Aadhaar') && profile.aadhaar_masked) {
        ready = true;
      } else if (doc.name.includes('Domicile') && profile.domicile_state === 'Maharashtra') {
        ready = true;
      } else if (doc.name.includes('Bank') && profile.npci_dbt_active) {
        ready = true;
      } else if (doc.name.includes('Passport') || doc.name.includes('Photo')) {
        ready = true;
      } else if (doc.name.includes('Income') && (profile.ration_card_category === 'Orange (APL)' || profile.ration_card_category === 'Yellow (BPL)')) {
        ready = false;
        note = 'Income certificate (< ₹2.5L) missing, OR Orange Ration card can be used as statutory waiver.';
      }

      return {
        ...doc,
        is_ready: ready,
        status: ready ? 'ready' : (doc.status || 'missing')
      };
    });

    const readyDocs = docGap.filter(d => d.is_ready).length;
    const totalDocs = docGap.length;
    const readinessPct = totalDocs > 0 ? Math.round((readyDocs / totalDocs) * 100) : 100;

    return {
      scheme_id: scheme.id,
      overall_status,
      status_badge,
      summary_reason,
      metCount,
      notMetCount,
      unknownCount,
      conditions,
      docGap,
      readinessPct,
      readyDocs,
      totalDocs
    };
  },

  /**
   * Reverse-matches a natural language query or structured profile against all schemes
   */
  matchAll(schemes, profile, query = '') {
    const q = (query || '').toLowerCase().trim();

    return schemes.map(scheme => {
      const evaluation = this.evaluateScheme(scheme, profile);

      // Relevance multiplier for search query
      let relevance = 50;
      if (evaluation.overall_status === 'potential_match') relevance += 40;
      if (evaluation.overall_status === 'needs_information') relevance += 15;

      if (q) {
        const textToSearch = `${scheme.name} ${scheme.summary} ${scheme.category} ${scheme.department}`.toLowerCase();
        if (textToSearch.includes(q)) relevance += 30;

        // Semantic keyword mappings
        if ((q.includes('farmer') || q.includes('crop') || q.includes('krishi') || q.includes('land')) && scheme.category.includes('Agriculture')) {
          relevance += 40;
        }
        if ((q.includes('woman') || q.includes('women') || q.includes('mother') || q.includes('girl') || q.includes('ladki') || q.includes('mahila')) && (scheme.category.includes('Women') || scheme.gender_target === 'Female')) {
          relevance += 40;
        }
        if ((q.includes('student') || q.includes('college') || q.includes('school') || q.includes('scholarship') || q.includes('education')) && scheme.category.includes('Education')) {
          relevance += 40;
        }
        if ((q.includes('health') || q.includes('medical') || q.includes('hospital') || q.includes('doctor') || q.includes('bimar')) && scheme.category.includes('Health')) {
          relevance += 40;
        }
        if ((q.includes('loan') || q.includes('business') || q.includes('shop') || q.includes('vendor') || q.includes('retailer')) && scheme.category.includes('MSME')) {
          relevance += 40;
        }
      }

      return {
        ...scheme,
        evaluation,
        relevance
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }
};
