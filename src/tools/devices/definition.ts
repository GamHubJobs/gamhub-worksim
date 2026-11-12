/** Devices (device management and remote support): its registration with the tools framework. */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { companyDevices } from './data'
import { DevicesStateSchema, type DevicesState } from './schema'

export const DevicesCheckSchema = z.discriminatedUnion('type', [
  /** The remote session was closed before handing in (good practice). */
  FileCheckBaseSchema.extend({ type: z.literal('disconnected') }),
  /** An action was done on a device (or, with `absent`, must not have been). */
  FileCheckBaseSchema.extend({
    type: z.literal('action'),
    device: z.string(),
    action: z.string(),
    /** The action's detail must contain this (e.g. a process or app name). */
    detail: z.string().optional(),
    absent: z.boolean().default(false),
  }),
])
export type DevicesCheck = z.infer<typeof DevicesCheckSchema>

function gradeCheck(check: DevicesCheck, player: DevicesState) {
  switch (check.type) {
    case 'disconnected':
      return player.session
        ? checkResult(check, 0, [
            `The remote session to ${player.session.device} was left open: disconnect when you are done.`,
          ])
        : checkResult(check, 1, [])
    case 'action': {
      const done = player.log.some(
        (e) =>
          e.device === check.device &&
          e.action === check.action &&
          (!check.detail || e.detail.toLowerCase().includes(check.detail.toLowerCase())),
      )
      const ok = check.absent ? !done : done
      const what = `${check.action}${check.detail ? ` (${check.detail})` : ''} on ${check.device}`
      return checkResult(
        check,
        ok ? 1 : 0,
        ok
          ? []
          : [
              check.absent
                ? `“${what}” should not have been done.`
                : `No “${what}” in the log.`,
            ],
      )
    }
  }
}

export const devices: ToolDefinition<DevicesState, DevicesCheck> = {
  id: 'devices',
  name: 'Devices',
  category: 'Device management and remote support',
  icon: 'device',
  sections: [
    {
      id: 'inventory',
      name: 'Device Management',
      description:
        'Every company computer and printer: who has it, its health, apps and history.',
    },
    {
      id: 'remote',
      name: 'Remote Desktop',
      description: 'Connect to a user’s computer and fix it with its own system tools.',
    },
  ],
  state: DevicesStateSchema,
  practice: () => companyDevices(),
  summary: (state) => {
    const changes = state.log.filter(
      (e) => e.action !== 'Connect' && e.action !== 'Disconnect',
    ).length
    return `${state.devices.length} devices${changes ? `, ${changes} change${changes === 1 ? '' : 's'} made` : ''}`
  },
  check: DevicesCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['The devices were not handed in.']),
    ),
  guide: {
    intro:
      'Device management is how IT support looks after the company’s computers without walking to each desk. Find the device and who uses it, connect with Remote Desktop, use the computer’s own tools to find and fix the problem, then disconnect and record what you did.',
    topics: [
      {
        title: 'A slow computer',
        body: 'Open Task Manager: a process using most of the processor or memory is the usual cause. End it if it is not part of Windows. Then look at Storage: under 10% free slows everything. Disk Cleanup removes temporary files safely.',
      },
      {
        title: 'An app that crashes or will not install',
        body: 'The Event Viewer says why it crashed. Repair fixes damaged files; reinstall fixes the rest. An install needs free space and the Windows Installer service, and only approved software is installed.',
      },
      {
        title: 'Printing, updates, network settings',
        body: 'Printing needs the Print Spooler service; restarting it clears stuck jobs. Updates need the Windows Update service and space, then a restart. A computer that cannot browse while everyone else can often has a proxy or DNS set by hand: set it back to automatic.',
      },
    ],
    glossary: [
      {
        term: 'Remote Desktop',
        meaning: 'Seeing and using a computer from another one.',
      },
      {
        term: 'Process',
        meaning: 'A program running now, using processor time and memory.',
      },
      {
        term: 'Service',
        meaning: 'A background program Windows runs, e.g. the Print Spooler.',
      },
      {
        term: 'Proxy',
        meaning: 'A server web traffic is sent through; a wrong one stops browsing.',
      },
    ],
  },
}
