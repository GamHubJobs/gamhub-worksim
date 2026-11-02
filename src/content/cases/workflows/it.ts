/** Workflows cases: it-support. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

const itOnboarding: CaseInput = {
  id: 'wf-it-onboarding',
  version: 1,
  careerId: 'it-support',
  kind: 'workflow',
  minLevel: 2,
  title: 'A new starter from People & Culture',
  summary: 'HR has sent a new starter’s details. Set up what IT and Facilities need.',
  from: {
    name: 'Grace Okafor',
    role: 'People & Culture Partner',
    organisation: 'People & Culture',
    personId: 'hr',
  },
  trigger: { afterAssignment: 'recurring-problem' },
  deadlineHours: 7,
  email: {
    subject: 'New starter: Priyanka Shah, Monday',
    body: `Hi,

Priyanka Shah joins **Data & Insight** on **Monday** as a Data Analyst. Her form is attached. Can IT get her account, equipment and access ready, and pass the hardware order to Facilities?

Grace`,
  },
  whyItMatters:
    'A new starter’s first day depends on several departments passing the right details to each other. One wrong field on a hand-off (a wrong team, a missing access group, the wrong laptop) means a lost first week.',
  objectives: [
    'Read a hand-off from another department carefully',
    'Spot a conflict between two sources',
    'Pass on exactly what the next department needs',
  ],
  evidence: [
    {
      id: 'form',
      title: 'New starter form (People & Culture)',
      table: {
        head: ['Field', 'Value'],
        rows: [
          ['Name', 'Priyanka Shah'],
          ['Job title', 'Data Analyst'],
          ['Team', 'Data & Insight'],
          ['Manager', 'Amara Nwosu'],
          ['Start date', 'Monday 7 April'],
          ['Equipment', 'Standard laptop'],
          ['Access', 'Data & Insight shared drive, BI tool'],
        ],
      },
    },
    {
      id: 'standards',
      title: 'IT equipment standards',
      text: 'Standard laptop: office work. **Analyst laptop** (more memory): anyone in Data & Insight or Engineering, because of the size of the datasets. Every new account goes in the **All staff** group as well as the team group.',
    },
    {
      id: 'manager',
      title: 'Note from Amara Nwosu (manager)',
      text: 'Priyanka will also need **Data Studio**, like the rest of the team.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The set-up and the hardware order',
      prompt:
        'Complete the set-up record that goes to Facilities and the directory team.',
      to: 'Facilities (hardware) and Directory administration',
      points: 70,
      fields: [
        {
          id: 'username',
          label: 'Username (first initial and surname, lower case)',
          kind: 'text',
          accept: ['pshah'],
          why: 'The naming standard is first initial and surname: pshah.',
        },
        {
          id: 'laptop',
          label: 'Laptop',
          kind: 'choice',
          options: ['Standard laptop', 'Analyst laptop'],
          answer: 'Analyst laptop',
          why: 'Everyone in Data & Insight gets the analyst laptop, whatever the form says.',
        },
        {
          id: 'groups',
          label: 'Groups',
          kind: 'choice',
          options: ['Data & Insight', 'All staff and Data & Insight', 'All staff'],
          answer: 'All staff and Data & Insight',
          why: 'Every account is in All staff as well as the team group.',
        },
        {
          id: 'apps',
          label: 'Apps',
          kind: 'choice',
          options: ['BI tool', 'BI tool and Data Studio', 'Data Studio'],
          answer: 'BI tool and Data Studio',
          why: 'The manager asked for Data Studio as well as the BI tool on the form.',
        },
        {
          id: 'ready',
          label: 'Ready by (date)',
          kind: 'text',
          accept: ['7 april', 'monday 7 april', '07/04', '7/4'],
          why: 'Everything must be ready for her first day, Monday 7 April.',
        },
      ],
    },
    {
      id: 'conflict',
      kind: 'decide',
      title: 'The form and the standard disagree',
      prompt: 'The form says “standard laptop”. What do you do?',
      points: 30,
      options: [
        {
          id: 'standard-rule',
          label:
            'Order the analyst laptop, as the standard requires, and tell Grace so the form template can be fixed',
          verdict: 'best',
          why: 'The standard exists for a reason, and fixing the template stops it happening again.',
          effects: { trust: { hr: 2 }, indicators: { risk: -2 } },
        },
        {
          id: 'as-form',
          label: 'Order what the form says',
          verdict: 'poor',
          why: 'She would get a laptop too small for her work, and someone would have to swap it later.',
          effects: { indicators: { satisfaction: -2 } },
        },
        {
          id: 'ask',
          label: 'Ask Grace which laptop to order and wait for her answer',
          verdict: 'acceptable',
          why: 'Safe, but the standard already answers it, and Monday is close.',
        },
      ],
    },
  ],
  outcomes: {
    pass: {
      trust: { hr: 3, manager: 2 },
      reputation: 2,
      indicators: { satisfaction: 2 },
    },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4 }, reputation: -2 },
  },
  replies: replies(
    'Grace',
    'Perfect, thank you. I’ve updated our form template too.',
    'Facilities and the directory team have queries about some of the details.',
  ),
  lapseLog: 'Priyanka Shah’s set-up was not ready for her first day.',
  skills: { 'customer-service': 15, troubleshooting: 15, accuracy: 15 },
  xp: 90,
}

const itOnboardingFix: CaseInput = {
  id: 'wf-it-onboarding-fix',
  version: 1,
  careerId: 'it-support',
  kind: 'workflow',
  minLevel: 2,
  title: 'The new starter’s first day went wrong',
  summary: 'Priyanka can’t do her work: something in the set-up hand-off was wrong.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
  },
  trigger: {
    afterCase: 'wf-it-onboarding',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 3,
  email: {
    subject: 'Priyanka’s first day',
    body: `Hi,

Priyanka started today but she can’t do her work: her set-up doesn’t match what we asked for. Can you put it right today please?

Amara`,
  },
  whyItMatters:
    'When a hand-off goes wrong, owning it and fixing it fast matters more than whose mistake it was.',
  objectives: [
    'Own a mistake in a hand-off',
    'Put it right quickly',
    'Stop it happening again',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Put it right',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-now',
          label:
            'Correct the set-up today (laptop, groups and apps as the standard and her manager need), and add a check against the standards before hand-offs',
          verdict: 'best',
          why: 'She can work today, and the check stops the next one going wrong.',
          effects: { indicators: { satisfaction: 3, risk: -2 } },
        },
        {
          id: 'fix-only',
          label: 'Correct the set-up today',
          verdict: 'acceptable',
          why: 'It fixes Priyanka, but not the process.',
        },
        {
          id: 'blame',
          label: 'Explain that the form from People & Culture was wrong',
          verdict: 'poor',
          why: 'Partly true, but she still can’t work, and blame doesn’t fix anything.',
          effects: { trust: { hr: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Amara Nwosu',
      title: 'Reply to Amara',
      prompt: 'Apologise, say what you are fixing and when.',
      points: 50,
      minWords: 35,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['today'],
        ['laptop', 'access', 'set-up', 'setup'],
      ],
      avoid: [
        {
          terms: ['HR’s fault', 'not our fault'],
          why: 'Own it: the set-up was ours to check.',
        },
      ],
      model:
        'Hi Amara, I am sorry Priyanka’s first day started badly; the set-up I passed on was not right. I am correcting her laptop, groups and access today, and I have added a check against our standards before every new starter hand-off so it does not happen again. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { satisfaction: -3 } },
  },
  replies: followUpReplies('Amara'),
  lapseLog: 'Priyanka went a second day without the set-up she needs.',
  skills: { 'customer-service': 15, 'incident-management': 15 },
  xp: 50,
}

export const WORKFLOW_IT: CaseInput[] = [itOnboarding, itOnboardingFix]
