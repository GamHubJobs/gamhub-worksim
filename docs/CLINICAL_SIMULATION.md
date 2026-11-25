# Clinical simulation on Ward 4

A patient-case simulator inside the Healthcare & Medical Services career:
fictional patients you talk to and observe, conditions that change with time
and with what you do, escalation to qualified staff, the hospital's own
software, a scored debrief, a tutor, and supervision by Grace Mbeki.

> **Simulation for learning.** Every patient, history, result, rule and score
> is fictional and simplified. Nothing here is medical advice or a validated
> clinical tool. The player works as healthcare support staff: they observe,
> record, communicate and escalate. They never diagnose, prescribe or treat.

## 1. Phase 0: what was looked at

### Full Code Medical (fullcodemedical.com)

**Method:** its public website was visited in a browser (the home page,
Individuals, Organizations, Hospitals, About, Reviews, Supported devices and
the EULA). The pages were saved as text and screenshots. No account was made
and nothing was signed into.

**Why REA's code analysis was not used on the app:** Full Code's licence
agreement forbids reverse engineering, decompiling or disassembling its app,
and using it to develop a functionally similar product. Its logic was
therefore **not** analysed: no bundle analysis, no decompiling, no network
capture of the app. Nothing below comes from its code. Everything comes from
what the company publishes about its product, and the design that follows is
our own.

**What the company describes publicly:**

- **Cases:** 300+ peer-reviewed cases across 31 specialties, about ten
  minutes each, on web and mobile, built on 3D web technology.
- **Patients:** 27 diverse patient models.
- **"Patient AI":** keyboard or microphone conversations to take a history
  and review symptoms.
- **Imaging:** real medical imaging.
- **Support:** an AI tutor.
- **Feedback:** a "full score and debrief after every case".
- **Difficulty:** settable "from novice to expert".
- **Replays:** learners redo cases after feedback.
- **For organisations:** assign cases and set difficulty per learner, track
  competency on one dashboard, and review scores.

**Not observed (it needs an account or the app itself):** the case flow, how
scoring is weighted, the categories of actions, the debrief layout and the
dashboard.

### Shadow Health (shadowhealth.com, app.shadowhealth.com)

Neither address loaded in the browser: one failed with a certificate error,
and the app needs a login. Nothing was observed. Only the general idea,
widely described in nursing education, is used: interviewing a virtual
patient in free text, examining by body system, documenting the findings,
and an after-action review. No content, wording or workflow detail was taken.

### What we take from this (ideas, not implementation)

1. Short, focused cases with a clear goal, scored and debriefed every time.
2. Free-text conversation with a patient who answers from their own story
   and gives information only when asked.
3. Actions sorted into categories, with some actions marked critical and
   others unnecessary or harmful.
4. Difficulty that changes help and expectations, never the facts.
5. Replays, with first, latest and best attempts.
6. A supervisor's view of assignments and recurring gaps.

## 2. The existing healthcare career (audit)

| What                                                                                                                                                               | Where                               | Reused as                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Ward Systems:** patient record, observations with an early-warning score and escalation advice, notes and SBAR, medicines, laboratory, pharmacy, beds, audit log | `src/tools/clinical`                | The hospital software. Cases write into the same record, so observation charts, notes, specimens and results show what the player did |
| Ward 4 in 3D: Bay A and B, side rooms, the nurses' station, bedside activities                                                                                     | `src/office/scene/ward*`            | Where cases start: the player walks to the bed                                                                                        |
| The people: Grace Mbeki (manager), the senior nurse, the ward team                                                                                                 | `content/departments/healthcare.ts` | Supervisors, clinicians and the educator in cases and feedback                                                                        |
| Tasks, checks, grading, rewards, assessments, story                                                                                                                | `content/`, `game/`, `tools/`       | Patient cases as tasks; XP, skills and progression unchanged                                                                          |
| WorkSim AI: the player's own optional model, a built-in fallback, characters who can be questioned                                                                 | `src/ai`                            | The patient's words and the tutor's explanations when a model is on; the built-in fallback otherwise                                  |

## 3. The design

