# Workplaces: every career, where it works, and what is there

The audit for the "every career's workplace" brief (2026-11-16), taken from the
code, not from plans. It covers the nine careers in `src/content/departments/`,
their workplaces, and how the street outside relates to them.

## How workplaces are built

- **One walkable floor, dressed per employer** (`office/scene/OfficeScene.tsx`):
  - **Theme** (`themeLayout.ts`, `themes.tsx`): the hospital, the law firm and
    the engineering firm each turn the floor's spare spaces into their own rooms,
    and dress reception, the desks, the manager's office and the break room.
  - **Corner** (`bays.ts`): each workplace has its own corner of the floor.
  - **Wings** (`wardWing`, `lawWing`, `fabWing`): rooms off the floor, through a
    doorway.
- **Objects open the career's software.** An activity's action is
  `open:<app>` or `open:tool:<tool>` (bays.ts). Walking to the object and
  pressing E plays the physical action, then opens the app on the spot.
- **People:** each department has its own cast and routines (`officeCast.ts`,
  `world/npc/schedule.ts`). Each workplace has its own clothing (`workwear.ts`):
  scrubs, high-vis and PPE, suits.
- **Places outside work:** the street, home and the places in town
  (`city/scene`), and for two careers a place of work away from the office: the
  county court (law) and the construction site (engineering).

## Career → workplace

