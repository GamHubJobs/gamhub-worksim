# Live workplace scenarios

Professional events played in person in the 3D workplace: a court hearing, a
ward round and emergency, a site safety walk, desk-side IT support, a client
review. The player takes their place, the people in the room speak and react,
the player answers, and what they do changes the outcome and the career.

## How it fits together

| Part                   | File                                 | What it does                                                                                                                                       |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content                | `src/content/scenarios/*.ts`         | One scenario per career: where it happens, the cast and their places, the exhibits, and the beats                                                  |
| Engine                 | `src/game/scenarios.ts`              | Pure: the beat the player is at, scoring, branching, the outcome band, and applying the consequences                                               |
| The people in the room | `src/office/scene/ScenarioStage.tsx` | Each person at their place facing who they address, seated or standing, moving between beats; the speaker gestures, with their name and role above |
| The panel              | `src/office/ScenarioPanel.tsx`       | What is said, the player's answers, the exhibits, a text box for their own words, and the outcome with every answer reviewed                       |
| Camera                 | `PlayerRig` `stage` prop             | A fixed view of the scene while it is played, eased into place                                                                                     |
| Wiring                 | `src/office/OfficeView.tsx`          | "Live work here" in the area panel; walking to your place starts it; the area panel and prompts step aside while it runs                           |

## A scenario's beats

- **say:** a member of the cast speaks (or a narrator describes), with a
  gesture (talk, present, reach, phone, wave).
- **choose:** the player decides. Each option earns a share of the points, has
  the cast's reaction, a lesson for the review, optional effects (trust,
  reputation, wellbeing), and can lead to another beat (a weak answer can
  draw an objection).
- **exhibit:** the player presents one item of evidence from the exhibits.
- **speak:** the player says it in their own words, marked against a rubric
  (enough words, and each group of key terms covered). No AI service is
  needed; it works offline.
- **end:** the outcome.

## What it leads to

- **Outcome:** excellent ≥ 85%, good ≥ 70%, pass ≥ 50%, otherwise poor. Each
  band has its verdict (for example "Judgment for the claimant: £18,400 and
  costs"), what the person in charge says, and effects.
- **Trust, reputation and wellbeing:** the band's effects, and those of
  individual answers. Applied once per office day, so replaying is practice.
- **XP and skills:** the first time it is played, scaled by the score. Then
  promotions are checked, as for tasks and cases.
- **The linked case:** every scenario is linked to its career's meeting case.
  Played while that meeting is on, the meeting is joined and the scenario's
  answer becomes the case's meeting answer, graded with the case.
- **The record:** best and last score, times played, the band
  (`work.scenarios` in the save, optional, so older saves load unchanged), and
  a line in the day's log.

## The scenarios

| Career                   | Scenario                                          | Where                                        | The player…                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Law                      | Hearing: Brightwater v Millstone                  | Moot courtroom, as the Westmark County Court | introduces themselves, opens, examines their witness, objects, cross-examines, presents exhibits, answers the judge candidly, opposes an adjournment, closes in their own words |
| Healthcare               | Ward round and emergency: bed 4A-2                | Bay A                                        | hands over (SBAR), checks identity, escalates a NEWS of 8, speaks up about a penicillin allergy, supports a relative, responds to a deterioration, documents                    |
| Engineering              | Safety walk and project meeting                   | The workshop                                 | challenges missing PPE, stops live work (isolate, lock off, prove dead), takes an overstressed beam out of use, reports a near miss, gives the client an honest date            |
| IT Help Desk             | Desk-side support: “nothing works”                | The IT corner                                | protects a user's deadline, diagnoses a 169.254 address, raises one incident, finds the bad change at the switch, refuses to share admin rights, writes the ticket              |
| Accounting               | Month-end review with a client                    | The records room                             | explains a reconciling item, refuses to backdate an invoice, explains an accrual and a variance, confirms in writing                                                            |
| Finance & Administration | A supplier calls in: the unpaid invoice           | The post & print room                        | three-way matches, finds a duplicate, stops a bank-details fraud, keeps to approval limits                                                                                      |
| Software Development     | Release day: review, go or no-go, and an incident | The dev team area                            | reviews a pull request, reads a failing test, makes a release call, rolls back an incident, writes a blameless summary                                                          |
| Data Analysis            | Presenting findings to the sales director         | The insights wall                            | leads with the insight, picks the right chart, resists causation claims and dropping data, explains sample size, recommends a test                                              |
| Digital Marketing        | Campaign review with a client                     | The content studio                           | reads cost per booking, not clicks, turns down a misleading claim, proposes an A/B test, sets the plan                                                                          |

More scenarios:

- **Law, a first interview with a new client** in the client meeting room: a
  conflict check before details, identity and an engagement letter, open
  questions, the order confirmation, honest expectations, a letter before
  claim, fees and the attendance note.
- **Healthcare, admitting a new patient** to bed 4A-4: consent, new
  confusion, falls prevention, a pressure area, a confidentiality phone call,
  escalating hip pain and the admission note.
- **Engineering, a design review** in the project room: holding the parapet
  standard, a contractor building from a superseded drawing, a formal change
  request with its cost and time, protected bats, and the minutes.
- **IT Help Desk, a major incident:** email down for everyone before a board
  meeting. Declaring it, the supplier's status page, updates through channels
  that still work, resisting an untested fix under pressure, confirming with
  users, and the review.
- **Accounting, the auditor's visit:** the sample pulled as filed, honesty
  about a missing approval, a cut-off error, independence under pressure,
  the findings.
- **Finance & Administration, the payroll printout and the expense claims:**
  personal data on the copier, a claim against the policy, a manager
  approving their own claim.
- **Software Development, sprint planning:** capacity from velocity, scope by
  priority, splitting a big story, refusing to store readable passwords,
  testable and accessible acceptance criteria, the sprint goal.
- **Data Analysis, the dashboard that doubled overnight:** duplicate rows
  from a join, correcting the directors openly, data minimisation, the
  incident note.
- **Digital Marketing, the photo shoot and the post:** consent to use a
  customer's photo, image rights, labelling a paid post, alt text, an angry
  comment.

The first scenario of each career also includes that career's meeting-case decision.

## Tests

- `src/game/scenarios.test.ts`, for every scenario:
  - the content is well formed;
  - it is played in its career's workplace, at a spot the player can reach;
  - the best answers score 100% and the worst are poor;
  - XP is given once and the result recorded;
  - its case's meeting is joined and answered.
- `tests/e2e/scenarios.spec.ts`: plays every scenario on screen in the real
  game. The hearing is played both well (judgment with costs) and badly
  (claim dismissed, with the lessons reviewed).

## Not done

- **No free-form AI conversation:** the cast's responses are written for
  each answer. Answers in the player's own words are marked by a rubric, not
  by an AI model.
- **Scenarios per career:** two in every career (18 in all). The
  engine and stage take more without code changes.
- **AI coaching:** a player with their own model turned on in WorkSim AI can
  ask it for coaching after an answer in their own words. It never changes the
  score.
- **Walking:** people walk between places in a straight line, without
  routing around furniture.
