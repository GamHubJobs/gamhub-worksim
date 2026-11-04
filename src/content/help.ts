/**
 * The in-app help: short answers to what a new player needs to know. Longer
 * guides are in the docs folder (see docs/PLAYER_HANDBOOK.md).
 */

export interface HelpTopic {
  id: string
  title: string
  /** Paragraphs; **bold** is supported. */
  text: string[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'what',
    title: 'What WorkSim is (and is not)',
    text: [
      'WorkSim is a **workplace simulation**: you join a company, do realistic work in working office apps and profession tools, and get clear feedback on every piece of work.',
      'It is **not** a job, a course with a certificate, or a qualification. Your portfolio shows what you have done in a simulation, and says so on every page.',
      'It is free, needs no account, and keeps your progress **on this device only**.',
    ],
  },
  {
    id: 'office',
    title: 'Getting around the office',
    text: [
      'You start at reception. Use **Places** (or click the blue rings in the 3D view) to walk to your desk, your manager’s office or the break room.',
      'The panel beside the 3D view lists everything you can do where you are: talk to colleagues, read the whiteboard, have lunch, go home. Everything can be done from there, without the 3D view.',
      'At your desk, **Use your computer** opens your apps. **Leave desk** takes you back to the office.',
    ],
  },
  {
    id: 'apps',
    title: 'The apps',
    text: [
      '**Mail** brings your tasks, cases and replies. **Tasks** lists your work with its steps and hints. **Sheets**, **Docs** and **Slides** are working office apps; your career also has its own tools, such as Books, Help Desk, Data Studio or Code.',
      'Everything you type is saved automatically, a moment after you stop typing.',
    ],
  },
  {
    id: 'life',
    title: 'Life outside work',
    text: [
      'After work, **Go home**: the evening is yours. Each room of your flat lists what you can do, how long it takes and what it costs. Your **needs** (hunger, hygiene, social, fun) fall as time passes; looking after them helps you at work.',
      'Go to bed in good time: the alarm rings at 7:00. In the morning, eat, shower and get dressed, then leave from the **Front door** by foot, bus or taxi. Arriving late, hungry or in yesterday’s clothes shows at work.',
      'You are paid on Fridays and pay rent on Mondays; the **Statement** lists your money in and out.',
    ],
  },
  {
    id: 'ai',
    title: 'WorkSim AI, your assistant',
    text: [
      '**WorkSim AI** (on the desktop, the taskbar and Start) helps with the work you have open: it can plan a task with you, explain a formula, summarise an email, list what it asks for and outline a reply. Choose **Learning**, **Professional** or **Expert** for how much it explains.',
      'By default it uses WorkSim’s **built-in guide**: free, offline, and **not an AI model**, so it answers specific questions only. In **Settings** you can turn on a real AI model: one running on your computer (such as Ollama, free), or a cloud model through the WorkSim AI bridge with your own API key (the provider charges you).',
      'Nothing is sent to a model until you agree. The **Context** panel shows what will be shared; untick anything you do not want to share. Your name is taken out first. Every answer says what wrote it: check AI answers before you rely on them.',
      'Using AI well is a skill here too: the **Using AI at work** panel in Career shows your prompting, checking and data protection from evidence (asking more questions does not raise it), and AI cases from your manager practise it.',
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks and feedback',
    text: [
      'Each task comes from your manager by email. Open it in **Tasks**, choose **Start task**, and follow the steps; every step has a hint.',
      'When you hand it in, every check is marked and explained. You need the pass mark (usually 70%) to pass, and you can improve your work and hand it in again.',
    ],
  },
  {
    id: 'cases',
    title: 'Cases: clients, budgets, meetings and incidents',
    text: [
      'Cases are workplace situations that arrive by email: an unhappy client, a purchase to approve, a meeting to prepare, an incident. Open them in **Cases**.',
      'Read the evidence, work through the steps and submit before the deadline. A case is answered once, like a real email; every mark is explained.',
    ],
  },
  {
    id: 'progress',
    title: 'XP, levels and promotion',
    text: [
      'Passing work earns **XP** and builds your skills. To be promoted you need enough XP, every task of your level passed and a good enough reputation; senior roles also need a good weekly review.',
      'From level 2, promotion also needs your level’s **readiness assessment** (in **Readiness** on the dock): practical work in your profession’s own tool plus a report, marked like real work. You can retake it after practising.',
      '**Career** shows what you still need, your performance record and your achievements.',
    ],
  },
  {
    id: 'portfolio',
    title: 'Your portfolio and exports',
    text: [
      'Everything you pass becomes evidence in **Portfolio**: what was asked, how it was marked, and the files you handed in.',
      'You can download PDFs, a progress report, a one-page profile, and a ZIP with everything, from Portfolio’s **Export** section.',
    ],
  },
  {
    id: 'backup',
    title: 'Saving, backups and recovery',
    text: [
      'Your work is saved automatically **in this browser on this device**. Nothing is uploaded anywhere.',
      'Download a **backup** regularly from **Storage & backup** (WorkSim reminds you weekly). A backup file can restore everything on another computer or browser.',
      'Before a restore, WorkSim keeps a **safety copy** of your data, so a restore can be undone from Storage & backup.',
    ],
  },
  {
    id: 'install',
    title: 'Installing and using WorkSim offline',
    text: [
      'In Chrome or Edge, use the **install** icon in the address bar to install WorkSim as an app.',
      'Once WorkSim has been opened online, it also starts and saves **offline**. Opening a career for the first time needs a connection.',
      'When a new version is ready, a notice offers **Update now**; nothing changes until you choose it.',
    ],
  },
  {
    id: 'access',
    title: 'Keyboard and accessibility',
    text: [
      'Everything can be done with the keyboard: Tab and Shift+Tab to move, Enter or Space to choose, Escape to close. In Sheets, the arrow keys move between cells; in Slides, Tab selects elements and the arrow keys move them.',
      'If your system asks for less motion, WorkSim switches animations off and keeps the 3D office still.',
    ],
  },
  {
    id: 'trouble',
    title: 'If something goes wrong',
    text: [
      '**WorkSim behaves strangely after an update:** Storage & backup → **Repair app files**. Your saved work is not touched.',
      '**“Could not load the content for this career”:** reconnect to the internet and choose **Try again**.',
      '**WorkSim is open in another tab:** only one tab can change your work at a time; close the other tab, or choose to use this one.',
      '**Your saved data is damaged:** WorkSim stops before changing anything. Restore a backup or a safety copy from Storage & backup.',
    ],
  },
]