```
src/clinical/          pure TypeScript, no React
  model.ts             case definitions: patient, phases, facts, actions, rules, rubric
  engine.ts            the encounter: actions, measurements, time, progression, event log
  conversation.ts      what was asked (deterministic), the patient's reply, communication
  assessment.ts        classification, category scores, debrief, attempts
  tutor.ts             a knowledge base drawn from the case and its debrief
  cases/               the case library (fictional)
src/tools/clinical/    Ward Systems: new Patient cases and Case progress sections
```

- **One engine for every case.** Cases are data: the patient, their facts,
  phases with true observations, rules that move between phases (on time, on
  an action, or on an action not done in time), the actions and how each is
  classified, and the rubric.
- **The engine is the authority.** It holds the true condition and the event
  log, on the game's clock. AI only phrases what the engine decided the patient
  says; it can never change findings or scores.
- **Scope:** every action belongs to a role level. Actions beyond the player's
  role are not done and not penalised; they offer the route to the right
  person (the nurse in charge, the doctor).
- **Shared data:** the case's patient lives in Ward Systems' record.
  Observations taken at the bedside appear on the observation chart, notes in
  the notes, specimens in the laboratory with their tracking, and the audit
  log shows everything.
- **Saving:** the encounter and every attempt are kept in the Ward Systems
  file, so autosave, versions and backups work as for every file. Old files
  read with an empty case list.

## 4. What was built

### Where it is in the game

**Ward Systems → Patient cases** (every healthcare grade) and **Case progress**.
The career's task list gains three tasks, slotted into the existing path
(nothing replaced; saved progress is kept by task ID):

| Order | Task                           | Grade            | Passed by                                                                                    |
| ----- | ------------------------------ | ---------------- | -------------------------------------------------------------------------------------------- |
| 1     | The morning observations round | Trainee          | (unchanged)                                                                                  |
| **2** | **Your first patients**        | Trainee          | passing _Morning observations_ and _A sample for the clinic_ (beginner or harder)            |
| 3     | Specimens                      | Trainee          | (unchanged)                                                                                  |
| 4     | Clinic list                    | Trainee          | (unchanged)                                                                                  |
| 5     | Medicines round                | Assistant        | (unchanged)                                                                                  |
| **6** | **When a patient gets worse**  | Assistant        | passing _Faint after surgery_ and _Not herself today_ (intermediate or harder)               |
| 7     | A discharge and an admission   | Senior assistant | (unchanged)                                                                                  |
| **8** | **Emergencies on the ward**    | Senior assistant | passing _A weight on my chest_ and _Shivering and hardly passing urine_ (advanced or harder) |

A task already started stays in progress whatever its new position. Each new
task has a status lamp at a Bay B bedside in the 3D ward.

### The engine (`src/clinical/`)

