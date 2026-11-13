# IT Operations tools (the Help Desk's Tools menu)

The Help Desk has an always-available **Tools** menu that works on the
company's shared IT estate (Cobalt Ridge, fictional):

| Group            | Tool                | What the player really does                                                                                                             |
| ---------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure   | Server Room         | Reads the overview and topology, reboots only the broken device, starts a stopped service, checks the provider before anything else     |
| Infrastructure   | Computer Deployment | Builds a computer on the bench: cabling to the right ports, then network imaging or a hand build with a domain join, from the SOP       |
| Infrastructure   | Repair Bench        | Tests a faulty laptop, opens it safely (screws, cover, battery first), swaps the failed part for the exact replacement, proves it boots |
| Infrastructure   | PC Shelf            | Sees the built units, their names and builds, and what still needs registering or re-imaging                                            |
| Email            | Mail Admin          | Message trace with real SMTP codes, mailbox storage and the online archive, inbox rules (including a break-in forwarding rule)          |
| Email            | Mail Security       | Quarantine (release genuine mail, leave look-alikes held) and the company-wide blocked senders                                          |
| Asset management | Asset Management    | The register by asset, person and site; registering new stock; check out and check in; retiring; licences and seats                     |
| Asset management | Ship Manager        | Sends hardware to remote staff: confirmed address, ticket reference, equipment, speed, return label; delivery is a real event           |

## The hands-on simulations

- **The physical setup bench** (`bench/Bench.tsx`, `bench/geometry.ts`): one
  vector drawing that fills the width of the Help Desk.
  - **The hardware:** a laptop with its left side, right side and open lid, or a
    tower's rear and front panels, plus a USB-C dock, a monitor (its screen
    and port panel) and the floor box's DATA and VOICE sockets.
  - **Ports and plugs:** each port is drawn in its real shape (USB-C, USB-A,
    HDMI, DisplayPort, RJ45 with contacts, IEC mains, barrel, audio), and
    every cable in the tray has its own connector drawn.
  - **Connecting:** drag a connector onto a port (or click the cable, then
    the port). Ports that take the plug being held are outlined; a plug
    that does not fit is refused and the port shakes; a connected cable
    stays in its port and its run hangs behind the equipment. Drag a
    connected plug away to unplug it.
  - **The equipment responds to the real state:** the dock and charge
    lights, the tower's power-supply fan, the network link light (only with
    the DATA socket), and the monitor (off, "No signal", then a picture once
    power, the video path and the computer are all there). Nothing moves
    unless the cabling makes it.
- **The bench monitor** around every build screen (bezel, stand, power
  light), with a firmware screen, Windows setup, the deployment wizard and
  sign-in each drawn on their own background.
- **The Repair Bench** (`repair.ts`, `RepairBench.tsx`): a laptop upside down on
  an anti-static mat.
  - **Opening it:** click each of the eight screws out into the screw tray,
    then lift the cover.
  - **Inside:** the mainboard, processor and heat pipe, fan, memory, M.2
    drive, battery and battery connector are drawn. A swollen battery
    bulges and a failed fan is clogged with dust.
  - **Testing:** a power-on test, the built-in diagnostics and the battery
    health give the symptoms the real fault gives (beep code 3,
    "No bootable device", a fan error code, a battery at 31%).
  - **Rules:**
    - parts cannot come out while the battery is connected (refused and
      logged as risky);
    - look-alike parts are refused with the reason (DDR4 in a DDR5 slot, a
      2.5" drive, a 2242 drive, a desktop fan);
    - it goes back only when it is closed up and a power-on test boots it.

## How it is built

- **One system, `itops`** (`src/tools/itops/`), added to a queue's
  `environment` beside network, directory, devices, comms and soc. Queues
  that have no estate get the healthy one (`companyItops()`) the first time a
  tool is opened, so the menu works in every Help Desk queue. Saves without
  it stay valid (the field is optional).
- **Pure actions** (`model.ts`, `deployment.ts`) return the new state and
  problems; a refused action changes nothing, except in a build, where a
  refused answer is counted as a mistake. Risky actions (restarting healthy
  equipment, releasing phishing, unblocking a phishing sender, shutting down
  equipment people depend on) are logged as risky and graded.
- **Tickets react** through `applyEnvironmentChange` like every other system.
  Eleven new conditions: `node-up`, `node-service`, `mailbox-receiving`,
  `message-delivered`, `sender-allowed`, `sender-blocked`, `rule-removed`,
  `has-computer` (with the right build), `asset-status`, `licence-assigned`,
  `delivered`.
- **Systems depend on each other:** an imaging build needs DEPLOY01's PXE
  Responder; a domain join needs a domain controller; everything below a
  dead switch or controller is cut off.
- **Time:** a parcel's delivery counts down in seconds (by speed) and is
  applied by the Help Desk, so it happens whichever section is open and after
  a reload.

## Tasks

| IT order | Task                                         | What it teaches                                                                                                |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 11       | The server room and the mail system          | One floor, not one laptop; fix the service, not the server; trace, quarantine, rules                           |
| 12       | A dead laptop, a new supervisor and a parcel | Both builds from the SOP, registration, a remote shipment with a return label, licences, a repair on the bench |

Later IT tasks moved two places down (13 to 20).

## The reference, and what was decided

The public pages of an existing service desk training product were studied
with REA (browser captures of its public course modules; nothing behind a
sign-in was opened). What was taken was the **list of jobs** a service desk
technician does with each kind of tool, which is common industry practice.
Everything else is WorkSim's own:

| Observed (what such a tool covers)                                   | Decided for WorkSim                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A tools menu grouped by infrastructure, email, knowledge, management | The same three groups in the Help Desk sidebar, next to the existing systems; knowledge stays the Knowledge Base    |
| Server status, topology, equipment and server tables                 | Own layout and data; risky restarts are graded; service problems shown separately from a server being down          |
| A build console with cabling, network imaging and a hand build       | Own ports, cables, SOP, naming rule (`CR-` + D/L/K + asset number), passwords and steps; mistakes and hints counted |
| A stockroom shelf and a register with statuses                       | Own statuses and rules (registration before checkout, re-imaging after return), licences added                      |
| A shipping console with a return label                               | Own form; the address must be confirmed with the person (the file can be stale); delivery resolves the ticket       |
| Message trace, mailbox properties, inbox rules, quarantine, blocks   | Own mailboxes, codes (the real SMTP codes, which are a standard) and scenarios, including a look-alike sender       |

For the visual reconstruction, the illustrations on those public pages were
captured as well (the Server Room overview and topology, the PC Shelf, the
remote desktop). The hands-on simulations themselves are behind the sign-in,
so the physical setup was modelled from the owner's screenshot of it (a
laptop's sides, an equipment area, step progress and an SOP). From that,
WorkSim keeps the experience (a full-width bench, real ports, cables you
plug in, progress, equipment that reacts) and draws everything itself.

No text, images, layouts, names or step lists were copied. Limitations: only
public pages were read; the reference's own app (behind a sign-in) was not
opened, so its exact behaviour is unknown and was not needed.
