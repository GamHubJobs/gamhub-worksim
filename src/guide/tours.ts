/**
 * The guided tours: the introduction to WorkSim, and one for each app and
 * profession tool. Each step highlights a real part of the screen (a CSS
 * selector) and says what it does; a step may first take the player to the
 * office or the computer, or open an app, so the thing it describes is there.
 *
 * Tours describe what is built, nothing more. A tool's tour is made from the
 * tool's own guide (tools/<tool>/definition.ts), so it stays true as the
 * tool changes. Tours can be replayed, skipped, paused and resumed (see
 * TourOverlay and the player's `work.guide`).
 */
import { allTools } from '../tools/registry'

export interface TourStep {
  /** What to highlight (a CSS selector); none: a card in the middle. */
  target?: string
  title: string
  body: string
  /** Where the player must be for this step. */
  place?: 'office' | 'computer'
  /** An app to open first (its view's app ID). */
  open?: string
}

export interface Tour {
  id: string
  title: string
  summary: string
  /** The window the tour belongs to (its key), for app tours. */
  app?: string
  steps: TourStep[]
}

/** Inside a window: the selector scoped to it. */
const win = (key: string, selector = '') =>
  `[data-testid="window-${key}"]${selector ? ` ${selector}` : ''}`

export const INTRO_TOUR: Tour = {
  id: 'intro',
  title: 'Welcome to WorkSim',
  summary:
    'The office, moving about, people, things, your computer, apps, windows, tasks, mail, your career, skills, AI and saving.',
  steps: [
    {
      place: 'office',
      title: 'Your workplace',
      body: 'This is the office where your career happens. Colleagues come and go on their own day; you do real work at your computer, and some work in person around the office.',
    },
    {
      place: 'office',
      target: '[data-testid="office-3d"]',
      title: 'Moving about',
      body: 'W, A, S and D (or the arrow keys) walk; Shift runs. Drag the mouse, or press Q and R, to look around; the wheel zooms. On a touch screen, use the stick and the Use button.',
    },
    {
      place: 'office',
      target: '[data-tour="view-toggle"]',
      title: 'Two ways to see the office',
      body: 'From behind your character, or top-down, looking straight down on the floor. Your choice is remembered.',
    },
    {
      place: 'office',
      target: '[data-testid="office-panel"]',
      title: 'People and things',
      body: 'Walk up to a colleague or an object and press E (“Press E to …” appears when you are close enough). This panel lists what you can do where you are, and does it for you too.',
    },
    {
      place: 'office',
      target: 'nav[aria-label="Places"]',
      title: 'Places',
      body: 'Walk to another area: your character goes there. Moving between areas takes office time, as at work.',
    },
    {
      place: 'office',
      target: '[data-tour="guide-bar"]',
      title: 'Your next step',
      body: 'This always says what to do next, from where you are and what you are doing. Collapse it when you know your way; it is still there when you need it.',
    },
    {
      place: 'computer',
      target: 'nav[aria-label="Apps"]',
      title: 'Your computer and its apps',
      body: 'At your desk, press E at the computer. The taskbar holds your apps: Mail, Tasks, the office apps and your career’s own tools. Leave desk takes you back to the office.',
    },
    {
      place: 'computer',
      open: 'mail',
      target: win('mail', '[data-testid="window-title-bar"]'),
      title: 'Windows',
      body: 'Every app opens in a window. The buttons on the right minimise it to the taskbar, maximise or restore it, and close it (your work is saved first). Drag the title bar to move it; double-click it to maximise.',
    },
    {
      place: 'computer',
      open: 'mail',
      target: win('mail'),
      title: 'Mail: workplace communication',
      body: 'Your manager’s briefings, replies from colleagues, feedback on your work and promotions arrive here. A briefing opens its task.',
    },
    {
      place: 'computer',
      open: 'tasks',
      target: win('tasks'),
      title: 'Tasks',
      body: 'Every task: what it is for, its steps and hints, the files it needs, and your results. Start task opens the work; Submit hands it in and it is graded straight away.',
    },
    {
      place: 'computer',
      target: '[data-testid="player-chip"]',
      title: 'Your career',
      body: 'Your name, level and XP. Click it for Career: what your next promotion needs, your reviews, your team and your authority.',
    },
    {
      place: 'computer',
      target:
        'nav[aria-label="Apps"] button[aria-label^="Readiness"], nav[aria-label="Apps"] button[title^="Readiness"]',
      title: 'Skills, achievements and assessments',
      body: 'Readiness has the assessments for each level and what you have shown; the Portfolio keeps your completed work and your skills. They record work in a simulation, not a qualification.',
    },
    {
      place: 'computer',
      target:
        'nav[aria-label="Apps"] button[aria-label^="WorkSim AI"], nav[aria-label="Apps"] button[title^="WorkSim AI"]',
      title: 'WorkSim AI',
      body: 'An assistant that explains and coaches; it does not do graded work for you. It works offline with a built-in guide, or with your own AI provider’s key, which stays on this computer.',
    },
    {
      place: 'computer',
      title: 'Saving and coming back',
      body: 'Everything is saved as you go, on this computer. Storage & backup (in the Start menu, or the bar above the office) makes a backup file you can restore. Help, and the guided tours, are always in the Start menu and the game menu (Esc).',
    },
  ],
}

