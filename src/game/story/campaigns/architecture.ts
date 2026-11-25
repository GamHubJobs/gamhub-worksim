/**
 * Architecture & Interior Design: "The Cobalt Ridge Headquarters
 * Transformation". The player joins Spaces & Interiors as a Junior Designer
 * just as the board decides to redesign the company's own third floor. Finance
 * wants it cheap, Office Administration wants its post room and storage kept,
 * Northbank Engineering finds a riser where the meeting suite should go, and
 * the studio cannot agree whether open-plan is a promise or a threat. Each
 * stage is reached by real design work in Space Studio (the career's tasks),
 * and the choices made along the way decide how the board presentation goes,
 * and what comes next. Original story; fictional people.
 */
import type { Campaign } from '../types'
import { answer, scene, talk } from './kit'

/** The decisions that make a sound headquarters design. */
const GOOD = ['hq-listened', 'hq-storage', 'hq-riser-moved', 'hq-phased', 'hq-honest']
const score = (flags: string[]) => GOOD.filter((f) => flags.includes(f)).length

const task = (id: string, assignment: string, label: string) => ({
  id,
  kind: 'task' as const,
  assignment,
  label,
  where: 'desk' as const,
})

export const ARCHITECTURE_STORY: Campaign = {
  id: 'architecture-interiors',
  careerId: 'architecture-interiors',
  title: 'The Headquarters Transformation',
  premise:
    'Your first months as a junior designer at Spaces & Interiors, just as the board decides to redesign Cobalt Ridge’s own headquarters. Sixty people, one floor, four departments with opinions, and a budget that keeps shrinking.',
  cast: {
    manager: 'Marguerite Achebe',
    senior: 'Tobias Lindqvist',
    reception: 'Nina Patel',
    facilities: 'Tom Becker',
    backM: 'Sana Haddad',
    backR: 'Callum Reid',
    backL: 'Wen Zhou',
    front2: 'Ola Adeyemi',
    admin: 'Hamid Rostami',
  },
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter 1 · New in the studio',
      missions: [
        {
          id: 'first-day',
          type: 'main',
          title: 'A scale rule and a desk',
          from: 'manager',
          intro: [
            'Your first day at Spaces & Interiors. Marguerite wants to see you in her office; Tobias will show you how the studio works.',
          ],
          objectives: [
            talk(
              'marguerite',
              'manager',
              'hq-meet-marguerite',
              'Meet Marguerite, the architecture lead',
              'manager',
            ),
            talk(
              'tobias',
              'senior',
              'hq-meet-tobias',
              'Ask Tobias to show you the studio',
              'desk',
            ),
          ],
          reward: { xp: 20, trust: { manager: 2 } },
          summary: () =>
            'Marguerite walks every plan from the front door. Tobias walks them with a tape measure. Between them, you suspect, very little gets past.',
        },
        {
          id: 'first-plan',
          type: 'main',
          title: 'Your first plan',
          from: 'senior',
          after: ['first-day'],
          intro: [
            'Harbour Housing need flat B planned inside its shell. Tobias wants it drawn in Space Studio, then Sana will go through it with you.',
          ],
          objectives: [
            task(
              'flat',
              'arch-two-bed',
              'Plan Harbour Housing’s flat B in Space Studio (Tasks)',
            ),
            talk(
              'sana',
              'backM',
              'hq-sana-critique',
              'Go through your plan with Sana',
              'desk',
            ),
          ],
          reward: { xp: 40, trust: { backM: 1 } },
          summary: (flags) =>
            flags.includes('hq-listened')
              ? 'You moved the wardrobe out of the door’s swing and turned the bed to face the window. Sana pinned your plan on the studio wall as an example.'
              : 'You defended the plan as it was. It passed, but Sana now checks your door swings before anyone else sees them.',
        },
        {
          id: 'wen-north',
          type: 'side',
          title: 'Which way is north?',
          from: 'backL',
          after: ['first-day'],
          intro: ['Wen has a site plan where the sun seems to rise in the west.'],
          objectives: [talk('wen', 'backL', 'hq-wen', 'Help Wen at his desk', 'desk')],
          reward: { xp: 10, trust: { backL: 3 } },
          summary: () =>
            'The north arrow had been pasted upside down. Wen taped a compass to his monitor and has been quietly checking everyone else’s since.',
        },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter 2 · The brief',
      missions: [
        {
          id: 'hq-announce',
          type: 'main',
          title: 'Our own floor',
          from: 'manager',
          after: ['first-plan'],
          intro: [
            'The board has approved a redesign of Cobalt Ridge’s headquarters, the third floor. Marguerite wants you on the team.',
          ],
          objectives: [
            talk(
              'marguerite2',
              'manager',
              'hq-announce',
              'Hear the news in Marguerite’s office',
              'manager',
            ),
          ],
          reward: { xp: 30, trust: { manager: 1 } },
          summary: (flags) =>
            flags.includes('hq-volunteer')
              ? 'You volunteered for the space-use survey: two weeks of counting who sits where, and when. Callum calls it “the most useful boring job on the project”.'
              : 'You joined Tobias on the layout. The survey went to Ola, with you checking her numbers.',
        },
        {
          id: 'hq-requirements',
          type: 'main',
          title: 'Everyone wants something',
          from: 'backR',
          after: ['hq-announce'],
          intro: [
            'Callum has collected the departments’ requirements, and they do not fit. Before the layout, Marguerite wants the open-plan zone proved on a real fit-out.',
          ],
          objectives: [
            talk(
              'callum',
              'backR',
              'hq-callum-reqs',
              'Go through the requirements with Callum',
              'desk',
            ),
            talk(
              'tom',
              'facilities',
              'hq-tom',
              'Hear Office Administration’s needs from Tom',
              'breakroom',
            ),
            task(
              'lumen',
              'arch-office',
              'Prove the desk layout on the Lumen fit-out, on budget (Tasks)',
            ),
          ],
          reward: { xp: 40, trust: { backR: 1, facilities: 1 } },
          summary: (flags) =>
            flags.includes('hq-storage')
              ? 'The post room, the lockers and the cleaners’ store stay on the plan. Tom brought cake to the studio, which he says he has never done for designers.'
              : 'The post room went to the basement on paper. Tom has started forwarding you every complaint about the lift.',
        },
        {
          id: 'hq-front',
          type: 'main',
          title: 'First impressions',
          from: 'reception',
          after: ['hq-requirements'],
          intro: [
            'Nina runs the front desk and sees every visitor. She has views on the new reception, and Marguerite wants you to sharpen yours on the Brightsmile refit first.',
          ],
          objectives: [
            talk(
              'nina',
              'reception',
              'hq-nina',
              'Ask Nina what reception really needs',
              'reception',
            ),
            task(
              'reception',
              'arch-reception',
              'Redesign the Brightsmile reception, the model for the new front desk (Tasks)',
            ),
          ],
          reward: { xp: 40, trust: { reception: 2 } },
          summary: () =>
            'Accessible doors, a desk clear of the entrance, somewhere to wait. Nina read your reception plan twice and said, “Finally, someone asked.”',
        },
        {
          id: 'ola-survey',
          type: 'side',
          title: 'The numbers do not add up',
          from: 'front2',
          after: ['hq-announce'],
          intro: [
            'Ola’s survey of the third floor adds up to more space than the floor has.',
          ],
          objectives: [
            talk('ola', 'front2', 'hq-ola', 'Look at the survey with Ola', 'desk'),
          ],
          reward: { xp: 15, trust: { front2: 3 } },
          summary: (flags) =>
            flags.includes('hq-remeasured')
              ? 'You re-measured the floor with Ola, inside the walls. 412 m², not 438. Every later decision rested on the right number.'
              : 'The survey stood. Somewhere in the plan, 26 m² that do not exist are waiting.',
        },
      ],
    },
    {
      id: 'ch3',
      title: 'Chapter 3 · Revisions',
      missions: [
        {
          id: 'hq-promoted',
          type: 'main',
          title: 'Your own zone',
          from: 'manager',
          after: ['hq-front'],
          intro: [
            'Designers lead a zone of the floor. Marguerite will hand you one when you are promoted: keep doing the work.',
          ],
          objectives: [
            {
              id: 'designer',
              kind: 'level',
              level: 'designer',
              label: 'Be promoted to Designer',
              where: 'desk',
            },
            talk(
              'marguerite3',
              'manager',
              'hq-zone',
              'See Marguerite about the east zone',
              'manager',
            ),
          ],
          reward: { xp: 30, trust: { manager: 2 } },
          summary: () =>
            'The east zone is yours: twenty desks, two meeting rooms, the kitchen, and every argument that comes with them.',
        },
        {
          id: 'hq-riser',
          type: 'main',
          title: 'The riser',
          from: 'senior',
          after: ['hq-promoted'],
          intro: [
            'Northbank Engineering have surveyed the building’s services. Their structural engineer, Ingrid Sorensen, is at reception asking for whoever drew the east zone.',
          ],
          objectives: [
            talk(
              'ingrid',
              'reception',
              'hq-ingrid',
              'Meet Ingrid from Northbank Engineering at reception',
              'reception',
            ),
            task(
              'tight',
              'arch-tight',
              'Re-plan a cramped office to prove the east zone still fits (Tasks)',
            ),
          ],
          reward: { xp: 50, trust: { senior: 1 } },
          summary: (flags) =>
            flags.includes('hq-riser-moved')
              ? 'You moved the meeting suite clear of the riser and re-planned the desks round it. Ingrid emailed Marguerite: “Your designer listens. Rare.”'
              : 'The meeting suite stayed over the riser, and Northbank priced a reroute: £38,000 and six weeks.',
        },
        {
          id: 'hq-budget',
          type: 'main',
          title: 'Fifteen per cent',
          from: 'backR',
          after: ['hq-riser'],
          intro: [
            'Finance has reviewed the forecast. Priya Raman, the Finance & Administration Manager, is with Callum, and she is not smiling.',
          ],
          objectives: [
            talk(
              'callum2',
              'backR',
              'hq-cut',
              'Join Callum and Priya from Finance',
              'desk',
            ),
            answer(
              'requests',
              'arch-requests',
              'Decide the studio’s requests under the spending freeze (Cases)',
            ),
          ],
          reward: { xp: 50, trust: { backR: 2 } },
          summary: (flags) =>
            flags.includes('hq-phased')
              ? 'The fit-out is phased: everything people need on day one, the feature wall and the roof terrace next year. Priya signed it off with one raised eyebrow.'
              : 'The accessible WC and the wider doors came out to hit the number. Priya was pleased. Nobody else was.',
        },
        {
          id: 'hq-quiet',
          type: 'side',
          title: 'Open plan, closed doors',
          from: 'backM',
          after: ['hq-riser'],
          intro: [
            'Sana and Tobias have been arguing about the east zone since Tuesday: Sana wants it open, Tobias wants rooms with doors.',
          ],
          objectives: [
            talk('sana2', 'backM', 'hq-sana-open', 'Hear Sana out', 'desk'),
            talk('tobias2', 'senior', 'hq-tobias-rooms', 'Hear Tobias out', 'desk'),
          ],
          reward: { xp: 20, trust: { backM: 1, senior: 1 } },
          summary: (flags) =>
            flags.includes('hq-focus')
              ? 'Open desks by the windows, four small focus rooms at the core. Both of them claim it was their idea.'
              : 'The argument went to Marguerite, who settled it in four minutes and in nobody’s favour.',
        },
      ],
    },
    {
      id: 'ch4',
      title: 'Chapter 4 · The presentation',
      missions: [
        {
          id: 'hq-deadline',
          type: 'main',
          title: 'A week early',
          from: 'manager',
          after: ['hq-budget'],
          intro: [
            'The board has moved the presentation forward a week, and Tobias has been called to a site emergency. Marguerite needs you to present the east zone.',
          ],
          objectives: [
            talk(
              'marguerite4',
              'manager',
              'hq-deadline',
              'See Marguerite in her office',
              'manager',
            ),
            answer(
              'review',
              'arch-design-review',
              'Run the Brightsmile design review: the board’s format, as a rehearsal (Cases)',
            ),
          ],
          reward: { xp: 40, trust: { manager: 1 } },
          summary: () =>
            'A design note, a client who wanted narrower doors, and a set of actions sent before five. The board uses the same format; you have now done it once.',
        },
        {
          id: 'hq-walkthrough',
          type: 'main',
          title: 'Pictures or the truth',
          from: 'admin',
          after: ['hq-deadline'],
          intro: [
            'Hamid, the visualiser, can make the east zone look magnificent in renders by tomorrow, or you can walk the board through the real model in Space Studio.',
          ],
          objectives: [
            talk(
              'hamid',
              'admin',
              'hq-hamid',
              'Decide with Hamid how to show the design',
              'desk',
            ),
          ],
          reward: { xp: 30, trust: { admin: 1 } },
          summary: (flags) =>
            flags.includes('hq-honest')
              ? 'You rehearsed the walkthrough in Space Studio: in through reception, past the post room, round the riser, into the focus rooms.'
              : 'Hamid’s renders are beautiful: evening light, no riser in shot, and a room that does not quite exist.',
        },
        {
          id: 'hq-board',
          type: 'main',
          title: 'The board',
          from: 'manager',
          after: ['hq-walkthrough'],
          intro: [
            'The boardroom: the managing partner, Priya from Finance, Tom for Office Administration, and Ingrid from Northbank on the screen.',
          ],
          objectives: [
            talk(
              'board',
              'manager',
              'hq-board',
              'Present the east zone to the board',
              'manager',
            ),
          ],
          reward: { xp: 60, trust: { manager: 2 } },
          summary: (flags) =>
            score(flags) >= 4
              ? 'The board approved the east zone as presented. Priya asked for your cost plan as the template for the other zones.'
              : score(flags) >= 2
                ? 'The board approved the east zone with conditions: two questions to answer and a revised plan in a fortnight.'
                : 'The board sent the east zone back. Every question they asked was one someone had raised with you weeks ago.',
        },
        {
          id: 'hq-next',
          type: 'main',
          title: 'What comes next',
          from: 'manager',
          after: ['hq-board'],
          intro: [
            'The morning after the board. Marguerite has asked to see you, with the door closed.',
          ],
          objectives: [
            talk(
              'marguerite5',
              'manager',
              'hq-next',
              'See Marguerite the morning after',
              'manager',
            ),
          ],
          flags: ['story-complete'],
          reward: { xp: 80, trust: { manager: 3 } },
          summary: (flags) =>
            score(flags) >= 4
              ? 'Marguerite put you forward for Senior Designer, and the readiness assessment is open whenever you are ready. Your name is on the headquarters drawings, as designer of the east zone.'
              : score(flags) >= 2
                ? 'Marguerite wants one more project from you before she puts you forward for Senior Designer: the revised east zone. The assessment can wait a month; the lessons will not.'
                : 'There is no promotion this time. Marguerite gave you the board’s questions, one by one, and the dates you were told each answer. You have the next project to show you learned them.',
        },
      ],
    },
  ],
  scenes: {
    'hq-meet-marguerite': scene(
      'hq-meet-marguerite',
      'manager',
      () => [
        '*Marguerite slides a scale rule across her desk, then a plan of a flat.*',
        'Welcome, {name}. Before anything else: walk me from the front door to the bathroom. Out loud.',
      ],
      [
        {
          id: 'walk',
          label: 'Trace the route and say what you would pass',
          reply: [
            '*You get as far as the hall cupboard door, which hits the bathroom door.* She smiles. “That is the whole job. Most people never notice.”',
          ],
          trust: { manager: 2 },
        },
        {
          id: 'ask',
          label: 'Ask why that matters more than the drawing',
          reply: [
            '“Because people live in the route, not the drawing.” *She writes your name on a fresh sketchbook.*',
          ],
          trust: { manager: 1 },
        },
      ],
    ),
    'hq-meet-tobias': scene(
      'hq-meet-tobias',
      'senior',
      () => [
        '*Tobias is measuring the studio’s kitchen worktop, for reasons he does not explain.*',
        'Three rules and you will survive here. Wet rooms get tiles. Corridors get nine hundred at least. Doors get a clear seven seven five. Everything else in Space Studio is taste, and taste can be argued about.',
      ],
      [
        {
          id: 'note',
          label: 'Write the three rules on the inside of your sketchbook',
          reply: [
            '*He taps the page.* “You will be quoting those to clients within a week.”',
          ],
          trust: { senior: 2 },
        },
        {
          id: 'joke',
          label: 'Ask whether the worktop passed',
          reply: [
            '“Twelve millimetres out of level. I have reported it to Facilities. Tom has stopped replying.”',
          ],
          trust: { senior: 1 },
        },
      ],
    ),
    'hq-sana-critique': scene(
      'hq-sana-critique',
      'backM',
      () => [
        '*Sana has your flat B plan open beside her own coffee-stained sketches.*',
        'It works. But your wardrobe sits in the bedroom door’s swing, and the bed faces the wall instead of the window. People wake up in that room for years. Can I be blunt about the rest?',
      ],
      [
        {
          id: 'listen',
          label: 'Yes: go through all of it, then revise the plan',
          reply: [
            '*She circles three things in red, explains each, and sends you a reference flat she loves.*',
          ],
          flags: ['hq-listened'],
          trust: { backM: 3 },
        },
        {
          id: 'defend',
          label: 'Explain that it passed the checks',
          reply: [
            '“Checks are the floor, not the ceiling.” *She closes the plan, politely.*',
          ],
        },
      ],
    ),
    'hq-wen': scene(
      'hq-wen',
      'backL',
      () => [
        '*Wen frowns at a site plan.*',
        'The client’s living room gets the morning sun. It faces west.',
      ],
      [
        {
          id: 'north',
          label: 'Check the north arrow',
          reply: [
            '*It points down the page.* Wen rotates it, and the sun goes back to the east where it belongs.',
          ],
          trust: { backL: 3 },
        },
      ],
    ),
    'hq-announce': scene(
      'hq-announce',
      'manager',
      () => [
        '*Marguerite turns her screen round: the third floor, as it is. Rows of desks, a meeting room nobody can book, a kitchen behind a fire door.*',
        'The board wants this redesigned for the way we work now. Sixty people, hybrid, £240,000. We are the client and the designers, which means every department will feel entitled to change it. I want you on the team. What would you like to do first?',
      ],
      [
        {
          id: 'survey',
          label: 'Volunteer for the space-use survey: count who sits where, and when',
          reply: ['“Good. Nobody designs a floor well without knowing how it is used.”'],
          flags: ['hq-volunteer'],
          trust: { manager: 2 },
        },
        {
          id: 'layout',
          label: 'Ask to work on the layout with Tobias',
          reply: [
            '“Fine. Then check Ola’s survey numbers as she goes. Layout without data is decoration.”',
          ],
          trust: { manager: 1 },
        },
      ],
    ),
    'hq-callum-reqs': scene(
      'hq-callum-reqs',
      'backR',
      () => [
        '*Callum has a spreadsheet with four colours of highlighting and a look of quiet despair.*',
        'Finance want the fit-out under budget and the desks reduced to forty-five. Office Administration want the post room, lockers and a cleaners’ store. Northbank haven’t finished their services survey. And People & Culture want a wellbeing room. It doesn’t fit. Where do we start?',
      ],
      [
        {
          id: 'data',
          label: 'Start from how the floor is used: the survey decides the desk count',
          reply: [
            '*He deletes a column.* “Evidence first. Priya will hate it and then accept it.”',
          ],
          trust: { backR: 2 },
        },
        {
          id: 'finance',
          label: 'Start from Finance’s number and fit everything else round it',
          reply: [
            '“Safe for the budget. Dangerous for everything else.” *He keeps the column.*',
          ],
        },
      ],
    ),
    'hq-tom': scene(
      'hq-tom',
      'facilities',
      () => [
        '*Tom Becker is unloading a pallet of printer paper and talking before you are fully in the room.*',
        'Everyone draws beautiful open space and forgets where the post goes. Three hundred parcels a week, twenty-four lockers, and a store for the cleaners’ trolleys. Last redesign put the post room in the basement, and I carried it up the stairs for two years. Will you keep them on the floor?',
      ],
      [
        {
          id: 'keep',
          label:
            'Yes: put the post room, lockers and store by the goods lift, and show him on the plan',
          reply: [
            '*He studies the sketch for a long time.* “By the lift. You might be the first designer I like.”',
          ],
          flags: ['hq-storage'],
          trust: { facilities: 3 },
        },
        {
          id: 'basement',
          label: 'Say the basement is the only room left',
          reply: ['*He nods slowly, the way people nod at bad weather.*'],
        },
      ],
    ),
    'hq-nina': scene(
      'hq-nina',
      'reception',
      () => [
        '*Nina signs in a courier without looking up, then does look up.*',
        'Designers always ask what reception should look like. Nobody asks what it does. Visitors queue in the doorway, the desk faces the wrong way, and anyone in a wheelchair has to wait for someone to hold the door. Want the list?',
      ],
      [
        {
          id: 'list',
          label: 'Take the whole list, and ask her to review your Brightsmile plan',
          reply: ['*She writes nine things on a sticky note. You use all nine.*'],
          trust: { reception: 3 },
        },
        {
          id: 'brief',
          label: 'Ask only for the top three',
          reply: [
            '“Doors, desk, somewhere to sit.” *She is already answering the phone.*',
          ],
          trust: { reception: 1 },
        },
      ],
    ),
    'hq-ola': scene(
      'hq-ola',
      'front2',
      () => [
        '*Ola has the survey spread across two desks.*',
        'I measured every room, but they add up to 438 square metres and the floor is 412. Did I add it up wrong?',
      ],
      [
        {
          id: 'inside',
          label:
            'Check: she measured to the outside of the walls. Re-measure inside them together',
          reply: [
            '*Two hours later the numbers agree.* Ola writes INSIDE at the top of every survey sheet from now on.',
          ],
          flags: ['hq-remeasured'],
          trust: { front2: 3 },
        },
        {
          id: 'close',
          label: 'It is close enough: use it',
          reply: ['*She looks unsure, but nods.*'],
        },
      ],
    ),
    'hq-zone': scene(
      'hq-zone',
      'manager',
      () => [
        '*Marguerite has printed the floor plan and drawn a line through it with a highlighter.*',
        'Congratulations, Designer. The east zone is yours: twenty desks, two meeting rooms, the kitchen. You report to me, you argue with Tobias, and you answer to everyone else.',
      ],
      [
        {
          id: 'accept',
          label: 'Accept, and ask what she will judge you on',
          reply: [
            '“Whether the people in it can do their jobs. Then whether we can afford it. In that order.”',
          ],
          trust: { manager: 2 },
        },
        {
          id: 'nervous',
          label: 'Admit it is a lot, and ask who to go to',
          reply: [
            '“Tobias for how it is built, Sana for how it feels, Callum for what it costs. Me when they disagree.”',
          ],
          trust: { manager: 2 },
        },
      ],
    ),
    'hq-ingrid': scene(
      'hq-ingrid',
      'reception',
      () => [
        '*Nina points you to a woman in a Northbank Engineering jacket, unrolling a services drawing across the visitors’ table.*',
        '*“Ingrid Sorensen, Northbank,” she says, not looking up. “Your meeting suite sits on top of the main services riser: power, data, the risers for the floor above. You can’t build partitions round it and still get access. Either your rooms move, or my ducts do. Mine cost thirty-eight thousand.”*',
        'Coffee? She looks like she’ll be a while.',
      ],
      [
        {
          id: 'move',
          label:
            'Move the meeting suite clear of the riser, and re-plan the desks round it in Space Studio',
          reply: [
            '*She rolls up her drawing.* “Send me the revised plan and I’ll check the access zone. Thank you for not arguing with physics.”',
          ],
          flags: ['hq-riser-moved'],
          trust: { senior: 1 },
        },
        {
          id: 'reroute',
          label: 'Ask Northbank to reroute the ducts: the meeting suite is the best room',
          reply: [
            '“It’s your budget.” *She writes a number on a sticky note and leaves it on the table.*',
          ],
        },
      ],
    ),
    'hq-cut': scene(
      'hq-cut',
      'backR',
      () => [
        '*Priya Raman sits beside Callum with the forecast printed and annotated.*',
        '*Priya taps the forecast. “Fifteen per cent over. The board will not move the budget. I need £36,000 out by Friday. What goes?”*',
        '*Callum looks at you. So does Priya.*',
      ],
      [
        {
          id: 'phase',
          label:
            'Phase it: everything people need on day one, the feature wall and roof terrace next year. Accessibility stays',
          reply: [
            '*Priya: “Show me the two phases costed by Thursday.” Callum exhales for the first time in the meeting.*',
          ],
          flags: ['hq-phased'],
          trust: { backR: 2 },
        },
        {
          id: 'access',
          label: 'Take out the accessible WC and the wider doors: they are expensive',
          reply: [
            '*Priya: “That gets us there.” Callum writes it down without looking up.*',
          ],
          flags: ['hq-cut-access'],
        },
      ],
    ),
    'hq-sana-open': scene(
      'hq-sana-open',
      'backM',
      () => [
        '*Sana has a mood board of daylight, plants and long tables.*',
        'If we put walls up, people disappear into them. Open desks by the windows, so everyone gets daylight. That is the point of coming in.',
      ],
      [
        {
          id: 'agree',
          label: 'Agree the windows go to open desks',
          reply: ['“Thank you. Now go and tell Tobias that.”'],
          flags: ['hq-heard-sana'],
          trust: { backM: 2 },
        },
        {
          id: 'neutral',
          label: 'Say you need to hear Tobias first',
          reply: ['*She shrugs.* “He’ll say rooms. He always says rooms.”'],
        },
      ],
    ),
    'hq-tobias-rooms': scene(
      'hq-tobias-rooms',
      'senior',
      (flags) => [
        '*Tobias has a sound meter on his desk.*',
        flags.includes('hq-heard-sana')
          ? 'Sana’s been at you. Daylight, fine. But a call next to an open desk is seventy decibels. People need doors to close.'
          : 'An open floor is seventy decibels when two people are on calls. People need doors to close. Rooms.',
      ],
      [
        {
          id: 'both',
          label: 'Propose both: open desks by the windows, four focus rooms at the core',
          reply: [
            '*He thinks about it for a while.* “Core rooms don’t steal the daylight. Fine. Sana will say it was her idea.”',
          ],
          flags: ['hq-focus'],
          trust: { senior: 2, backM: 1 },
        },
        {
          id: 'escalate',
          label: 'Leave it to Marguerite',
          reply: ['“Coward.” *He says it kindly.*'],
        },
      ],
    ),
    'hq-deadline': scene(
      'hq-deadline',
      'manager',
      () => [
        '*Marguerite is already standing when you come in.*',
        'The board has moved us to next Thursday, and Tobias is on a site in Leeds with a collapsed ceiling. You know the east zone better than anyone now. Present it. Rehearse with the Brightsmile review this afternoon: same format, harder client.',
      ],
      [
        {
          id: 'yes',
          label: 'Say yes, and ask for twenty minutes of her time before Thursday',
          reply: ['“Wednesday at four. Bring the plan, the cost and the walkthrough.”'],
          trust: { manager: 2 },
        },
        {
          id: 'support',
          label: 'Say yes, if Callum covers the numbers',
          reply: ['“Callum covers the numbers. You own the design.”'],
          trust: { manager: 1 },
        },
      ],
    ),
    'hq-hamid': scene(
      'hq-hamid',
      'admin',
      () => [
        '*Hamid has a render on screen: the east zone at golden hour, impossibly warm.*',
        'I can give the board this by tomorrow. No riser in shot, a bit more ceiling height than we strictly have. Boards buy pictures.',
      ],
      [
        {
          id: 'honest',
          label:
            'Walk the board through the real model in Space Studio instead, and use one honest render',
          reply: [
            '*He sighs, then grins.* “Fine. I’ll light the real model properly. It will still look good.”',
          ],
          flags: ['hq-honest'],
          trust: { admin: 1 },
        },
        {
          id: 'renders',
          label: 'Use the renders: the board needs to be excited',
          reply: ['“Excited is my speciality.” *He hits export.*'],
        },
      ],
    ),
    'hq-board': scene(
      'hq-board',
      'manager',
      (flags) => {
        const questions: string[] = []
        if (!flags.includes('hq-storage'))
          questions.push('Tom asks why the post room is in the basement again.')
        if (!flags.includes('hq-riser-moved'))
          questions.push('Ingrid points out the £38,000 duct reroute.')
        if (!flags.includes('hq-phased'))
          questions.push(
            'The managing partner asks how a wheelchair user reaches the WC.',
          )
        if (!flags.includes('hq-honest'))
          questions.push(
            'Priya asks why the render shows a ceiling height the building does not have.',
          )
        return [
          '*The boardroom. The managing partner, Priya from Finance, Tom for Office Administration, Ingrid from Northbank on the screen. Marguerite nods at you.*',
          '*You walk them through the east zone: reception, desks, meeting rooms, the kitchen, the cost.*',
          ...(questions.length
            ? questions.map((q) => `*${q}*`)
            : [
                '*Ingrid confirms the riser access. Tom says the post room is the first sensible one he has seen. Priya asks for your cost plan.*',
              ]),
          '*The managing partner closes the folder. “Questions answered. Anything you would change?”*',
        ]
      },
      [
        {
          id: 'own',
          label: 'Own the weak points plainly, and say how you would fix each one',
          reply: ['*The managing partner writes something down and underlines it.*'],
          trust: { manager: 2 },
        },
        {
          id: 'defend',
          label: 'Defend the design as it is',
          reply: ['*Marguerite’s pen stops moving.*'],
        },
      ],
    ),
    'hq-next': scene(
      'hq-next',
      'manager',
      (flags) => [
        '*Marguerite closes the door and sits on the edge of her desk.*',
        score(flags) >= 4
          ? 'Approved as presented. That does not happen to first-time presenters. I am putting you forward for Senior Designer. The readiness assessment is open whenever you want it.'
          : score(flags) >= 2
            ? 'Approved with conditions. Good, not finished. Bring me the revised east zone and I will put you forward for Senior Designer.'
            : 'Sent back. Every question they asked, someone asked you weeks ago. That is the lesson, and it is a cheap one now.',
      ],
      [
        {
          id: 'thank',
          label: 'Thank her, and ask what to work on next',
          reply: [
            '“Lead the next zone. And teach Ola what you learned about measuring.”',
          ],
          trust: { manager: 2 },
        },
        {
          id: 'quiet',
          label: 'Say nothing, and take the board’s questions with you',
          reply: ['*She hands you the marked-up plan.* “Read the margins.”'],
        },
      ],
    ),
  },
}
