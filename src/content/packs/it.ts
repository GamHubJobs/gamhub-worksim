/**
 * Everything specific to the it-support career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { directoryJoiner } from '../assignments/it/directoryJoiner'
import { directoryLeaver } from '../assignments/it/directoryLeaver'
import { majorIncident } from '../assignments/it/majorIncident'
import { networkIntranet } from '../assignments/it/networkIntranet'
import { networkPrinting } from '../assignments/it/networkPrinting'
import { recurringProblem } from '../assignments/it/recurringProblem'
import { triageQueue } from '../assignments/it/triageQueue'
import { userReplies } from '../assignments/it/userReplies'
import {
  outageDiagnosis,
  outageReview,
  outageTriage,
} from '../assignments/it/projectOutage'
import { IT_CASES } from '../cases/it'
import { OPERATIONS_IT } from '../cases/operations/it'
import { WORKFLOW_IT } from '../cases/workflows/it'
import { MEETING_IT } from '../cases/meetings/it'
import { INCIDENT_IT } from '../cases/incidents/it'
import { LEADERSHIP_IT } from '../cases/leadership/it'
import { PROGRAMME_IT } from '../cases/programme/it'
import { ADVANCED_IT } from '../cases/advanced/it'
import { ASSESSMENTS_IT } from '../assessments/it'

export const PACK: CareerPack = {
  careerId: 'it-support',
  assignments: [
    directoryJoiner,
    directoryLeaver,
    majorIncident,
    networkIntranet,
    networkPrinting,
    recurringProblem,
    triageQueue,
    userReplies,
    outageDiagnosis,
    outageReview,
    outageTriage,
  ],
  cases: [
    ...IT_CASES,
    ...OPERATIONS_IT,
    ...WORKFLOW_IT,
    ...MEETING_IT,
    ...INCIDENT_IT,
    ...LEADERSHIP_IT,
    ...PROGRAMME_IT,
    ...ADVANCED_IT,
  ],
  assessments: ASSESSMENTS_IT,
}