const APP_TOURS: Tour[] = [
  {
    id: 'app:helpdesk',
    app: 'helpdesk',
    title: 'Help Desk',
    summary:
      'Tickets, the systems, communications, the Tools, and hands-on work in the office.',
    steps: [
      {
        target: win('helpdesk', 'nav[aria-label="Help Desk sections"]'),
        title: 'The sections',
        body: 'The service desk (Overview, Ticket queue, Knowledge Base, Reports), the systems this queue is connected to, communications, security, and the Tools that are always there.',
      },
      {
        target: win(
          'helpdesk',
          '[role="tab"][title="Overview"], [role="tab"]:first-child',
        ),
        title: 'Overview',
        body: 'What is open, what is urgent, SLAs and business impact: where to start.',
      },
      {
        target: win(
          'helpdesk',
          'nav[aria-label="Help Desk sections"] [role="tab"][title^="Ticket queue"]',
        ),
        title: 'Ticket queue',
        body: 'Open a ticket to read it, assign it to yourself, set its priority and category, reply, and write notes. Tickets tied to the systems resolve when the problem is really fixed, and their history says what happened.',
      },
      {
        target: win(
          'helpdesk',
          'nav[aria-label="Help Desk sections"] [role="tab"][title="Knowledge Base"]',
        ),
        title: 'Knowledge Base',
        body: 'The service desk’s articles: symptoms, diagnosis, the fix and when to escalate. Search it and bookmark what you use.',
      },
      {
        target: win(
          'helpdesk',
          'nav[aria-label="Help Desk sections"] [role="tab"][title="Reports"]',
        ),
        title: 'Reports',
        body: 'Resolution, SLAs, first-contact resolution, reopened tickets and estimated satisfaction, from your own queues.',
      },
      {
        target: win(
          'helpdesk',
          'nav[aria-label="Help Desk sections"] [role="tab"][title="Server Room"]',
        ),
        title: 'The Tools',
        body: 'The company’s IT estate: Server Room, Computer Deployment, PC Shelf, Repair Bench, Mail Admin, Mail Security, Asset Management and Ship Manager. What can be done remotely is done here.',
      },
      {
        target: win('helpdesk'),
        title: 'Hands-on work, in person',
        body: 'A switch that has stopped answering, a laptop to repair, a computer to build: these are done in the office. Leave desk, walk to the marker (the comms cabinet, the IT workbench or a colleague’s desk) and press E. The ticket updates when you are done.',
      },
    ],
  },
  {
    id: 'app:sheets',
    app: 'sheets',
    title: 'Grid Craft',
    summary: 'Workbooks, formulas, the grid, charts, and the task pane.',
    steps: [
      {
        target: win('sheets'),
        title: 'Grid Craft',
        body: 'The spreadsheet for finance, administration and accounting work: your workbooks are listed first; a task opens its own workbook.',
      },
      {
        target: win('sheets', '[data-testid="selected-address"]'),
        title: 'The cell and its formula',
        body: 'The selected cell’s address, and what is in it: type a value or a formula starting with =. Formula help appears as you type.',
      },
      {
        target: win('sheets', '[data-testid="sheet-grid"]'),
        title: 'The grid',
        body: 'Click a cell, or move with the arrow keys; Enter goes down, Tab goes right. Copy, paste, undo and fill work as in any spreadsheet.',
      },
      {
        target: win('sheets', '[data-testid="status-bar"]'),
        title: 'Status',
        body: 'Sum, average and count of the selection, and whether your work is saved.',
      },
    ],
  },
  {
    id: 'app:mail',
    app: 'mail',
    title: 'Mail',
    summary: 'Messages, briefings, replies and attachments.',
    steps: [
      {
        target: win('mail', '[aria-label="Messages"]'),
        title: 'Your messages',
        body: 'Newest first; unread ones are bold. Briefings start tasks; feedback and promotions arrive here too.',
      },
      {
        target: win('mail'),
        title: 'Reading and replying',
        body: 'Open a message to read it. A briefing has a button that opens its task; you can reply to colleagues and attach your files.',
      },
    ],
  },
  {
    id: 'app:tasks',
    app: 'tasks',
    title: 'Tasks',
    summary: 'Your work, its steps, hints, files and results.',
    steps: [
      {
        target: win('tasks', '[aria-label="Tasks"]'),
        title: 'Your tasks',
        body: 'Available, in progress, needing revision and completed. A task opens when the one before it is passed and your level allows it.',
      },
      {
        target: win('tasks'),
        title: 'One task',
        body: 'Why it matters, what to do step by step (tick steps off as you go; hints are there if you need them), the files it needs, then Start task. After you submit, the results say what was right and what to improve.',
      },
    ],
  },
  {
    id: 'app:career',
    app: 'career',
    title: 'Career',
    summary: 'Promotions, reviews, your team and your authority.',
    steps: [
      {
        target: win('career', '[data-testid="career-title"]'),
        title: 'Where you are',
        body: 'Your level and XP, and the XP the next level needs.',
      },
      {
        target: win('career'),
        title: 'What a promotion needs',
        body: 'Experience, all the work of your level passed, and a professional reputation: how you work with others counts. Your reviews, team and authority are below.',
      },
    ],
  },
  {
    id: 'app:readiness',
    app: 'readiness',
    title: 'Readiness',
    summary: 'Assessments and what you have shown.',
    steps: [
      {
        target: win('readiness', '[data-testid="readiness"]'),
        title: 'Readiness',
        body: 'The assessments for your career (practical work and questions, graded at once), with your attempts and feedback. Some careers have a view of the competencies your passed work has shown.',
      },
    ],
  },
  {
    id: 'app:portfolio',
    app: 'portfolio',
    title: 'Portfolio',
    summary: 'Completed work, skills and your progress report.',
    steps: [
      {
        target: win('portfolio'),
        title: 'Portfolio',
        body: 'Your passed work with its files, your skills, achievements and a progress report you can export. It always says it is work done in a simulation.',
      },
    ],
  },
  {
    id: 'app:ai',
    app: 'ai',
    title: 'WorkSim AI',
    summary: 'The assistant, its sources and your own provider.',
    steps: [
      {
        target: win('ai'),
        title: 'WorkSim AI',
        body: 'Ask about the app or task you are in: it sees the context you allow, explains and coaches, and proposes changes you approve. It never does graded work for you. Settings choose the built-in guide or your own provider (your key stays on this computer).',
      },
    ],
  },
  {
    id: 'app:docs',
    app: 'docs',
    title: 'Word Craft',
    summary: 'Documents and reports.',
    steps: [
      {
        target: win('docs'),
        title: 'Word Craft',
        body: 'Reports, letters and documents: styles, formatting, tables and pictures, with page setup. Documents for a task are handed in with it.',
      },
    ],
  },
  {
    id: 'app:slides',
    app: 'slides',
    title: 'Deck Craft',
    summary: 'Presentations.',
    steps: [
      {
        target: win('slides'),
        title: 'Deck Craft',
        body: 'Presentations: slides from layouts and templates, text, charts, pictures, notes, transitions, and the slide show.',
      },
    ],
  },
  {
    id: 'app:cases',
    app: 'cases',
    title: 'Cases',
    summary: 'Workplace situations and decisions.',
    steps: [
      {
        target: win('cases'),
        title: 'Cases',
        body: 'Situations from your workplace: read what happened, decide what to do within your authority, and see the consequences.',
      },
    ],
  },
  {
    id: 'app:code',
    app: 'code',
    title: 'Code',
    summary: 'Files, the editor, the terminal and tests.',
    steps: [
      {
        target: win('code'),
        title: 'Code',
        body: 'Your project’s files, the editor, the terminal, and the tests: run them to see what passes before you submit.',
      },
    ],
  },
]

