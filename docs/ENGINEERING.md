# Engineering & Technical Services

A career at **Northbank Engineering Ltd**, a fictional multi-discipline
engineering firm.

> **Simulation for learning.** The formulas are standard textbook ones. The
> catalogues, permit limits and safety factor are simplified and fictional,
> and every screen says so. Real engineering needs the applicable codes and a
> competent, qualified engineer.

## Works Desk (`src/tools/engineering`)

| Section (discipline)                      | What the player does                                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circuits (electrical)                     | A series LED circuit with a schematic. The current, voltage drops and power update live as resistors are chosen from the standard E12 values and power ratings. Over-current, overheating and short circuits are flagged. |
| Beams (civil and structural, educational) | A simply supported beam with a load diagram. M = PL/4 and σ = M/Z for every section in the catalogue; choose the lightest safe one.                                                                                       |
| Gear trains (mechanical)                  | Gear pairs in stages; the overall ratio and output speed against the target.                                                                                                                                              |
| Project planning (industrial)             | A schedule with dependencies and bars; mark the critical path.                                                                                                                                                            |
| Maintenance                               | A work order in the safe order: permit, isolate, lock and tag, prove dead, repair, remove locks, test run. Any step out of order is refused, with the reason. The order closes only with a reading within its limit.      |
| Inspection (quality)                      | Parts measured against a drawing's tolerances; accept or reject.                                                                                                                                                          |
| Environment (chemical and environmental)  | Monitoring results against permit limits; flag exceedances with the action taken.                                                                                                                                         |

## The career

- **Levels:** Graduate Engineer, then Engineer, then Senior Engineer, then
  Lead Engineer.
  - Gears and planning unlock at Engineer; inspection and environment at
    Senior Engineer.
- **Skills:** engineering analysis, safe systems of work, design judgement,
  and quality and compliance, plus technical writing, accuracy and
  responsible AI use.
- **The people:**
  - Helena Okoye (Engineering Manager) and Dmitri Volkov (Senior
    Maintenance Engineer);
  - site reception, a workshop supervisor, and a health and safety
    manager;
  - electrical, structural, mechanical and environmental engineers, a
    planner, a quality inspector and an apprentice at the desks.
- **The office:** the walkable floor is named as site reception, the design
  office, Helena's office and the mess room.
- **Tasks, all in Works Desk:**
  1. the failing indicator lamp (electrical);
  2. sizing the mezzanine beam (structural);
  3. a bearing replaced under lockout-tagout (maintenance);
  4. the conveyor gears and the critical path (mechanical and planning);
  5. shaft inspection and monitoring results (quality and environment).
- **Cases:** the same set and balance as every career.
  - **Foundation:** a client who wants to add load; a steel order.
  - **Intermediate:**
    - team requests to approve;
    - a shift handover of a locked-off machine, with its follow-up;
    - the mezzanine design review (a meeting);
    - an incident: someone else's lock cut off;
    - the depot solar project, in two stages.
  - **Advanced:** cable voltage drop; average emissions against a permit;
    and leading the weekend shutdown.
  - Four cases have variants.
- **Readiness assessments:**
  - level 2: a heater that keeps tripping;
  - level 3: the risk assessment for a crane lift.
  - Each has two versions with different practical work.
- **Story, “Safe Hands”:** a “quick look” without a permit; a calculation the
  client wants issued before it is checked. Holding to the checks changes
  the ending.

## The workshop, in 3D

Northbank's floor has a small workshop where the office has its IT corner
(`src/office/scene/workshop.tsx`, layout in `workshopLayout.ts`).

- **What is there:** a circuit test bench, a pump locked out for maintenance
  (with its red tag), a steel test beam on trestles, the CAD station, and the
  safety equipment board at the entrance.
- **Safety is taught in person:** at the test bench the player first puts on
  safety glasses, then checks the supply is isolated and tested dead.
- **What it opens:** the bench, the beam and the CAD station each open Works
  Desk there. The panel beside the view has _Go to the test bench_.

## Tests

- **Unit tests:**
  - `src/tools/engineering/model.test.ts`: every calculation and safety
    rule;
  - the shared content, balance, assessment and story tests include the
    career.
- **Browser tests:** `tests/e2e/engineering-services.spec.ts`:
  - the circuit task done in the app and marked 100%;
  - lockout-tagout enforced on a work order.
