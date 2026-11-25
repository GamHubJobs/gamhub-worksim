/**
 * Where each of a themed workplace's tasks happens on the floor: the piece of
 * equipment the work is about. The medicines round is at the medicines
 * trolley, the observations round at the vital signs stand, the research in
 * the library, disclosure at the scanner, the failing lamp circuit on the test
 * bench, the mezzanine beam on the beam rig. TaskLamps.tsx puts a status lamp
 * there (the patient cases at the patients’ bedsides), lit from the save (amber in hand, red sent back, green done), so the
 * work in the Tasks app is seen where it is done. Tasks not tied to one place
 * (the shared ones: privacy, conflicts) have no spot.
 */
import type { Theme } from './themeLayout'
import { MED_TROLLEY, VITALS } from './wardLayout'
import { WING_BED_X, BAY_B_BEDS } from './wardWing'
import { CONF_TABLE, SCANNER, SHELVES } from './lawWing'
import { COURT_LIST } from './courtroomLayout'
import { BEAM_RIG, CAD_DESK, PUMP, TEST_BENCH } from './workshopLayout'
import { INSPECTION } from './fabWing'

export interface TaskSpot {
  /** The assignment's id (content/assignments). */
  task: string
  /** What the work is, in a few words, for the label. */
  label: string
  x: number
  /** The lamp's height: just above the equipment. */
  y: number
  z: number
}

/** The empty bed in Bay B: the bed management work (discharges, admissions) is marked there. */
export const ADMISSION_BED = BAY_B_BEDS.find((b) => b.patient === null)!

/** Reception's desk (the receptionist's side), where enquiries and clinic lists come in. */
const RECEPTION = { x: -6.2, z: 5.75 }

export const TASK_SPOTS: Record<Theme, TaskSpot[]> = {
  office: [],
  hospital: [
    {
      task: 'ward-medicines',
      label: 'Medicines round',
      x: MED_TROLLEY.x,
      y: 1.25,
      z: MED_TROLLEY.z,
    },
    {
      task: 'ward-observations',
      label: 'Observations round',
      x: VITALS.x,
      y: 1.75,
      z: VITALS.z,
    },
    { task: 'ward-specimens', label: 'Specimens', x: 8.2, y: 1.55, z: -0.8 },
    {
      task: 'ward-beds',
      label: 'Discharge and admission',
      x: WING_BED_X - 1.2,
      y: 1.35,
      z: ADMISSION_BED.z,
    },
    { task: 'ward-clinics', label: 'Clinic list', ...RECEPTION, y: 1.3 },
    // Patient cases (Ward Systems → Patient cases) at Bay B's patients' bedsides.
    {
      task: 'ward-first-case',
      label: 'Your first patients',
      x: WING_BED_X - 1.2,
      y: 1.35,
      z: BAY_B_BEDS[0].z,
    },
    {
      task: 'ward-deteriorating',
      label: 'Patients who get worse',
      x: WING_BED_X - 1.2,
      y: 1.35,
      z: BAY_B_BEDS[1].z,
    },
    {
      task: 'ward-emergencies',
      label: 'Emergencies',
      x: WING_BED_X - 1.2,
      y: 1.35,
      z: BAY_B_BEDS[3].z,
    },
  ],
  law: [
    { task: 'legal-intake', label: 'New enquiries', ...RECEPTION, y: 1.3 },
    {
      task: 'legal-research',
      label: 'Research',
      x: SHELVES[1].x,
      y: 2.15,
      z: SHELVES[1].z + 0.3,
    },
    {
      task: 'legal-disclosure',
      label: 'Disclosure',
      x: SCANNER.x,
      y: 1.4,
      z: SCANNER.z,
    },
    {
      task: 'legal-contract',
      label: 'Millstone contract',
      x: CONF_TABLE.x,
      y: 1.1,
      z: CONF_TABLE.z,
    },
    {
      task: 'legal-deadlines',
      label: 'Deadlines',
      x: COURT_LIST.x,
      y: 1.95,
      z: COURT_LIST.z + 0.05,
    },
  ],
  engineering: [
    {
      task: 'eng-circuit',
      label: 'Lamp circuit',
      x: TEST_BENCH.x,
      y: 1.45,
      z: TEST_BENCH.z,
    },
    { task: 'eng-beam', label: 'Mezzanine beam', x: BEAM_RIG.x, y: 1.6, z: BEAM_RIG.z },
    {
      task: 'eng-maintenance',
      label: 'Conveyor 3 bearing',
      x: PUMP.x,
      y: 1.4,
      z: PUMP.z,
    },
    {
      task: 'eng-drive-plan',
      label: 'Drive and install plan',
      x: CAD_DESK.x,
      y: 1.55,
      z: CAD_DESK.z,
    },
    {
      task: 'eng-quality',
      label: 'Shaft inspection',
      x: INSPECTION.x,
      y: 1.4,
      z: INSPECTION.z,
    },
  ],
}
