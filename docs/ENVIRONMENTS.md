# Workplace environments: audit and status

How each career's physical workplace looks and works, what was found missing,
what has been built, and what is still not done. Reviewed in the real game
with the screenshot tour (`npm run shots:environments`), not from code alone.

## How a workplace is put together

Every career walks the same floor plan (reception, the desks, the manager's
office, the break room, a corner on the right), so movement, colleagues,
meetings and saves work the same everywhere. What differs:

| Layer                      | Where                                       | What it changes                                                                                                                     |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Area names                 | `content/departments/*` (`places`)          | e.g. the ward desk, the design office, the kitchen                                                                                  |
| The workplace's own corner | `office/scene/bays.ts`                      | The bay of beds, the workshop, the moot courtroom, or a Cobalt Ridge department's room; its activities open the career's tool there |
| The whole-floor theme      | `office/scene/themeLayout.ts`, `themes.tsx` | Floors and colours, and the rooms such workplaces really have, in the floor's spare spaces                                          |
| Colleagues                 | `content/departments/*` (`team`)            | Names and roles at the desks                                                                                                        |

## Research

Layouts follow published design guidance and descriptions of real workplaces
(the sources are listed in the development log):

- **Hospital ward** (NHS Health Building Note 04-01 and its Scottish and Welsh
  versions): a nurses' station, a treatment or clean utility room with the
  medicines, a dirty utility (sluice), the ward manager's office, an interview
  or relatives' room, and staff lockers.
- **Law firm:** reception with a client meeting room off it, so clients do not
  cross the working floor; partners' offices; an open-plan floor for
  paralegals; a smaller library and file room than in the past.
- **Engineering firm:** a well-lit design office, a project room with a large
  table for reviewing drawings, a plot room and stores, and a workshop with
  benches, tool storage and PPE.

REA, the reverse-engineering toolkit available in this project, analyses
software (binaries, apps, network captures). It cannot research room
layouts, so ordinary web search was used for this.

## Audit findings (before this work)

| Finding                                                                                                                    | Careers affected                                           |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| The camera squashed up behind the character's head in small rooms (the manager's office), hiding the room                  | All                                                        |
| The same office for everyone: the hospital's "nurses' station" was office desks, its "staff room" the office break room    | Healthcare, Law, Engineering                               |
| Six Cobalt Ridge careers had the IT team's corner (comms cabinet, IT bench), unrelated to their work                       | Finance, Accounting, Marketing, Data, Software Development |
| Career tools were opened only from the desk computer, never at a physical object                                           | All except Healthcare, Law, Engineering (one corner each)  |
| The minimap said "At the office" at the hospital and the law firm; the street's door to work was "The office" for everyone | Healthcare, Law, Engineering                               |
| Reception's sign read "Consulting · Finance · Advisory" at the law and engineering firms (fixed earlier)                   | Law, Engineering                                           |

## What each workplace has now

| Career                   | Its own corner (opens)                                                                        | Whole-floor theme and rooms                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance & Administration | Post & print room: supplies cupboard (Grid Craft), sorting table with the post (Mail), copier | The office                                                                                                                                                                                |
| Accounting               | Records room: ledger desk and filing cabinets (Books), safe, archive                          | The office                                                                                                                                                                                |
| IT Help Desk             | IT corner: comms cabinet and IT bench (on-site IT jobs)                                       | The office                                                                                                                                                                                |
| Digital Marketing        | Content studio: photo set and campaign wall (Social Planner)                                  | The office                                                                                                                                                                                |
| Data Analysis            | Insights wall: live dashboards (Data Studio), standing table (Grid Craft)                     | The office                                                                                                                                                                                |
| Software Development     | Dev team area: pairing desk (Code), sprint board (Tasks), test devices, build monitor         | The office                                                                                                                                                                                |
| Healthcare               | Bay A: four beds and the medicines trolley (Ward Systems)                                     | Hospital vinyl and teal; a treatment room with the medicines (Ward Systems), the sluice door, a relatives' room, a patient status board, staff lockers, a wheelchair at the ward entrance |
| Law                      | Moot courtroom: counsel's table and the court list (Matter Desk)                              | Burgundy carpet; a library and file room and a client meeting room off reception (both Matter Desk); the partner's law reports                                                            |
| Engineering              | Workshop: test bench, test beam, CAD station (Works Desk), locked-out pump, PPE board         | Grey lino and navy; a plot room and stores and a project room (both Works Desk); site reception with hard hats and a sign-in screen; mess room lockers                                    |

Every one of these activities is done at its object: the character walks
there, plays the activity (cleaning hands, unlocking the cupboard, taking the
drawings off the plotter) and the tool then opens at the right place.

**Knowing where you are:** the panel shows the room within the area ("Now in:
Treatment room"), each room has its name over the door, and the minimap and
the street name the real employer.

**The camera:** in small rooms it rises to look down rather than squash up
behind the character's head. Signs hide when seen from behind, instead of
showing through the wall reversed.

## Still not done

- **One floor plan for every career.** The hospital, the law firm and the
  engineering firm have their own rooms, colours and dressing, but the same
  walls and areas as the office. A real ward's layout (a corridor with several
  bays and side rooms) would need its own floor plan, colleague routes and
  meeting places: a much larger change than dressing.
- **No separate courthouse building.** The moot courtroom inside the firm
  stands in for it.
- **The desks themselves** are the office's desks in every workplace (the
  nurses' station is not a counter, the design office has no drawing boards).
  Changing them means moving the colleagues' seats and the player's computer.
- **Tools still open as windows on the work computer.** The activity happens
  at the object, then the computer screen replaces the 3D view.
- **The city and home** were not part of this audit.
