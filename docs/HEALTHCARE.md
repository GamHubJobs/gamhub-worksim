# Healthcare & Medical Services

A career on Ward 4 (Medical) of **Riverside Community Hospital**, a fictional
hospital.

> **Simulation for learning.** Every patient, clinician, medicine, test range
> and score is fictional or simplified, and every screen says so. Nothing here
> is medical advice. The player never diagnoses or prescribes: prescriptions
> come from the fictional doctors, and the player's part is the safe process
> around them.

## Another employer

Until now every career worked at Cobalt Ridge Consulting. A hospital career
does not belong in a consulting firm, so a department can now name its own
**employer**:

- `employer` and `sharedPeople` on the department;
- `employerFor` and `activeEmployer` in `content/departments`.

The welcome email, the Career app, Mail, the Start menu, onboarding and the
office sign all use the career's employer. The hospital has its own ward
clerk, estates supervisor and learning lead in place of Cobalt Ridge's
reception, facilities and HR.

## Ward Systems (`src/tools/clinical`)

One console with the systems a ward uses:

| Section             | What the player does                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patient record      | Find patients; give a reason to open a record outside the care team; read the allergy banner; record observations (with the early-warning score and what it asks for); notes and SBAR escalation; the medicines chart with bedside checks; tests labelled at the bedside. |
| Appointments        | Clinic lists; arrivals and outcomes in order; booking without double-booking.                                                                                                                                                                                             |
| Laboratory          | Each label beside its request; reject mismatches and re-request; enter results; critical results phoned to a named person.                                                                                                                                                |
| Pharmacy            | Verify, query or dispense, acting on allergy and duplicate alerts (unlocks at Healthcare Assistant).                                                                                                                                                                      |
| Beds and admissions | The bed board; admit only to clean, empty beds; discharge only with a signed summary (unlocks at Senior Healthcare Assistant).                                                                                                                                            |
| Audit log           | Every action, with the time.                                                                                                                                                                                                                                              |

## The career

- **Levels:** Healthcare Support Trainee, then Healthcare Assistant, then
  Senior Healthcare Assistant, then Ward Coordinator.
- **Skills:** patient safety, observation and escalation, clinical
  documentation, confidentiality and records, plus customer service,
  accuracy and responsible AI use.
- **Tasks, all in Ward Systems:**
  1. the observations round with an SBAR escalation;
  2. specimens and a critical result;
  3. a clinic morning;
  4. the medicines round and pharmacy checks;
  5. a discharge and an admission.
- **Cases:** the same set and balance as every other career.
  - Foundation: a stock count, a complaint, and the three AI cases.
  - Intermediate:
    - ward requests to approve;
    - a transfer handover, with a follow-up if it was wrong;
    - the safety huddle (a meeting);
    - a confidentiality incident (a caller asking about a patient);
    - the discharge lounge project, in two stages.
  - Advanced: a hand hygiene audit, missed clinic appointments, and
    coordinating the late shift (leadership).
  - Four cases have variants.
- **Readiness assessments:**
  - level 2: a patient getting worse;
  - level 3: a medicines chart audit.
  - Each has two versions with different practical work.
- **Programme:** the hospital's own project, the discharge lounge, in place
  of Cobalt Ridge's Manchester office programme.

## Not yet

- **The walkable hospital.** Leaving the desk still shows the Cobalt Ridge
  office, with the hospital's name on the sign.
- **A story campaign.** Story mode is not offered for this career yet.

Both come in the next stage.

## Tests

- **Unit tests:**
  - `src/tools/clinical/model.test.ts`: every rule and the grading;
  - the shared content and balance tests now include the healthcare career.
- **Browser tests:** `tests/e2e/healthcare.spec.ts`:
  - the first task done in the app and marked 100%;
  - the bedside checks enforced;
  - an unsafe prescription queried.
