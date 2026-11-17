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
