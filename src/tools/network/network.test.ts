import { describe, expect, it } from 'vitest'
import {
  restartDevice,
  restartService,
  setDnsRecord,
  switchToAutomaticSettings,
} from './actions'
import { intranetScenario, officeNetwork, printingScenario } from './data'
import { NetworkStateSchema } from './schema'
import { reachable, resolve, runCommand } from './simulation'

const text = (lines: string[]) => lines.join('\n')

describe('the healthy office network', () => {
  const net = officeNetwork()

  it('is a valid file', () => {
    expect(NetworkStateSchema.safeParse(net).success).toBe(true)
  })

  it('answers the usual commands', () => {
    expect(text(runCommand(net, 'IT-PC-07', 'ping print-01'))).toContain(
      'Received = 4, Lost = 0',
    )
    expect(text(runCommand(net, 'IT-PC-07', 'nslookup intranet'))).toContain(
      'Address:  10.20.0.21',
    )
    expect(text(runCommand(net, 'IT-PC-07', 'ipconfig'))).toContain(
      'Default Gateway . . . . . . . . : 10.20.1.1',
    )
    expect(
      text(runCommand(net, 'IT-PC-07', 'tracert portal.clientcloud.example')),
    ).toContain('Trace complete.')
    expect(text(runCommand(net, 'IT-PC-07', 'portcheck intranet 443'))).toContain(
      'TcpTestSucceeded: True',
    )
    expect(text(runCommand(net, 'IT-PC-07', 'ping nowhere'))).toContain(
      'could not find host',
    )
    expect(text(runCommand(net, 'IT-PC-07', 'dir'))).toContain('is not recognised')
  })
})

describe('the printing scenario', () => {
  it('shows a stopped spooler and a wrong gateway, and both can be fixed', () => {
    let net = printingScenario()
    // The print server answers, but its printing service does not.
    expect(text(runCommand(net, 'IT-PC-07', 'ping print-01'))).toContain('Lost = 0')
    expect(text(runCommand(net, 'IT-PC-07', 'portcheck print-01 631'))).toContain(
      'TcpTestSucceeded: False',
    )
    // Maya reaches her own floor, but nothing beyond the gateway.
    expect(reachable(net, 'LT-0153', '10.20.2.50')).toBe(true)
    expect(text(runCommand(net, 'LT-0153', 'ping 10.20.0.20'))).toContain(
      'Destination host unreachable',
    )
    expect(text(runCommand(net, 'LT-0153', 'ipconfig'))).toContain('10.20.2.254')

    net = restartService(net, 'PRINT-01', 631).state
    net = switchToAutomaticSettings(net, 'LT-0153').state
    expect(text(runCommand(net, 'IT-PC-07', 'portcheck print-01 631'))).toContain(
      'TcpTestSucceeded: True',
    )
    expect(reachable(net, 'LT-0153', '10.20.0.20')).toBe(true)
    expect(net.actions.map((a) => a.action)).toEqual([
      'Restart service',
      'Use automatic settings',
    ])
  })
})

describe('the intranet scenario', () => {
  it('separates a wrong record, a wrong DNS server and a dead access point', () => {
    let net = intranetScenario()
    // Everyone: the name points at the switched-off server.
    expect(resolve(net, 'IT-PC-07', 'intranet')).toMatchObject({
      ok: true,
      ip: '10.20.0.25',
    })
    expect(text(runCommand(net, 'IT-PC-07', 'ping intranet'))).toContain(
      'Request timed out.',
    )
    expect(text(runCommand(net, 'IT-PC-07', 'portcheck 10.20.0.21 443'))).toContain(
      'TcpTestSucceeded: True',
    )
    // Sam: names don't resolve at all, but addresses work.
    expect(text(runCommand(net, 'LT-0156', 'nslookup intranet'))).toContain('timed out')
    expect(reachable(net, 'LT-0156', '10.20.0.21')).toBe(true)
    // The access point can't be fixed remotely.
    expect(restartDevice(net, 'AP-FL2').problems[0]).toContain('on site')

    net = setDnsRecord(net, 'intranet', '10.20.0.21').state
    net = switchToAutomaticSettings(net, 'LT-0156').state
    expect(resolve(net, 'LT-0156', 'intranet')).toMatchObject({
      ok: true,
      ip: '10.20.0.21',
    })
    expect(text(runCommand(net, 'LT-0156', 'portcheck intranet 443'))).toContain(
      'TcpTestSucceeded: True',
    )
  })
})
