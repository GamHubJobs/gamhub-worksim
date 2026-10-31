/** IT Services: the service desk that keeps everyone working. */
import { COMPANY } from '../company'
import type { Department } from './types'

export const itSupport: Department = {
  careerId: 'it-support',
  name: 'IT Services',
  sign: 'IT SERVICES',
  manager: {
    id: 'manager',
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    email: `ravi.menon@${COMPANY.emailDomain}`,
    initials: 'RM',
    color: 'bg-cyan-700',
    startingTrust: 50,
    personality:
      'Unflappable in a crisis and obsessed with the customer experience. Measures everything, from response times to how polite a reply is.',
  },
  senior: {
    id: 'senior',
    name: 'Jess Taylor',
    role: 'Senior Support Analyst',
    email: `jess.taylor@${COMPANY.emailDomain}`,
    initials: 'JT',
    color: 'bg-lime-700',
    startingTrust: 40,
    personality:
      'Knows every system in the building and fixes most problems before you finish describing them. Short on patience for guesswork, generous with real explanations.',
  },
  director: 'the head of IT',
  intro:
    'IT Services runs the service desk: we help colleagues with their laptops, accounts, email, networks and software, and keep the systems running.',
  standup: {
    senior:
      'Twelve tickets overnight, mostly password resets. The VPN looked unhappy at six; I am watching it.',
    facilities:
      'The meeting room screens keep switching inputs. Not my department, I know, I know.',
  },
  planning: {
    lines: [
      'This week we roll out the new laptops to the sales team. Thirty machines, two days.',
      '{senior} is leading the rollout. I need someone to prepare the user checklists and answer questions.',
      'Any volunteers?',
    ],
    volunteerReply: 'Great. Bring a label printer and patience.',
    nobodyReply: 'Then I will image them all myself. Again.',
  },
  seniorWork:
    'Escalations, the network, the servers, and anything the first line cannot fix. Plus explaining to managers why “it is slow” is not a fault description.',
  seniorTeaches:
    'I will teach you how to ask the right questions. Half of support is diagnosis.',
  seniorSmallTalk: [
    'Have you tried turning it off and on again? I am only half joking. It fixes more than you would think.',
    'Write down what you did on every ticket. The next person who opens it might be you.',
    'Never share a password over the phone. Not even with {manager}. Especially not with {manager}.',
  ],
  tips: [
    'Priority is impact times urgency: how many people are affected, and how soon it hurts.',
    'Ask for the exact error message. “It doesn’t work” could mean anything.',
    'Anything that smells like phishing or a security breach is escalated straight away.',
    'Reply in plain words: say what you did, what the user needs to do, and when you will follow up.',
    'If three people report the same thing, it is probably not three problems; it is one incident.',
    'Close the loop: confirm with the user that it is fixed before you resolve the ticket.',
  ],
  news: [
    'New laptops for the sales team this week. Back up anything on your desktop!',
    'Reminder: IT will never ask for your password by email.',
    'The VPN will be updated on Saturday morning; expect a short interruption.',
    'New starters: your account and laptop are ready on your first morning at the service desk.',
  ],
}