| Career                   | Employer                      | Floor            | Its own rooms and equipment                                                                                                                                                                                                                                                                                                   | Objects → software                                                        |
| ------------------------ | ----------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Finance & Administration | Cobalt Ridge Consulting       | office           | post and print room: copier, pigeonholes, supplies cupboard, sorting table                                                                                                                                                                                                                                                    | supplies → Grid Craft; post → Mail                                        |
| Accounting               | Cobalt Ridge                  | office           | records room: safe, filing cabinets, archive, ledger desk                                                                                                                                                                                                                                                                     | ledgers, invoices → Books                                                 |
| IT Help Desk             | Cobalt Ridge                  | office           | IT corner: 19-inch comms rack (patch panel, switch, router, servers, UPS), repair bench with an opened PC, multimeter, tools                                                                                                                                                                                                  | cabinet, bench, colleagues' desks → hands-on jobs; Help Desk, Server Room |
| Digital Marketing        | Cobalt Ridge                  | office           | content studio: photo set, campaign wall                                                                                                                                                                                                                                                                                      | Social Planner                                                            |
| Data Analysis            | Cobalt Ridge                  | office           | insights wall: live dashboards, standing table                                                                                                                                                                                                                                                                                | Data Studio, Grid Craft                                                   |
| Software Development     | Cobalt Ridge                  | office           | team area: sprint board, test devices, pairing desk                                                                                                                                                                                                                                                                           | Code (the IDE), Tasks                                                     |
| Healthcare               | Riverside Community Hospital  | hospital ward    | Bay A: beds with rails and castors, patient monitors with live ECG, drip stands, bed-head services, curtain tracks, resuscitation trolley and defibrillator, vital signs stand, medicines trolley, sharps and gloves; nurses' station; treatment room; ward wing (corridor, Bay B, two side rooms, isolation PPE); staff room | bedside → Ward Systems; treatment room → medicines                        |
| Legal                    | Kestrel & Vane LLP (law firm) | law firm         | moot courtroom (panelled bench, clerk, witness box, counsel's tables, exhibit screen); library; client meeting room; records and conference suite; plus Westmark County Court                                                                                                                                                 | counsel's table, library, intake → Matter Desk                            |
| Engineering              | Northbank Engineering Ltd     | engineering firm | workshop (test bench, pump on skid, test beam, CAD station, PPE board); fabrication shop (lathe, welding bay, steel rack, inspection bench, forklift); project room; plot room; construction site (excavator, crane, mixer, lorry, bulldozer, generator, the building stage by stage)                                         | CAD station, drawings → Works Desk, Projects, CAD Craft, FreeCAD bridge   |

## What a task changes in the world (already in place)

- **IT:** a ticket's hardware is fixed in person, and the rack's fault light and
  the device state follow the systems.
- **Engineering:** an approved, issued revision is what the site builds.
  Materials arrive and run down, and the site's stages change the physical
  building.
- **Healthcare:** the observations and escalations are done at the bed. The
  monitor follows the patient.
- **Law:** hearings are held in the courtroom.

## The street's workplace buildings

The end of the street is the business district. It has the office towers,
Riverside Community Hospital and Northbank Engineering's works, and they are
seen from the street. In the street the player goes to work at "the road to
work" (the commute), and arrives at the workplace through its doors (the
office's automatic entrance).

The towers, hospital and works were exteriors with nothing in front of them.
They now have the following (`city/scene/workplaceGrounds.tsx`, `architecture.tsx`):

- **Northbank:** an office block on the works' street side: two storeys of
  glazing with the design office seen inside (desks, twin screens, engineers at
  work, drawing boards, lights), an entrance canopy over real automatic doors,
  the sign, a car park with parked cars and lamp columns, a footpath, trees and
  planting.
- **The hospital:** automatic doors at the main entrance, a car park, trees.
- **The towers:** automatic doors in the lobbies, trees and planting.

## Limits

- The district's buildings are seen from the street, not entered from it: each
  career's workplace is its own scene, reached by the commute. A walkable
  district (every interior inside the street scene) would mean rebuilding the
  scene structure. That was not done.
- No education career exists, so no school or laboratory was invented.
- The six Cobalt Ridge careers share one office building, with a department
  corner each. That is the design: one consultancy with six departments.

## Shared systems for every workplace (2026-11-17)

- **Work stations** (`office/scene/stations.ts`): derived from a workplace's
  activities. Colleagues go to them through the day. A new career's workplace
  gets them from its activities, with nothing else to add.
- **The work shown** (`workBoard.ts`, `workState.ts`, `TeamBoard.tsx`): the
  team board and each department's equipment read the save. To make a new
  workplace's equipment show the work, read `useWork()` in its corner.
- **Each task at its equipment** (`taskSpots.ts`, `TaskLamps.tsx`): in the
  ward, the law firm and the engineering firm, each of the career's tasks has a
  status lamp on the equipment it is done at. The lamp is white while the task
  is to start, amber while it is in hand, red when it was sent back, and green
  when it is done. Up close, a tag names the work and its state.

  | Workplace   | Task → where its lamp is                                                                                                                                                                    |
  | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Ward        | medicines round → medicines trolley; observations → vital signs stand; specimens → the sharps and gloves station; discharge and admission → the empty bed in Bay B; clinic list → reception |
  | Law firm    | new enquiries → reception; research → the library; disclosure → the scanner; Millstone contract → the conference table; deadlines → the court list                                          |
  | Engineering | lamp circuit → test bench; mezzanine beam → beam rig; Conveyor 3 bearing → the pump; drive and install plan → CAD desk; shaft inspection → inspection table                                 |

  Locked tasks (not yet given) have no lamp. To add a workplace's tasks, add
  them to `TASK_SPOTS`. The unit test checks each spot names one of that
  career's tasks.

- **Working together** (`officeCast.ts`): at 14:30 on weekdays, a 15-minute
  huddle at the workplace's main work station. The senior colleague works at
  it and two of the team stand in beside them. Chat shows them as busy.
- **Responding to the work** (`officeCast.ts`): while any of the player's
  work has been sent back, the senior colleague now and then comes to the
  player's desk "going through the work that came back".
- **The discharge on the ward** (`wardLayout.ts` `DISCHARGE`, `ward.tsx`): once
  the patient-flow task is done, Daniel Price has gone home (as in Ward
  Systems) and bed 4A-2 in Bay A is empty. The exception is while the ward
  round scenario is played there: its patient is the one in that bed. The
  task's admission is to bed 4A-6. The software has six Bay A beds and the 3D
  bay four, so that bed is not drawn. (The scenario's patient at 4A-2, Derek
  Price, 74, is a different patient from the software's Daniel Price, 46. That
  content mismatch predates this work.)
- **People at the district's workplaces** (`CityScene.tsx` `COMERS`): staff and
  visitors walk from the car parks and the bus stop to the hospital, the office
  tower and Northbank's office. The automatic doors open for them (they are
  bodies to the doors, `Walker`'s `body`). They go in, out of sight for a while
  (`inside`), and come back out. `tests/e2e/district-people.spec.ts` sees all
  three doors open with the player at the far end of the street.
