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

| Career                   | Its own corner (opens)                                                                                                                                              | Whole-floor theme and rooms                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance & Administration | Post & print room: supplies cupboard (Grid Craft), sorting table with the post (Mail), copier                                                                       | The office                                                                                                                                                                                |
| Accounting               | Records room: ledger desk and filing cabinets (Books), safe, archive                                                                                                | The office                                                                                                                                                                                |
| IT Help Desk             | IT corner: comms cabinet and IT bench (on-site IT jobs)                                                                                                             | The office                                                                                                                                                                                |
| Digital Marketing        | Content studio: photo set and campaign wall (Social Planner)                                                                                                        | The office                                                                                                                                                                                |
| Data Analysis            | Insights wall: live dashboards (Data Studio), standing table (Grid Craft)                                                                                           | The office                                                                                                                                                                                |
| Software Development     | Dev team area: pairing desk (Code), sprint board (Tasks), test devices, build monitor                                                                               | The office                                                                                                                                                                                |
| Healthcare               | Bay A: four beds and the medicines trolley; through its far wall, the ward wing: a corridor, Bay B (four beds) and two side rooms, one for isolation (Ward Systems) | Hospital vinyl and teal; a treatment room with the medicines (Ward Systems), the sluice door, a relatives' room, a patient status board, staff lockers, a wheelchair at the ward entrance |
| Law                      | Moot courtroom: counsel's table and the court list (Matter Desk)                                                                                                    | Burgundy carpet; a library and file room and a client meeting room off reception (both Matter Desk); the partner's law reports                                                            |
| Engineering              | Workshop: test bench, test beam, CAD station (Works Desk), locked-out pump, PPE board                                                                               | Grey lino and navy; a plot room and stores and a project room (both Works Desk); site reception with hard hats and a sign-in screen; mess room lockers                                    |

Every one of these activities is done at its object: the character walks
there, plays the activity (cleaning hands, unlocking the cupboard, taking the
drawings off the plotter) and the tool then opens at the right place.

**Knowing where you are:** the panel shows the room within the area ("Now in:
Treatment room"), each room has its name over the door, and the minimap and
the street name the real employer.

**The camera:** in small rooms it rises to look down rather than squash up
behind the character's head. Signs hide when seen from behind, instead of
showing through the wall reversed.

## Since the audit

- **Live scenarios** (see [SCENARIOS.md](SCENARIOS.md)): 18 professional
  events, two per career, played in person in these rooms. The people
  involved are posed at their places, speak with gestures and name tags, and
  walk round the furniture between beats; a fixed camera frames each scene.
- **The desk area:** the divider between the desk rows is a nurses' station
  counter (hospital), a run of pinned drawings (engineering) or lever-arch
  files (law). The desks are each workplace's own (`deskStyles.tsx`):
  - engineering: drawing boards with a pinned drawing, a parallel rule, an
    angled lamp and rolled drawings, instead of monitors;
  - hospital: white worktops with patients' notes folders in a rack, gloves
    and hand gel beside the computer;
  - law: walnut desks with a green banker's lamp, a leather pad and a brief
    tied with pink tape.

  The player's own desk keeps its computer everywhere.

- **Framing fixes from the screenshots:** the judge's chair, people blocking
  the camera, overhead signs in front of the camera at the desk, and prompts
  and the area panel stepping aside during scenes.

## Still not done

- **Each career-specific workplace has its own wing; the main floor's outer
  walls are shared.** The hospital goes on into a ward wing (a corridor, Bay
  B, two side rooms), the engineering firm into a fabrication shop (a lathe,
  a welding bay behind screens, an inspection bench, steel stock, a forklift)
  and the law firm into a records room and conference suite, each through a
  doorway from its corner (`wingShell.ts`). The main floor itself (reception,
  the desks, the manager's office, the break room) keeps the office's walls.
  Colleagues' daily routes and the team's meeting places stay on the main
  floor; each wing has its own person at work (the Bay B nurse, the
  fabricator, the records clerk).
- **The courthouse is reached from work only.** Westmark County Court has
  its own interior and hearing (see [SCENARIOS.md](SCENARIOS.md#at-court)),
  and stands on the high street (columns, steps, its crest), marked on the
  maps. In the street its door is shut, because the court only sits while
  the player is at work.
- **The desks keep the office's places.** Each workplace now has its own
  desks (drawing boards in engineering, clinical worktops in the hospital,
  walnut desks at the law firm), but in the same two rows, so colleagues sit
  where they always did. A real nurses' station counter, at standing height,
  would mean new seats and routes.
- **Tools are held up, not drawn into the scene.** A tool used at an object
  (the bedside, counsel's table, the test bench) opens on the device used
  there (a tablet on the ward, a laptop at the law firm, a rugged tablet in
  the workshop) beside the player, with the camera close over their
  shoulder on the thing. The device is drawn over the 3D view, not as a
  mesh in the room: a screen rendered inside the 3D scene would be hard to
  read and to type into.
- **The city and home** were not part of this audit.
