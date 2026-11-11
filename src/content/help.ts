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
      '**Mail** brings your tasks, cases and replies. **Tasks** lists your work with its steps and hints. **Grid Craft**, **Docs** and **Slides** are working office apps; your career also has its own tools, such as Books, Help Desk, Data Studio or Code.',
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
      'Your **phone** has your friends: invitations arrive on most evenings (accept and leave from the **Front door**, or decline politely), and you can message, call or invite a friend round. Friendships fade if you do not keep in touch.',
      'From the **Front door**, **Go out into the neighbourhood**: walk the street in 3D (Up and Down walk, Left and Right turn, Shift runs, Enter goes in at a door) or choose a place from the list. The café, the food shop (groceries cheaper than delivery), the gym (with showers) and the park each have opening hours and things to do; walking takes time. In the morning you can go on to work from the end of the street.',
      'Getting to work: walk (free, 40 minutes), bike (free, 20), bus (£2.50, 25), car (£4.50 fuel and parking, 15) or taxi (£14, 12). **Cog & Kerb** on the high street sells bikes (£240, or sell it back for £96) and leases small cars (£250 for the first week, then £60 every Monday). On your bike the neighbourhood is twice as quick; cycling is fun but warm work, and driving is quick but the traffic is stressful.',
      'Inside each place you walk your character about in 3D: **W A S D** to move, **Shift** to run, **C** to crouch, **Space** to jump, and drag the mouse (or **Q** and **R**) to look around. Near something usable, **Press E** to do it: the character walks over and does it for real (lifting, eating, shopping, sitting). It counts when it is finished; moving or pressing E again stops it, and nothing is given part way. The list beside the view starts the same activities.',
      'Inside each place you see the place itself in 3D: the café’s counter and tables, the shop’s aisles, the gym’s machines, the park’s pond, Cog & Kerb’s showroom. Things with an amber ring on the floor can be used: click one (or use the list) to order, shop, work out, sit down, buy a bike and so on. At home, the furniture you own and the front door work the same way. Drag to look around.',
      'Your **laptop** at home (evenings) is for your career: apply to other employers, who look at your real record (level, tasks done to standard, your latest review) and reply the next evening, with reasons; an interview asks three questions, and answers with a real example do best. An offer lasts a week. Under **Pay** you can ask your manager for a rise every four weeks: the answer depends on your review, your reputation and any offer you mention. A **side business** (tutoring, cards and prints, or bike tune-ups) costs a little to set up and pays each evening, more as regulars come; more than three evenings a week on top of work is tiring.',
      'The laptop’s **WorkSim AI** tab (evenings and mornings) helps with daily life: **Check my budget** (where the week’s money went and what is due), **Plan my evening** (or morning: what to do first, and when to be in bed or leave) and **What should I learn next?** (your weakest skills, what promotion still needs, and what employers ask for). Unless you have turned on an AI model at work, the built-in guide answers: WorkSim’s own rules working from your save, not an AI model, offline and free. **Show what WorkSim AI is given** lists exactly what would be shared (never your name).',
      'In **Your home**, the **Furniture shop** sells pieces that unlock activities (a games console, a study desk), improve them (a good bed, a fitted kitchen) or make home nicer. **Move home** for more space and a shorter commute, at a higher rent.',
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
    id: 'sound',
    title: 'Sound',
    text: [
      'WorkSim has sound: the office, the street, the café and home each sound different and change through the day, with footsteps, doors, typing, and sounds for new emails, finished tasks, pay day and promotions. Music plays now and then. Every sound is made on your computer as you play, so nothing is downloaded and it works offline.',
      'Open **Sound & graphics** (in the top bar, or ♪ on the taskbar) to change the master volume, turn each kind of sound up, down or off, or mute everything. **Fewer sounds** makes the surroundings quieter and sparser with no button clicks; **Sound captions** shows a short note on screen for important sounds. Sound is never needed to play. **Graphics** (Auto, High or Low) sets the detail of the 3D views: Low is smoother on slower computers. **Weather**: rain on some days outdoors, or **Always dry**. **Controls**: change the key for walking, running, jumping, using things and the rest, or reset them. Settings are kept on this device.',
    ],
  },
  {
    id: 'gridcraft',
    title: 'Working in Grid Craft',
    text: [
      '**Grid Craft** is the office spreadsheet: formulas (over 500 functions), formatting, sorting and filtering, tables, charts, pivot tables and several sheets. It has the ribbon, the formula bar and the shortcuts you would find in any spreadsheet program.',
      'Your work is saved by itself a moment after each change, as a real **.xlsx** file. Use **Download .xlsx**, **Download .csv** or **Export PDF** above the sheet for a copy of your own, and **Import a file…** to open a spreadsheet from your computer.',
      'Tasks are checked on what your cells hold: the values, the formulas and their formats. WorkSim AI can see the cell you are on and explain a formula or an error.',
      'If Grid Craft cannot run on your device, the basic spreadsheet editor opens the same file instead. To always use the basic editor (it works fully with a screen reader), choose it in **Settings → Office apps**.',
    ],
  },
  {
    id: 'access',
    title: 'Keyboard and accessibility',
    text: [
      'Everything can be done with the keyboard: Tab and Shift+Tab to move, Enter or Space to choose, Escape to close. In Grid Craft, the arrow keys move between cells; in Slides, Tab selects elements and the arrow keys move them.',
      'If your system asks for less motion, WorkSim switches animations off and keeps the 3D office still, and starts with fewer sounds.',
      'Sound is never needed: important sounds always come with something on screen, and **Sound captions** (in Sound) adds a short note for each.',
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
