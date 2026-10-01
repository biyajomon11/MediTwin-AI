import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official Hospital Procedures & SOPs into PostgreSQL...');

  // 1. Ensure Hospital 1 and Hospital 2 exist
  const hospital1 = await prisma.hospital.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'MediTwin Central Hospital',
      address: '100 Medical Centre Boulevard',
      city: 'Kochi',
      state: 'Kerala',
      phone: '+91 484 288 9000',
      email: 'info@meditwin-hospital.org',
    },
  });

  const hospital2 = await prisma.hospital.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'St. Jude Memorial Hospital',
      address: '500 Health Way',
      city: 'Ernakulam',
      state: 'Kerala',
      phone: '+91 484 299 1111',
      email: 'info@stjude-hospital.org',
    },
  });

  // Ensure Departments for Hospital 1
  const deptGeneralMed = await prisma.department.findFirst({
    where: { hospitalId: 1, name: { contains: 'General Medicine' } },
  });

  const deptCardiology = await prisma.department.findFirst({
    where: { hospitalId: 1, name: { contains: 'Cardiology' } },
  });

  const deptOrthopedics = await prisma.department.findFirst({
    where: { hospitalId: 2, name: { contains: 'Orthopedics' } },
  });

  // 2. Define Procedures
  const proceduresData = [
    {
      procedureCode: 'SOP-INF-001',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Hand Hygiene & Aseptic Non-Touch Technique (ANTT)',
      category: 'Infection Control',
      description: 'Standard operating procedure detailing the WHO 5 Moments of Hand Hygiene and Standard Aseptic Non-Touch Technique across all inpatient wards.',
      purpose: 'To minimize the risk of healthcare-associated infections (HCAIs) and prevent cross-transmission of multidrug-resistant pathogens through systematic compliance with hand hygiene and aseptic barriers.',
      scope: 'Applicable to all registered nurses, clinical assistants, physicians, and medical interns across all wards, ICU, and clinical departments of MediTwin Central Hospital.',
      responsibilities: 'All clinical staff performing direct patient touch or sterile field procedures are responsible for adherence. Ward charge nurses are responsible for periodic compliance audits.',
      requiredEquipment: 'Hospital-grade alcohol-based hand rub (ABHR, 70% ethyl alcohol), antimicrobial chlorhexidine gluconate skin scrub, sterile and non-sterile nitrile gloves, sterile drapes, disposable apron, yellow biohazard waste bin.',
      procedureSteps: [
        { stepNumber: 1, title: 'Moment 1: Before Touching a Patient', instruction: 'Perform hand rub with at least 3 mL of alcohol-based hand rub for 20-30 seconds, covering palms, backs of hands, interdigital spaces, and wrists before physical contact.', rationale: 'Prevents colonisation of patient with external flora.' },
        { stepNumber: 2, title: 'Moment 2: Before Clean / Aseptic Procedure', instruction: 'Perform hand rub or hand wash immediately prior to accessing vascular lines, performing wound dressings, catheter insertion, or administering IV injections.', rationale: 'Prevents transmission of microorganisms into susceptible body sites.' },
        { stepNumber: 3, title: 'Moment 3: After Body Fluid Exposure Risk', instruction: 'Remove gloves, dispose into biohazard waste, and wash hands thoroughly with soap and running water for at least 40-60 seconds, followed by drying with single-use paper towels.', rationale: 'Reduces microbial burden following organic contamination.' },
        { stepNumber: 4, title: 'Moment 4: After Touching a Patient', instruction: 'Perform hand hygiene immediately upon leaving the patient bed space after physical examination, vital signs measurement, or bed-making.', rationale: 'Protects the hospital environment and adjacent healthcare workers.' },
        { stepNumber: 5, title: 'Moment 5: After Touching Patient Surroundings', instruction: 'Clean hands with ABHR after touching monitors, infusion pumps, bedrails, or bed tables, even if the patient was not touched.', rationale: 'Surfaces within the patient zone are frequently contaminated with pathogens.' }
      ],
      safetyPrecautions: 'Ensure skin integrity; report eczema or glove allergies to Occupational Health. Artificial fingernails and jewelry (except plain wedding band) are strictly prohibited in clinical units.',
      documentationReq: 'Record hand hygiene audit checks in the monthly Ward Infection Control Log. Document any patient-specific barrier isolation precautions in the electronic health record.',
      escalationSteps: 'Report recurrent supply shortages (ABHR dispensers) to the Infection Prevention Control Nurse immediately. Document any breach during invasive procedures and report as an adverse clinical incident.',
      references: 'WHO Guidelines on Hand Hygiene in Health Care (2009); CDC Guideline for Hand Hygiene in Healthcare Settings; National Infection Prevention and Control Manual.',
      version: '2.3',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-15'),
      reviewDate: new Date('2027-01-15'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-INF-001-Hand-Hygiene.pdf',
    },
    {
      procedureCode: 'SOP-MED-002',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'High-Alert Medication Administration & Dual-Nurse Verification',
      category: 'Medication Safety',
      description: 'Protocol governing the safe prescription checking, preparation, dual independent verification, and administration of high-alert medications (e.g. Concentrated Electrolytes, Insulins, Anticoagulants, Opioids).',
      purpose: 'To prevent medication errors involving drugs with a heightened risk of causing significant patient harm when used in error (PINCH: Potassium, Insulin, Narcotics, Chemotherapy, Heparin).',
      scope: 'Mandatory for all registered nurses administering parenteral, subcutaneous, or high-potency oral medications across all adult, pediatric, and intensive care units.',
      responsibilities: 'The primary administering nurse and a second independent registered nurse must both review the physician order, patient barcode, vial label, dosage calculation, and infusion pump parameters.',
      requiredEquipment: 'Doctor prescription sheet / e-MAR, electronic barcode scanner, calibrated infusion pump / syringe driver, verified patient ID wristband, filter needles, sterile alcohol wipes.',
      procedureSteps: [
        { stepNumber: 1, title: 'Physician Order Verification', instruction: 'Verify the medication order in e-MAR: drug name, dose, route, frequency, indication, valid prescriber signature, and patient allergy status.', rationale: 'Eliminates prescribing misinterpretations before preparation.' },
        { stepNumber: 2, title: 'Independent Double-Check Calculation', instruction: 'Both nurses must independently calculate the infusion rate (mL/hr) or bolus volume without sharing answers prior to comparison.', rationale: 'Prevents calculation bias and cognitive confirmation errors.' },
        { stepNumber: 3, title: 'Bedside Patient Identification', instruction: 'Scan patient identification wristband and ask patient to state their full name and date of birth. Confirm matching MRN with e-MAR.', rationale: 'Prevents wrong-patient medication administration.' },
        { stepNumber: 4, title: 'Pump Programming & Line Tracing', instruction: 'Trace the infusion line from the solution bag through the pump chamber to the vascular access site before pressing start on the infusion device.', rationale: 'Prevents line crossover and inadvertent free-flow.' },
        { stepNumber: 5, title: 'Dual Sign-Off & Monitoring', instruction: 'Both nurses co-sign the administration record with their registration numbers. Monitor vitals per high-alert drug schedule.', rationale: 'Provides regulatory traceability and early detection of adverse effects.' }
      ],
      safetyPrecautions: 'Concentrated potassium chloride ampoules must NEVER be stored in open ward stocks. Insulin must only be measured using dedicated U-100 insulin syringes.',
      documentationReq: 'Electronic medication administration record (e-MAR) dual signatures, batch numbers, expiry dates, site of administration, and pre/post vitals.',
      escalationSteps: 'If an error or suspected adverse drug reaction occurs, cease infusion immediately, preserve drug delivery apparatus, notify attending physician and pharmacy within 15 minutes, and log a Pharmacovigilance incident report.',
      references: 'Institute for Safe Medication Practices (ISMP) High-Alert Medications in Acute Care Settings; Joint Commission National Patient Safety Goals.',
      version: '3.1',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-02-01'),
      reviewDate: new Date('2027-02-01'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-MED-002-High-Alert-Meds.pdf',
    },
    {
      procedureCode: 'SOP-EMERG-003',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Inpatient Rapid Response Team (RRT) & Code Blue Pathway',
      category: 'Emergency Procedures',
      description: 'Standard procedure for early recognition of deteriorating ward inpatients, calling the Medical Emergency Team / RRT, and initiating Basic Life Support (BLS) resuscitation.',
      purpose: 'To provide immediate, expert resuscitative intervention for inpatients experiencing unexpected clinical deterioration or cardiopulmonary arrest.',
      scope: 'Applies hospital-wide to all inpatient wards, procedural suites, outpatient clinics, and diagnostic departments.',
      responsibilities: 'First responding nurse initiates primary assessment, calls for assistance, activates emergency bell, and initiates BLS. Second nurse dials 2222 for Code Blue / RRT broadcast and brings the emergency crash cart.',
      requiredEquipment: 'Ward crash cart with defibrillator / AED, suction unit, bag-valve-mask (Ambu bag) with reservoir and high-flow oxygen, oxygen flowmeter, emergency airway box, IV cannulation kit, emergency drugs (Adrenaline 1:10,000, Atropine, Amiodarone).',
      procedureSteps: [
        { stepNumber: 1, title: 'Trigger Assessment (NEWS2 / Red Flag)', instruction: 'Check for unresponsiveness, respiratory rate < 8 or > 30, systolic BP < 90 mmHg, HR < 40 or > 130, or acute drop in Glasgow Coma Scale > 2 points.', rationale: 'Allows preemptive intervention before irreversible arrest.' },
        { stepNumber: 2, title: 'Activation Call (Code Blue / RRT)', instruction: 'Dial internal emergency extension 2222. State clearly: "Code Blue / RRT, Ward [Name], Bed [Number], Patient [Age/Gender]". Keep line open until operator repeats back.', rationale: 'Mobilizes ICU physician, anaesthetic fellow, and senior resuscitation nurses within 3 minutes.' },
        { stepNumber: 3, title: 'Airway & Circulation Initiation (CAB)', instruction: 'Check carotid pulse for max 10 seconds. If absent or gasping, place cardiac arrest board under patient, start chest compressions at 100-120 bpm, depth 5-6 cm.', rationale: 'Maintains cerebral and myocardial perfusion.' },
        { stepNumber: 4, title: 'Defibrillator Pad Placement', instruction: 'Attach AED/defibrillator multifunction pads: right infraclavicular and left anterolateral mid-axillary. Follow rhythm analysis.', rationale: 'Early defibrillation of shockable rhythms (VF/pVT) is the key determinant of survival.' },
        { stepNumber: 5, title: 'Structured Shift Handoff to RRT Lead', instruction: 'Deliver concise ISBAR briefing (Identification, Situation, Background, Assessment, Recommendation) to the arriving Critical Care team leader.', rationale: 'Ensures seamless crisis handoff and uninterrupted resuscitation.' }
      ],
      safetyPrecautions: 'Ensure "ALL CLEAR" command before delivering any electrical shock. Maintain continuous oxygenation; avoid hyperventilation (maximum 10 breaths/min during CPR).',
      documentationReq: 'Official Hospital Cardiac Arrest / RRT Documentation Record, defibrillator summary printout, defibrillator shock log, and post-event debriefing notes.',
      escalationSteps: 'Upon stabilization, transfer patient to Intensive Care Unit (ICU) under continuous monitoring with ICU escort team.',
      references: 'American Heart Association (AHA) Advanced Cardiovascular Life Support (ACLS) Guidelines; Resuscitation Council UK In-hospital Resuscitation Standards.',
      version: '4.0',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-01'),
      reviewDate: new Date('2026-12-31'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-EMERG-003-RRT-Code-Blue.pdf',
    },
    {
      procedureCode: 'SOP-NUR-004',
      hospitalId: hospital1.id,
      departmentId: deptGeneralMed?.id || 2,
      title: 'Peripheral Intravenous Catheter (PIVC) Insertion & Phlebitis Scoring',
      category: 'Nursing Procedures',
      description: 'Clinical standard operating procedure for the aseptic insertion, securement, maintenance, flushing, and routine surveillance of peripheral venous access devices.',
      purpose: 'To ensure safe vascular access for medication and fluid administration while minimizing thrombophlebitis, extravasation, and catheter-related bloodstream infections (CRBSI).',
      scope: 'Registered nurses credentialed in peripheral vascular cannulation deployed to General Medicine and Medical Wards.',
      responsibilities: 'Duty nurses are responsible for clinical insertion, daily site inspection, VIP (Visual Infusion Phlebitis) scoring every shift, and routine cannula replacement per clinical indication.',
      requiredEquipment: 'Appropriate gauge safety IV cannula (20G/22G/18G), tourniquet, chlorhexidine 2% in 70% isopropyl alcohol applicator, sterile transparent semi-permeable dressing, extension set with needleless connector, pre-filled 10 mL 0.9% sodium chloride flush, non-sterile gloves, sharps container.',
      procedureSteps: [
        { stepNumber: 1, title: 'Patient Preparation & Vein Selection', instruction: 'Explain procedure, obtain verbal consent. Apply tourniquet 10-15 cm above intended site. Select straight, resilient vein in forearm or hand, avoiding flexion creases.', rationale: 'Preserves vein longevity and minimizes mechanical phlebitis.' },
        { stepNumber: 2, title: 'Skin Antisepsis', instruction: 'Disinfect skin using 2% chlorhexidine in 70% alcohol using back-and-forth friction for 30 seconds. Allow to air-dry completely for 60 seconds. DO NOT palpate vein after disinfection.', rationale: 'Antiseptic requires complete evaporation to exert maximum antimicrobial effect.' },
        { stepNumber: 3, title: 'Aseptic Cannulation', instruction: 'Anchor vein gently. Insert cannula at 15-30 degree angle bevel up. Observe flashback in chamber. Lower angle, advance 2 mm, then slide cannula sheath into vein while holding needle stationary.', rationale: 'Ensures cannula lumen is fully within venous blood flow before advancing.' },
        { stepNumber: 4, title: 'Flushing & Securement', instruction: 'Release tourniquet, apply digital pressure at vein tip, retract needle into safety shield, dispose directly into sharps bin. Attach primed extension set and flush using push-pause technique.', rationale: 'Confirms patency, clears intraluminal fibrin, and eliminates sharps injury risk.' },
        { stepNumber: 5, title: 'Dressing & Labeling', instruction: 'Cover insertion site with sterile transparent dressing. Label with date, time, gauge, and nurse initials. Document insertion in clinical chart.', rationale: 'Provides visual monitoring of site and establishes audit trail for dwell time.' }
      ],
      safetyPrecautions: 'Never reinsert needle into catheter. Maximum 2 attempts per clinician; if unsuccessful, seek assistance from senior vascular access nurse.',
      documentationReq: 'Date, time, anatomical site, gauge, number of attempts, flush ease, dressing type, and shift VIP score in nursing notes.',
      escalationSteps: 'If VIP score is >= 2 (pain, erythema, swelling) or extravasation occurs, remove catheter immediately, apply warm/cool compress per protocol, elevate limb, and notify attending doctor.',
      references: 'Infusion Nurses Society (INS) Standards of Practice; CDC Guidelines for the Prevention of Intravascular Catheter-Related Infections.',
      version: '2.0',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-03-10'),
      reviewDate: new Date('2027-03-10'),
      isMandatory: false,
      downloadUrl: '/documents/sops/SOP-NUR-004-PIVC-Cannulation.pdf',
    },
    {
      procedureCode: 'SOP-CARD-005',
      hospitalId: hospital1.id,
      departmentId: deptCardiology?.id || 1,
      title: 'Continuous Cardiac Telemetry Monitoring & Arrhythmia Escalation',
      category: 'Clinical Care',
      description: 'Departmental operational procedure governing electrode placement, continuous ECG waveform surveillance, alarm limit customization, and arrhythmia notification protocols.',
      purpose: 'To ensure continuous, artifact-free cardiac surveillance for patients at risk of arrhythmias, ischemia, or QT prolongation, and facilitate rapid clinical escalation.',
      scope: 'Cardiology Ward, Coronary Care Unit (CCU), and Step-down Telemetry units of MediTwin Central Hospital.',
      responsibilities: 'Telemetry-credentialed nurses are responsible for lead application, baseline rhythm strip analysis, alarm threshold verification, and immediate communication of malignant arrhythmias to the cardiologist.',
      requiredEquipment: '5-lead wireless telemetry transmitter, new telemetry pouch, hypoallergenic ECG electrodes, skin prep abrasive pads, clean hospital telemetry monitor console, spare AA batteries.',
      procedureSteps: [
        { stepNumber: 1, title: 'Skin Preparation & 5-Lead Placement', instruction: 'Clean skin with dry gauze. Apply 5 leads per color-code: RA (White - right infraclavicular), LA (Black - left infraclavicular), RL (Green - right lower abdomen), LL (Red - left lower abdomen), V1 (Brown - 4th intercostal space right sternal border).', rationale: 'Minimizes impedance and movement artifact for accurate waveform interpretation.' },
        { stepNumber: 2, title: 'Transmitter Pairing & Baseline Strip', instruction: 'Insert fresh batteries, pair transmitter with central nursing station monitor. Print and measure baseline PR interval, QRS duration, and QTc interval.', rationale: 'Provides patient-specific comparative reference for subsequent telemetry shifts.' },
        { stepNumber: 3, title: 'Alarm Limit Individualization', instruction: 'Adjust high and low heart rate thresholds according to physician orders (default 50-120 bpm). Ensure lethal arrhythmia alarms (VF, VT, Asystole) cannot be muted.', rationale: 'Prevents alarm fatigue while preserving life-threatening alert triggers.' },
        { stepNumber: 4, title: 'Continuous Surveillance & Daily Lead Care', instruction: 'Replace electrodes every 48 hours or when signal quality drops below 80%. Inspect underlying skin for contact dermatitis.', rationale: 'Maintains conductive gel hydration and prevents cutaneous injury.' },
        { stepNumber: 5, title: 'Arrhythmia Escalation Trigger', instruction: 'For sustained VT, Ventricular Fibrillation, Asystole, Complete Heart Block, or Pauses > 3 sec: initiate immediate bedside evaluation and call cardiology registrar.', rationale: 'Enables rapid antiarrhythmic or pacing intervention.' }
      ],
      safetyPrecautions: 'Never disconnect telemetry for patient showering without prior medical authorization. Do not place electrodes over pacemaker or ICD generator pockets.',
      documentationReq: 'Print and sign an 8-hour rhythm strip at the start of each shift. Document rhythm, rate, PR, QRS, and QTc in the Telemetry Surveillance Log.',
      escalationSteps: 'Malignant arrhythmias: call Code Blue immediately, place defibrillator pads. Non-sustained arrhythmias (e.g. new atrial fibrillation): notify attending cardiologist within 30 minutes.',
      references: 'AHA/ACC Scientific Statement on Practice Standards for Electrocardiographic Monitoring in Hospital Settings.',
      version: '1.5',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-02-15'),
      reviewDate: new Date('2027-02-15'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-CARD-005-Telemetry-Monitoring.pdf',
    },
    {
      procedureCode: 'SOP-SAF-006',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Inpatient Fall Risk Screening (Morse Fall Scale) & Prevention Bundles',
      category: 'Patient Safety',
      description: 'Comprehensive hospital safety standard defining inpatient fall risk screening upon admission and post-event, universal fall prevention measures, and targeted high-risk interventions.',
      purpose: 'To proactively identify inpatients vulnerable to accidental or physiological falls and implement structured multi-factorial safety bundles to eliminate preventable hospital injuries.',
      scope: 'Mandatory across all adult medical, surgical, geriatric, and specialty inpatient wards of MediTwin Central Hospital.',
      responsibilities: 'Admitting and duty nurses perform Morse Fall Scale assessment on admission, after any ward transfer, following medication changes affecting gait, and post-fall.',
      requiredEquipment: 'Morse Fall Scale assessment tool in EHR, high-visibility yellow non-skid socks, yellow fall-risk patient wristband, low-height hospital bed with floor mat, call bell cord, bed-exit alarm sensor pad.',
      procedureSteps: [
        { stepNumber: 1, title: 'Initial Screening within 2 Hours of Admission', instruction: 'Score the 6 Morse Scale variables: History of falling (0/25), Secondary diagnosis (0/15), Ambulatory aid (0/15/30), IV/Saline lock (0/20), Gait/transferring (0/10/20), Mental status (0/15).', rationale: 'Categorizes patient into Low (0-24), Medium (25-44), or High (>=45) fall risk category.' },
        { stepNumber: 2, title: 'Universal Environmental Safety Measures', instruction: 'Keep bed at lowest level, lock bed wheels, maintain clear walkway free from clutter and wet patches, position call bell within easy reach, and ensure adequate night lighting.', rationale: 'Removes physical environmental hazards responsible for the majority of ward falls.' },
        { stepNumber: 3, title: 'High-Risk Targeted Interventions (Score >= 45)', instruction: 'Apply yellow risk wristband and yellow non-skid socks. Activate bed-exit pressure sensor alarm. Place patient in bed close to nursing station. Implement 1-hour intentional rounding.', rationale: 'Alerts all multidisciplinary team members and provides prompt assistance with toileting.' },
        { stepNumber: 4, title: 'Assisted Mobilization & Toileting Protocol', instruction: 'Do not allow high-risk patients to ambulate or toilet unaccompanied. Accompany patient and remain at arm’s length during transfers.', rationale: 'Over 65% of inpatient falls occur during unassisted transfers to the bathroom.' },
        { stepNumber: 5, title: 'Post-Fall Medical Assessment', instruction: 'If a fall occurs: DO NOT move patient until assessing for head injury, spinal pain, or limb deformity. Check vitals and GCS. Notify doctor for physical exam before transfer.', rationale: 'Prevents exacerbation of occult fractures or cervical spine injuries.' }
      ],
      safetyPrecautions: 'Ensure physical restraints are never used as a substitute for fall prevention; restraint requires specific medical justification and hourly charting.',
      documentationReq: 'Document Morse score every 24 hours, post-fall evaluation form, incident notification report in electronic safety management system.',
      escalationSteps: 'Following any fall with suspected fracture or head injury, arrange urgent portable X-ray / CT head and notify Risk Management department.',
      references: 'Agency for Healthcare Research and Quality (AHRQ) Falls Management Program; Joint Commission Sentinel Event Alert on Preventing Falls.',
      version: '2.2',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-20'),
      reviewDate: new Date('2027-01-20'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-SAF-006-Fall-Prevention.pdf',
    },
    {
      procedureCode: 'SOP-WND-007',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Aseptic Surgical Dressing & Negative Pressure Wound Therapy (NPWT)',
      category: 'Wound Care',
      description: 'Protocol governing sterile wound dressing changes, assessment of surgical incisions, detection of surgical site infections (SSI), and care of vacuum-assisted wound closures.',
      purpose: 'To optimize the physiological wound healing environment, maintain sterility, and prevent surgical wound dehiscence or nosocomial infection.',
      scope: 'All registered nurses managing postoperative and chronic open wounds across surgical and general hospital units.',
      responsibilities: 'Nurses evaluate wound bed tissue (granulation, slough, necrosis), drainage quantity/type, clean with sterile 0.9% NaCl, and apply prescribed specialized dressings.',
      requiredEquipment: 'Sterile dressing pack, sterile scissors/forceps, sterile saline 0.9%, chlorhexidine solution, hydrocolloid/foam dressing, NPWT foam kit with vacuum canister, skin barrier film, tape measure.',
      procedureSteps: [
        { stepNumber: 1, title: 'Aseptic Field Setup & Pain Assessment', instruction: 'Administer prescribed analgesia 30 minutes prior if required. Clean dressing trolley with detergent wipe. Open sterile pack maintaining 2.5 cm sterile border.', rationale: 'Patient comfort and strict asepsis are essential for compliance and infection prevention.' },
        { stepNumber: 2, title: 'Removal of Old Dressing', instruction: 'Don clean gloves, gently remove old dressing in direction of hair growth using adhesive remover wipe. Inspect soiled dressing for exudate color, purulence, and odor.', rationale: 'Provides diagnostic information regarding bacterial bioburden and tissue perfusion.' },
        { stepNumber: 3, title: 'Wound Bed Cleansing & Assessment', instruction: 'Perform hand hygiene, don sterile gloves. Clean wound from cleanest to dirtiest area using sterile gauze soaked in 0.9% NaCl. Measure length, width, depth, and inspect edges.', rationale: 'Prevents retrograde contamination of healthy granulating wound bed.' },
        { stepNumber: 4, title: 'Application of Therapeutic Dressing', instruction: 'Apply prescribed primary dressing (e.g. silver alginate or NPWT foam sponge). Cover with waterproof secondary dressing ensuring airtight seal.', rationale: 'Maintains optimal moist wound healing balance while protecting from external fluid.' },
        { stepNumber: 5, title: 'NPWT Activation (If Applicable)', instruction: 'Connect tubing to canister. Activate vacuum pump at prescribed pressure (default -125 mmHg continuous). Confirm foam collapses uniformly.', rationale: 'Verifies intact vacuum seal and active subatmospheric exudate extraction.' }
      ],
      safetyPrecautions: 'Never place NPWT foam directly over exposed blood vessels, organs, or anastomotic sites without protective non-adherent contact layer.',
      documentationReq: 'Record wound dimensions, exudate characteristics, peri-wound skin condition, dressing materials used, and patient tolerance in the Wound Care Chart.',
      escalationSteps: 'If frank purulent discharge, wound dehiscence, fever > 38.5 C, or sudden arterial bleeding occurs, notify surgical registrar immediately and send wound swab for culture.',
      references: 'Wound Healing Society (WHS) Guidelines; National Institute for Health and Care Excellence (NICE) Surgical Site Infection Standards.',
      version: '1.8',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-04-01'),
      reviewDate: new Date('2027-04-01'),
      isMandatory: false,
      downloadUrl: '/documents/sops/SOP-WND-007-Wound-Dressing.pdf',
    },
    {
      procedureCode: 'SOP-VIT-008',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Vital Signs Monitoring & National Early Warning Score (NEWS2) Pathway',
      category: 'Vital Monitoring',
      description: 'Standard protocol for routine and targeted vital signs measurement, automated NEWS2 score calculation, and systematic physiological deterioration response tiers.',
      purpose: 'To standardize the measurement of patient vital signs and trigger early clinical escalation to avert cardiac arrest and unplanned ICU admissions.',
      scope: 'Mandatory across all adult inpatient beds at MediTwin Central Hospital.',
      responsibilities: 'Staff nurses record vitals, compute NEWS2, assign risk tiers (Low: 1-4, Medium: 5-6, High: >=7), and execute time-bound escalation actions.',
      requiredEquipment: 'Calibrated digital vitals monitor (NIBP, SpO2 sensor, temperature probe), manual sphygmomanometer, stethoscope, timer/watch with second hand for respiratory rate counting.',
      procedureSteps: [
        { stepNumber: 1, title: 'Measurement of All 6 Core Physiological Parameters', instruction: 'Measure: Respiratory rate (count for 60 seconds), Oxygen saturation (SpO2), Supplemental oxygen requirement (Air vs O2), Body temperature, Systolic blood pressure, Heart rate, and Consciousness level (ACVPU).', rationale: 'Respiratory rate is the most sensitive early indicator of metabolic or respiratory decompensation.' },
        { stepNumber: 2, title: 'Calculate Aggregate NEWS2 Score', instruction: 'Enter values into MediTwin vitals engine. Verify score calculation: 0-4 (Low risk), 3 in single parameter (Low-medium), 5-6 (Medium risk), 7 or higher (High risk).', rationale: 'Quantifies physiological instability into calibrated clinical alert levels.' },
        { stepNumber: 3, title: 'Low Risk Response (Score 1-4)', instruction: 'Continue 4-6 hourly observations. Inform ward nurse in charge if score increases by 2 or more from baseline.', rationale: 'Maintains vigilance while permitting clinical stability.' },
        { stepNumber: 4, title: 'Medium Risk Escalation (Score 5-6 or 3 in single parameter)', instruction: 'Increase vitals frequency to at least hourly. Notify duty house officer / registrar immediately. Doctor must attend bedside within 30 minutes.', rationale: 'Early clinical review prevents escalation to cardiac arrest.' },
        { stepNumber: 5, title: 'High Risk Escalation (Score >= 7)', instruction: 'Initiate continuous monitoring. Immediately alert Rapid Response Team (RRT) and attending physician. Team must attend within 10 minutes.', rationale: 'Patients with NEWS2 >= 7 carry an inpatient mortality risk exceeding 20% without intensive support.' }
      ],
      safetyPrecautions: 'For patients with confirmed hypercapnic respiratory failure (e.g. COPD), use the specific Scale 2 SpO2 target range (88-92%) as prescribed.',
      documentationReq: 'Record all individual parameters, aggregate NEWS2 score, time of doctor notification, and doctor arrival time in the electronic observation chart.',
      escalationSteps: 'If doctor fails to attend within the mandatory timeframe (30 min for Medium, 10 min for High), escalate immediately to Clinical Nursing Supervisor and ICU Fellow.',
      references: 'Royal College of Physicians (RCP) National Early Warning Score (NEWS) 2 Standard; NHS England National Patient Safety Guidance.',
      version: '3.0',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-10'),
      reviewDate: new Date('2027-01-10'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-VIT-008-NEWS2-Escalation.pdf',
    },
    {
      procedureCode: 'SOP-DIS-009',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Nursing Discharge Planning, Patient Education & Care Handoff',
      category: 'Discharge Procedures',
      description: 'Standard protocol for conducting inpatient nursing discharge assessment, patient and caregiver education, discharge medication reconciliation, and follow-up appointment confirmation.',
      purpose: 'To ensure safe, comprehensive transition of care from hospital to home, reducing post-discharge complications and preventable 30-day readmissions.',
      scope: 'All registered nurses discharging admitted inpatients across all clinical wards of MediTwin Central Hospital.',
      responsibilities: 'Discharge nurse verifies medical discharge order, reviews physician discharge summary, prepares Nursing Discharge Summary, reconciles take-home medications, and provides hands-on patient education.',
      requiredEquipment: 'Official Doctor Discharge Summary, Nursing Discharge Summary, discharge medication pack with pharmacist verification seal, wound care home care kit, educational brochures, follow-up appointment card.',
      procedureSteps: [
        { stepNumber: 1, title: 'Verification of Authorization for Discharge', instruction: 'Confirm attending physician has finalized medical discharge order in EHR. Ensure all pending diagnostic results have been reviewed by physician.', rationale: 'Prevents premature patient departure prior to clinical clearance.' },
        { stepNumber: 2, title: 'Medication Reconciliation & Education', instruction: 'Review each take-home medicine: name, dosage, timing, route, potential side effects, and warning signs. Use teach-back technique with patient/caregiver.', rationale: 'Pharmacotherapy misunderstanding accounts for over 50% of preventable post-discharge adverse events.' },
        { stepNumber: 3, title: 'Wound, Drain & Device Instructions', instruction: 'Provide practical demonstration on wound care, drain emptying (if applicable), and activity restrictions. Provide emergency contact telephone numbers.', rationale: 'Equips caregivers with essential self-care competency.' },
        { stepNumber: 4, title: 'Removal of Inpatient Devices', instruction: 'Remove peripheral IV cannula, urinary catheter, or telemetry electrodes. Inspect sites, ensure bleeding has ceased, apply clean adhesive bandage.', rationale: 'Eliminates source of home catheter infection and injury.' },
        { stepNumber: 5, title: 'Final Documentation & Safe Departure Escort', instruction: 'Provide signed copies of Doctor and Nursing Discharge Summaries. Assist patient to vehicle via wheelchair if required. Record discharge timestamp in EHR.', rationale: 'Concludes legal and clinical hospital inpatient episode.' }
      ],
      safetyPrecautions: 'Ensure patient has confirmed transportation and competent adult caregiver escort before allowing departure. If patient chooses to leave Against Medical Advice (AMA), follow statutory DAMA protocol.',
      documentationReq: 'Completed Nursing Patient Summary / Discharge Summary, signed patient education checklist, time of departure, transport method, and escort identity.',
      escalationSteps: 'If patient condition deteriorates prior to departure, halt discharge, re-evaluate vitals, and summon attending physician immediately.',
      references: 'The Joint Commission Transitions of Care Guidelines; American Academy of Nursing Care Coordination Standards.',
      version: '2.0',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-03-01'),
      reviewDate: new Date('2027-03-01'),
      isMandatory: false,
      downloadUrl: '/documents/sops/SOP-DIS-009-Discharge-Handoff.pdf',
    },
    {
      procedureCode: 'SOP-ADM-010',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Inpatient Ward Admission Verification & Allergy Identification',
      category: 'Admission Procedures',
      description: 'Systematic workflow for receiving new inpatients, verifying identity, cross-checking known drug allergies, conducting baseline assessments, and securing patient belongings.',
      purpose: 'To ensure accurate patient identification, establish safe baseline records, and prevent fatal drug allergy exposures from the point of inpatient entry.',
      scope: 'All registered nurses receiving newly admitted patients from Emergency Department, Outpatient Clinics, or Inter-Hospital Transfers.',
      responsibilities: 'Receiving staff nurse conducts mandatory verification within 30 minutes of arrival.',
      requiredEquipment: 'Patient identification barcode printer / wristband, red allergy alert wristband, electronic clinical thermometer, blood pressure monitor, pulse oximeter, EHR admission intake template.',
      procedureSteps: [
        { stepNumber: 1, title: 'Positive Patient Identification (2 Identifiers)', instruction: 'Verify full legal name and date of birth against hospital MRN wristband and government-issued photo ID.', rationale: 'Prevents misidentification and erroneous charting.' },
        { stepNumber: 2, title: 'Allergy Screening & Red Alert Banding', instruction: 'Ask: "Do you have any allergies to medications, latex, foods, or skin dressings?". If positive, apply RED allergy wristband and immediately document substance, reaction, and severity in EHR.', rationale: 'Provides immediate visual and electronic safeguards against anaphylaxis.' },
        { stepNumber: 3, title: 'Baseline Physical Assessment & Vital Signs', instruction: 'Measure complete vital set (NEWS2), weight, height, and skin integrity check within 1 hour of ward arrival.', rationale: 'Establishes accurate baseline for dosage calculations and clinical monitoring.' },
        { stepNumber: 4, title: 'Orientation to Patient Call Bell & Ward Environment', instruction: 'Demonstrate call bell operation, bed controls, emergency bathroom cord, meal timings, and ward routine.', rationale: 'Reduces patient anxiety and enhances personal safety.' }
      ],
      safetyPrecautions: 'Never administer medications until allergy status is verified and documented in the electronic medical record.',
      documentationReq: 'Completed Nursing Admission Assessment, baseline vitals, allergy status, and emergency contact verification in EHR.',
      escalationSteps: 'If patient exhibits severe distress or unstable vitals on arrival, bypass routine intake and notify attending physician immediately.',
      references: 'National Patient Safety Goals (NPSG) on Patient Identification and Medication Safety.',
      version: '2.1',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-05'),
      reviewDate: new Date('2027-01-05'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-ADM-010-Admission-Verification.pdf',
    },
    {
      procedureCode: 'SOP-DOC-011',
      hospitalId: hospital1.id,
      departmentId: null, // Hospital-wide
      title: 'Electronic Nursing Documentation & Shift Handoff (ISBAR)',
      category: 'Documentation',
      description: 'Standards for contemporaneously documenting clinical nursing care, vital observations, nursing notes, and executing structured inter-shift clinical handoffs using the ISBAR tool.',
      purpose: 'To ensure legal, contemporaneous, and unambiguous recording of clinical care and maintain unbroken clinical situational awareness across nursing shift changes.',
      scope: 'Mandatory for all nursing personnel documenting in the MediTwin EHR.',
      responsibilities: 'Authoring nurses must document care contemporaneously and present structured ISBAR handoff at change of shift.',
      requiredEquipment: 'MediTwin EHR nursing workstation, secure cryptographic JWT login token, ISBAR shift handoff communication sheet.',
      procedureSteps: [
        { stepNumber: 1, title: 'Contemporaneous Clinical Documentation', instruction: 'Document observations and clinical care at the time of delivery or as close as practically possible. Avoid delayed retrospective entry.', rationale: 'Accurate timing is vital for retrospective audit and medical-legal defense.' },
        { stepNumber: 2, title: 'Objective, Factual Narrative Standards', instruction: 'Record clinical observations objectively (e.g. "wound drainage 15 mL serosanguinous") without speculative or derogatory phrasing.', rationale: 'Medical records are official legal hospital documents.' },
        { stepNumber: 3, title: 'Shift Handoff Preparation using ISBAR', instruction: 'Synthesize shift report using: Identify (Patient name, bed, age), Situation (Current clinical state), Background (Diagnosis, surgeries, allergies), Assessment (NEWS2, lines, wound, meds), Recommendation (Pending tasks, alerts).', rationale: 'Standardized communication reduces handover information loss by over 70%.' },
        { stepNumber: 4, title: 'Bedside Joint Verification', instruction: 'Conduct physical bedside handover: inspect IV lines, infusion pump rates, catheter drainage, and invite patient to participate in plan of care.', rationale: 'Direct bedside verification detects line errors and patient safety risks immediately.' }
      ],
      safetyPrecautions: 'Never share login credentials; all electronic entries are cryptographically signed with the user ID.',
      documentationReq: 'Electronic nursing progress note signed at end of shift; completed shift handover checklist.',
      escalationSteps: 'Discrepancies in medication counts or unstable patients must be resolved before the outgoing nurse departs the ward.',
      references: 'Nursing and Midwifery Board Standards for Documentation; WHO High 5s Standard Operating Protocol on Clinical Handover.',
      version: '1.9',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-02-10'),
      reviewDate: new Date('2027-02-10'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-DOC-011-Nursing-Documentation.pdf',
    },
    // DRAFT PROCEDURE for Hospital 1 (Must be hidden from normal nurses)
    {
      procedureCode: 'SOP-DRAFT-012',
      hospitalId: hospital1.id,
      departmentId: null,
      title: 'Autonomous AI-Assisted Closed-Loop Smart Infusion Protocol',
      category: 'Medication Safety',
      description: 'INTERNAL DRAFT ONLY: Theoretical guidelines for artificial intelligence algorithm adjustments to high-risk vasoactive infusions.',
      purpose: 'Experimental review draft under Clinical Governance committee evaluation.',
      scope: 'Not approved for clinical ward application.',
      responsibilities: 'Clinical Research Unit and Pharmacy Governance Committee.',
      requiredEquipment: 'Experimental prototype smart infusion hardware.',
      procedureSteps: [
        { stepNumber: 1, title: 'Draft Step 1', instruction: 'Under laboratory review.', rationale: 'Pending safety validation.' }
      ],
      safetyPrecautions: 'STRICTLY PROHIBITED IN ACTIVE CLINICAL CARE.',
      documentationReq: 'Research audit forms only.',
      escalationSteps: 'Contact Institutional Review Board.',
      references: 'Internal Clinical Committee Draft Memo 2026.',
      version: '0.1-DRAFT',
      status: 'DRAFT',
      effectiveDate: new Date('2026-11-01'), // Future date!
      reviewDate: new Date('2027-11-01'),
      isMandatory: false,
      downloadUrl: null,
    },
    // Procedure for Hospital 2: St. Jude Memorial Hospital (Must be hidden from MediTwin nurses)
    {
      procedureCode: 'SOP-STJ-013',
      hospitalId: hospital2.id,
      departmentId: deptOrthopedics?.id || 5,
      title: 'St. Jude Skeletal Traction & Pin Site Antisepsis Protocol',
      category: 'Clinical Care',
      description: 'Standard procedure for orthopedic skeletal traction pin site inspection, daily chlorhexidine cleansing, and neurovascular assessment at St. Jude Memorial Hospital.',
      purpose: 'To prevent pin site osteomyelitis and maintain anatomical skeletal alignment in orthopedic inpatients.',
      scope: 'Restricted to St. Jude Memorial Hospital Orthopedic and Trauma units.',
      responsibilities: 'St. Jude Orthopedic Ward nursing staff.',
      requiredEquipment: 'Chlorhexidine 0.05% aqueous solution, sterile gauze, sterile applicator swabs, pin site protective foam stoppers.',
      procedureSteps: [
        { stepNumber: 1, title: 'Pin Site Cleaning', instruction: 'Clean each pin site individually using separate sterile applicator swab soaked in aqueous chlorhexidine.', rationale: 'Prevents cross-contamination between different anatomical pin tracks.' }
      ],
      safetyPrecautions: 'Report tenting or purulent exudate immediately to orthopedic surgeon.',
      documentationReq: 'St. Jude Orthopedic Daily Pin Site Surveillance Chart.',
      escalationSteps: 'Alert attending orthopedic registrar for pin loosening or persistent drainage.',
      references: 'St. Jude Clinical Governance Protocol 2026.',
      version: '1.0',
      status: 'PUBLISHED',
      effectiveDate: new Date('2026-01-01'),
      reviewDate: new Date('2027-01-01'),
      isMandatory: true,
      downloadUrl: '/documents/sops/SOP-STJ-013-Pin-Site-Care.pdf',
    },
  ];

  // Insert or update all procedures
  for (const proc of proceduresData) {
    const dataWithContent = {
      ...proc,
      content: (proc as any).content || `${proc.description}\n\nPurpose:\n${proc.purpose || ''}\n\nScope:\n${proc.scope || ''}\n\nResponsibilities:\n${proc.responsibilities || ''}`,
    };
    await prisma.hospitalProcedure.upsert({
      where: { procedureCode: proc.procedureCode },
      update: dataWithContent,
      create: dataWithContent,
    });
    console.log(`  ✓ Seeded [${proc.procedureCode}] ${proc.title} (${proc.status}, Hospital #${proc.hospitalId})`);
  }

  // Ensure Nurses 1, 2, 6 are linked to departments / hospitals properly
  // Nurse 1: Angel Renoy -> General Medicine (dept 2, hospital 1)
  await prisma.nurse.updateMany({
    where: { id: 1 },
    data: { departmentId: deptGeneralMed?.id || 2 },
  });

  // Nurse 2: Angel Mary -> Cardiology (dept 1, hospital 1)
  await prisma.nurse.updateMany({
    where: { id: 2 },
    data: { departmentId: deptCardiology?.id || 1 },
  });

  // Nurse 6: Noyal Thomas -> General Medicine (dept 2, hospital 1)
  await prisma.nurse.updateMany({
    where: { id: 6 },
    data: { departmentId: deptGeneralMed?.id || 2 },
  });

  console.log('✓ Successfully seeded Hospital Procedures and verified nurse departmental relationships.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
