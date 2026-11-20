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
Riverside Community Hospital and Northbank Engineering's works.

**Since 2026-11-20 the district can be walked in, and each career goes to its
own building.** Before this, the walkable street stopped at x = 66 and
|z| ≤ 8.6, with invisible walls round it, and "go to work" was the same spot on
the pavement for every career. A healthcare player was sent to Northbank's car
park and could never reach the hospital's door.

- **The career-to-workplace map** (`content/city.ts`: `WORKPLACES`,
  `workplaceFor`): one table gives each employer its entrance (`door`) and the
  way out of it (`out`).

  | Career                                             | Building                                  | Entrance    |
  | -------------------------------------------------- | ----------------------------------------- | ----------- |
  | Healthcare                                         | Riverside Community Hospital              | [77, −19]   |
  | Engineering                                        | Northbank Engineering (its office block)  | [66, 23.75] |
  | Legal                                              | Kestrel & Vane LLP (the east tower)       | [97, 6]     |
  | Finance, Accounting, IT, Marketing, Data, Software | Cobalt Ridge Consulting (the north tower) | [78, 22]    |

  The `office` place's door follows the active career, so "Go to work", the
  route on the map, the door marker and the walk all lead to that building.
  Saves are unaffected: nothing new is stored, and the door comes from the
  career.

- **The walkable world** (`city/streets.ts` `DISTRICT`, `CityScene.tsx`
  `STREET_BOXES`): the invisible walls now enclose the whole district (x 52–112,
  z −34 to 34), behind its buildings. The buildings themselves are solid
  (the rig scans their meshes), so the character walks round them, along the
  pavements and through the car parks, up to the entrances. There is no
  teleport: the character walks the whole way.
- **In at the door** (`doorActivities`, `outOfDoor`): a door with an `out`
  direction is entered the same way as the street's doors. The character walks up
  to it, and the automatic doors open. Walking in at your own workplace starts
  the working day (`CityView` `sceneEnter`). In the evening it says when the
  working day there starts.
- **The buildings say whose they are** (`architecture.tsx` `OfficeTower`): Cobalt
  Ridge's and Kestrel & Vane's towers have a sign over the entrance. Cobalt Ridge
  has a directory board listing its six departments by floor, and the player's
  own department is marked "(you)". The hospital and Northbank already had
  their signs.
- **On the map** (`worldMap.ts` `DISTRICT_BUILDINGS`, `MapDrawing.tsx`): the
  district's buildings and car parks are drawn and named.

Earlier work gave the buildings the following (`city/scene/workplaceGrounds.tsx`,
`architecture.tsx`):

- **Northbank:** an office block on the works' street side: two storeys of
  glazing with the design office seen inside (desks, twin screens, engineers at
  work, drawing boards, lights), an entrance canopy over real automatic doors,
  the sign, a car park with parked cars and lamp columns, a footpath, trees and
  planting.
- **The hospital:** automatic doors at the main entrance, a car park, trees.
- **The towers:** automatic doors in the lobbies, trees and planting.

## Limits

- Each workplace's interior is its own scene. You walk up to the entrance in
  the street and go in, and the working day continues inside. The interiors
  are not built into the street scene.
- The end of the day takes you home through the day-end screen ("Go home"),
  not by walking back out of the entrance.
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
- **The discharge on the ward** (`wardLayout.ts` `DISCHARGE`, `ward.tsx`): once the patient-flow task is done, Daniel Price has gone home (as in Ward Systems) and bed 4A-2 in Bay A is empty. The task's admission is to bed 4A-6, which the 3D bay (four beds; the software has six) does not draw.
- **The ward's scenarios agree with Ward Systems** (`content/scenarios/wardPatients.test.ts`): the ward round, whose patient is a 74-year-old with a chest infection, was set at 4A-2, where Ward Systems has Daniel Price, 46, after a knee operation. It now plays at bed 4B-2 in Bay B, which the systems do not hold, with its patient renamed Derek Novak. Mr Whitfield's admission at 4A-4 matches his record, and his age is now 88, from his date of birth. The test checks that any scenario patient in a bed the systems know is that bed's patient, at their age.
- **People at the district's workplaces** (`CityScene.tsx` `COMERS`): staff and
  visitors walk from the car parks and the bus stop to the hospital, the office
  tower and Northbank's office. The automatic doors open for them (they are
  bodies to the doors, `Walker`'s `body`). They go in, out of sight for a while
  (`inside`), and come back out. `tests/e2e/district-people.spec.ts` sees all
  three doors open with the player at the far end of the street.
- **Each workplace's light** (`world/look/looks.ts`): the ward has cool clinical light, the workshop neutral industrial light, and the law firm a warm light of its own (`law`: as bright as the office, warmer, with a wood-toned bounce). The office floors keep the office light. At Low graphics every place uses the plain lights.
