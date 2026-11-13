# Law & Legal Services

A career at **Kestrel & Vane LLP**, a fictional law firm in the **Commonwealth
of Westmark**, a fictional jurisdiction.

> **Simulation for learning.** Westmark's laws, courts, cases, clients and
> parties are invented and simplified, and every screen says so. Nothing
> here is the law of a real country, or legal advice.

## Localisation

All of the jurisdiction's rules are in one module:
`src/tools/legal/jurisdiction.ts`. They are:

- the courts;
- the defence and appeal periods;
- limitation periods;
- weekend and holiday rolling;
- public holidays;
- the billing unit.

A real jurisdiction (for example The Gambia) can be added as another entry.
But its rules must come from **verified, current sources checked by a
qualified person**, never from memory or general knowledge. The module's
header says so.

## Matter Desk (`src/tools/legal`)

| Section            | What the player does                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matters and intake | Conflict checks against current, former and adverse parties. A current client on the other side stops the matter, which is declined with a reason. Identity checks; engagement letters; opening matters. |
| Research           | A law library of fictional statutes and cases. Overruled authorities are marked _not good law_. Authorities are saved to matters.                                                                        |
| Contract review    | Each clause against the firm's playbook: accept, or amend or reject with a comment (unlocks at Paralegal).                                                                                               |
| Calendar           | A deadline calculator with the rules; limitation dates; key dates per matter.                                                                                                                            |
| Time and billing   | Time in six-minute units; billable and non-billable time; invoices raised once from unbilled time.                                                                                                       |
| Document review    | Relevant, not relevant, or privileged, with the basis (unlocks at Senior Paralegal).                                                                                                                     |
| Audit log          | Every action.                                                                                                                                                                                            |

## The career

- **Levels:** Trainee Paralegal, then Paralegal, then Senior Paralegal, then
  Associate (Legal Executive).
- **Skills:** legal research, legal drafting, professional ethics and case
  management, plus customer service, accuracy and responsible AI use.
- **The people:**
  - Eleanor Vane (Partner) and Tobias Kestrel (Senior Associate);
  - Imogen (reception), Marcus (office services) and Neil (training
    principal);
  - a paralegal, associates, a trainee, a legal secretary, a billing
    coordinator and a research lawyer at the desks.
- **The office:** Cobalt Ridge's floor with the firm's names (reception, your
  desk, Eleanor's office, the kitchen) and signs.
- **Tasks, all in Matter Desk:**
  1. two enquiries (one a conflict);
  2. research, keeping to good law;
  3. deadlines and an honest timesheet;
  4. reviewing a supply agreement against the playbook;
  5. disclosure with privilege, and the month's invoice.
- **Cases:** the same set and balance as every career.
  - **The meeting is a mock hearing:**
    - before it, prepare a skeleton argument in Word Craft;
    - in the hearing, answer the judge candidly about an overruled case;
    - after it, record the actions and follow up.
  - **The others:**
    - an incident (privileged advice emailed to the other side);
    - a client wanting a guarantee;
    - disbursements, and team requests to approve;
    - a court filing, with its follow-up if it was wrong;
    - the free advice clinic project, in two stages;
    - a settlement analysis and a costs estimate (advanced);
    - leading the trial team.
  - Four cases have variants.
- **Readiness assessments:**
  - level 2: a timesheet;
  - level 3: a deadline that nearly slipped.
  - Each has two versions with different practical work.
- **Story, “Good Law”:**
  - a walk-in client who must not tell his story before the conflict check;
  - an old case that would win the argument, if it were still good law.
  - Checking it changes the hearing and the ending.

## Tests

- **Unit tests:**
  - `src/tools/legal/model.test.ts`: the rules, every action and the
    grading;
  - the shared content, balance, assessment and story tests now include the
    career.
- **Browser tests:** `tests/e2e/legal.spec.ts`:
  - the intake task done in the app and marked 100%;
  - the deadline calculator rolling past a weekend and a holiday.