| File              | What it does                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ts`        | The vocabulary: case definitions, phases with true observations, facts, rules, judgements, rubric areas, roles                                                                                                    |
| `actions.ts`      | 59 bedside actions in 12 categories, each with the lowest grade allowed and the minutes it takes; six belong to registered clinicians and are only ever _referred_                                                |
| `engine.ts`       | The encounter: actions, measurements (the true values of the current stage), time, rules that move the patient between stages (on time, on an action, or on an action _not_ done in time), results, the event log |
| `conversation.ts` | What the player said, understood without AI: facts asked about, introductions, identity checks, permission, reassurance, open questions, jargon, and telling a patient a diagnosis                                |
| `assessment.ts`   | Ten scored areas, critical/recommended/unnecessary/harmful actions with timing, deterioration-to-escalation delay, the debrief, first/latest/best                                                                 |
| `tutor.ts`        | A knowledge base (24 topics plus each case's teaching), hints by difficulty, and the requests for an optional AI model                                                                                            |
| `supervisor.ts`   | Grace's feedback, every sentence traceable to the event log and its ward-clock time                                                                                                                               |
| `ward.ts`         | The case inside Ward Systems: the shared record, grading tasks, Grace's assignments, the dashboard                                                                                                                |
| `demo.ts`         | Good care played automatically: model answers for tasks, and the test that every case can be passed                                                                                                               |
| `cases/`          | 22 fictional cases (below)                                                                                                                                                                                        |

**The engine is the authority.** The patient's condition, what was measured,
what was done and the score come only from the engine. With the player's own
AI model switched on (WorkSim AI, bring-your-own, optional), the model may
reword the patient's reply in their voice, given only the facts the engine
chose, and may expand the tutor's answer from the knowledge base. Neither is
ever saved over the record. Without a model, everything works.

**Scope.** Oxygen, medicines, infusions, cannulas, reading an ECG and
diagnosing are never done by the player: choosing them records "asked the
nurse / doctor", which is neither rewarded as treatment nor penalised.
Actions above the player's grade (an ECG for a trainee, bloods below senior)
are referred to a senior in the same way. Telling the patient a diagnosis in
conversation is recorded as a conduct point.

**Difficulty** changes the hints (beginner: the next step; intermediate: the
area; advanced and expert: none), whether objectives and the score are shown,
the time allowed (×1.5, ×1.25, ×1, ×0.75) and the pass mark (60, 70, 75, 80).
The patient, their story and their observations are the same at every level.

### The case library

| Level        | Cases                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Beginner     | Morning observations · A sample for the clinic · A red heel · Just a cup of tea · Out of reach · The side room                                                                             |
| Intermediate | "Not again!" · Which date of birth? · Found on the floor · Not herself today · Faint after surgery · Shaky and sweaty · Through the dressing · A headache in clinic · After the blood test |
| Advanced     | A weight on my chest · Can't catch my breath · Soup on the tray · Shivering and hardly passing urine · Down on the right                                                                   |
| Expert       | Itchy after the drip · The chart that crept up                                                                                                                                             |

Rooms: Bay A, the side room (isolation), the examination room, the
emergency assessment room and the specimen collection area. Every case was
written for this project; none is taken from another product.

### The shared hospital record

Starting a case adds the patient to the patient record. Then:

- observations recorded at the bedside go on the chart, with the score;
- notes, SBAR escalations and handovers are signed into the notes;
- specimens go to the laboratory, and are resulted when due;
- the ward clock moves with the case;
- the audit log lists each step, each change in the patient and each referral.

### The bedside

- The patient, posed by their condition: lying, sitting up, in a chair or on
  the floor.
- Clickable equipment: hand gel, gloves, the observations monitor (which shows
  the last readings), the BP cuff, oximeter, thermometer, notes, the computer
  on wheels, the call bell, the emergency buzzer, the phone and the specimen pots.
- A conversation box and actions grouped by category.
- The readings and the score, a timeline, hints and the tutor.

### Supervision and progress

- **Grace's feedback** after every case.
- **Case progress**: every case for the player's grade with first, latest
  and best attempts, the three weakest areas, actions missed more than once,
  and "Ask Grace for cases". Grace picks two cases that practise the weakest
  area, due in two office days; they are marked done when passed and overdue
  after the day.
- Attempts are saved in the Ward Systems file. The last 12 keep their full
  record for review; older ones keep their scores.

## 5. Tests

- `src/clinical/clinical.test.ts` checks:
  - every case is well formed;
  - every case can be passed with good care;
  - stage changes;
  - true measurements;
  - scope and grade referrals;
  - facts only when asked;
  - speech understanding;
  - determinism;
  - time limits;
  - specimens and results;
  - harmful actions, late escalation, alternatives and consent-first;
  - difficulty never changing facts;
  - attempts;
  - saving;
  - the tutor, hints and AI requests;
  - Grace's times.
- `src/clinical/ward.test.ts` checks:
  - old files reading unchanged;
  - the shared record;
  - referrals;
  - a reload mid-case;
  - attempt trimming;
  - task grading;
  - each new task's model answer scoring 100% and its start scoring 0;
  - the healthcare order;
  - Grace's assignments with due and overdue days;
  - the dashboard;
  - the equipment.
- `tests/e2e/clinical-cases.spec.ts` plays the first case task in the real
  app:
  - the library;
  - a closed case;
  - conversation;
  - equipment actions;
  - a referral;
  - the audit log;
  - a reload mid-case;
  - the debrief with Grace;
  - the second case;
  - Case progress with Grace's assignments;
  - the task marked 100%.

## 6. Limits

- Patients understand typed English through keywords and phrases, not
  language models (unless the player switches on their own model, and then
  only to reword). Unusual phrasing may need asking another way.
- The bedside is built from simple shapes, and its equipment is clicked with
  the mouse (every action also has a button). There are no animated clinical
  procedures.
- There is no voice input.
- Scoring is simplified for learning and is not a validated assessment.