/** A profession tool's tour, from its own guide (sections, then how to do the common jobs). */
function toolTour(id: string): Tour | null {
  const tool = allTools().find((t) => t.id === id)
  if (!tool) return null
  const key = `tool:${tool.id}`
  return {
    id: key,
    app: key,
    title: tool.name,
    summary: tool.category,
    steps: [
      { target: win(key), title: tool.name, body: tool.guide.intro },
      ...(tool.sections.length > 1
        ? [
            {
              target: win(key, '[role="tablist"]'),
              title: 'Its sections',
              body: tool.sections.map((s) => `${s.name}: ${s.description}`).join(' '),
            },
          ]
        : []),
      ...tool.guide.topics.map((topic) => ({
        target: win(key),
        title: topic.title,
        body: topic.body,
      })),
    ],
  }
}

/** Every tour: the introduction, the apps, and the profession tools. */
let cached: Tour[] | null = null

export function allTours(): Tour[] {
  return (cached ??= [
    INTRO_TOUR,
    ...APP_TOURS,
    ...allTools()
      .filter((t) => t.id !== 'itops')
      .flatMap((t) => toolTour(t.id) ?? []),
  ])
}

export function getTour(id: string): Tour | undefined {
  return allTours().find((t) => t.id === id)
}

/** The tour for a window (its key), if there is one. */
export function tourForWindow(key: string): Tour | undefined {
  return allTours().find((t) => t.app === key)
}
