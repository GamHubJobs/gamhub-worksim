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

## The ward (walkable)

The walkable workplace is the office's floor plan, dressed as Ward 4. This is
deliberate: the colleagues' routines, meetings and HUD all work unchanged.

- **The areas are renamed:**
  - the ward desk (Rosa, the ward clerk);
  - the nurses' station;
  - Grace's office;
  - the staff room.
- **Bay A** stands where the IT corner is in the office:
  - four beds with fictional patients;
  - curtains, monitors, lockers and bed signs;
  - hand gel, and a locked medicines trolley.
- **At the bedside** (or the trolley), pressing E or choosing _Go to the
  bedside_ walks there, cleans hands, checks the wristband and opens Ward
  Systems.
- **The colleagues at the desks** are the ward team: healthcare assistants,
  doctors, a physiotherapist, the ward administrator and a pharmacy
  technician.
- **The signs** show the hospital and the ward.
- **New department options** (`content/departments`):
  - `workplace`, `places` and `team`;
  - `{reception}`, `{facilities}` and `{employer}` in any text, so
    shared dialogue names the right people.

## Story: “Bay A”

**Chapter 1 (Four beds):**

- a first shift;
- a patient whose observations show she is getting worse;
- a side mission at the pharmacy hatch;
- a family's complaint.

**Chapter 2 (Speak up):** a colleague skips the wristband check. Whether
the player reports the near miss changes the incident review and the ending.

## Tests

- **Unit tests:**
  - `src/tools/clinical/model.test.ts`: every rule and the grading;
  - the shared content and balance tests now include the healthcare career.
- **Browser tests:** `tests/e2e/healthcare.spec.ts`:
  - the first task done in the app and marked 100%;
  - the bedside checks enforced;
  - an unsafe prescription queried.
