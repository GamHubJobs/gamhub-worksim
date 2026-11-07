# Relationships, romance and family: plan

A personal life alongside the career: friendships that deepen, people who may or may not
be interested, dates that are played in the world, affection, a shared home, marriage
and, if the player wants it, a family. It complements the workplace simulation; it never
replaces it, and nothing in the career depends on it. Staying single is a full way to
play.

## Ground rules (always)

- **Adults only** in anything romantic: every romance-capable person is 18 or over, and
  says so in their profile. Children (if the player starts a family) are only ever
  children: shown doing what children do, never in anything romantic.
- **Consent, every time**: every step (asking someone out, holding hands, a hug, a kiss,
  staying the night, moving in, a proposal) is asked, and the other person can say yes,
  no, or not yet, according to who they are and how things stand. The player cannot
  insist; a "no" is respected and remembered, and asking again too soon is not possible.
- **Never explicit**: affection is shown (a hug, holding hands, a kiss, dancing, sitting
  close); anything private is a fade to the next morning.
- **Agency**: people have their own interests, boundaries, expectations, routines and
  goals; some are simply not interested, and that is fine.
- **Fair**: no random, punishing breakups; no jealousy loops; working hard is not a
  relationship crime. Problems come from what actually happened (a missed date, a broken
  promise), and can be talked through.

## What exists to build on

- People everywhere can be talked to (`game/encounters.ts`, `world/npc/people.ts`), with
  trust, memory and personality; the office's people have days (`world/npc/schedule.ts`).
- Friends outside work with friendship, messages and plans (`game/social.ts`,
  `content/friends.ts`); the phone (`phone/`).
- Physical activities and two-person scenes (the courier, conversations), the café, the
  park, home, the story engine (`game/story/`).

## Order of work

1. **R1 · People and bonds**: adult profiles (age, interests, dislikes, personality,
   boundaries, what they want from a relationship, whether they could be interested in
   the player at all); a bond per person (stage, closeness, attraction, trust, shared
   history and memories), in the save (additive), with the stages from acquaintance to
   partner, engaged, married, separated, and friendship after a breakup. The consent
   rule as one pure function. Unit tests.
2. **R2 · Conversations that build a bond**: new things to say to the people who could
   be interested (ask about their day, their interests, compliment, flirt, ask them out),
   their answers by personality, mood and stage; the bond changes slowly; discovered
   interests are remembered.
3. **R3 · Dates, played**: asking (in person or by phone): yes, no, or another time;
   the date in the calendar; both arrive at the café or the park; they sit together,
   talk, eat; how it goes depends on what the player says and does; it ends naturally and
   the bond changes by what happened. Missed dates count.
4. **R4 · Affection**: hugs, holding hands, a kiss, sitting close, dancing, comforting,
   each asked and answered, the two people facing and lined up, with new animations.
5. **R5 · Evenings at home**: a partner visits: cooking, a film, talking on the sofa;
   staying over (a fade to the morning, waking up).
6. **R6 · Moving in**: choosing the flat, the partner living there with their own
   routine, shared bills from the existing money, household disagreements.
7. **R7 · Engagement and marriage**: the proposal (yes or no), planning, a visible
   wedding with guests who arrive, sit, celebrate and leave.
8. **R8 · Family (optional)**: deciding together, adoption or a baby (respectfully, not
   graphically), a child at home with age-appropriate routines; work and family balance.
9. **R9 · Challenges**: misunderstandings, broken promises, money, different
   expectations; apologies, reconciliation, breakups and divorce, all from what
   happened.
10. **R10 · The phone**: partners' messages, date invitations, plans in the calendar.
11. **R11 · Story Mode**: relationship storylines in the campaigns.

Each is built, tested in the game and documented before the next.

## Done

### R1–R3 · People and bonds, conversations, dates

- **Adults** (`content/adults.ts`): eight people already in the world (the café's
  owner and a regular, two gym members, the garage's salesperson, two colleagues, a
  neighbour), all adults (27 to 78), each with interests and dislikes, what they want,
  boundaries (taking things slowly; private, not in front of people; not dating
  colleagues), free evenings, and whether romance with the player could happen at all
  (for two of them it could not: a happily married colleague, a retired neighbour).
- **Bonds** (`game/romance.ts`, `life.bonds` in the save, empty for older saves):
  stage (getting to know each other, friends, close friends, dating, partners, engaged,
  married, separated), closeness, attraction, interests found out, what was declined
  and when, a date arranged, dates so far, and shared history. Trust stays in
  `work.relationships`, as before.
- **Consent** (`ask`): every step (a date, holding hands, a hug, a kiss, being a couple,
  staying over, moving in, a proposal) gets yes, no or not yet, from who they are and
  how things stand, the same every time. A no cannot be asked again for three days.
- **Conversations** (`game/personal.ts`, through the existing talking): asking what they
  love (each answer remembered), compliments, flirting (only once they are friends; a
  person not interested says so kindly, and it changes nothing), a hug, asking them out
  (yes, with a day and a place, or not yet, or no). Closeness grows a little a day;
  attraction only with people open to it, and only from warmth.
- **Dates, played** (`game/dates.ts`): on the evening arranged, from 6:45 pm, they wait
  at the café's window table (Maya, if it is her, is not behind the counter that night)
  or on the park bench. Walking up to them starts it; the player sits down with them
  (dinner at the café, paid; or the bench) and stays seated; three rounds of what to
  say (what they love, their day, work) and, asked, holding hands and a goodnight kiss;
  then how it went. A good first date makes them a couple who are dating. A date not
  gone to by bedtime is missed, and remembered. Dates are in the phone's calendar, with
  a reminder that day.
- **Tests**: `romance.test.ts` (9), `dates.test.ts` (6); browser: `date.spec.ts` (asking
  Maya out in person, the date at the café that evening, sitting down to dinner
  together, holding hands, a kiss declined as "not yet" and respected, dating now).
- **Limits** (then): affection was described, not animated (done in R4).

### R4 · Affection, shown

Holding hands (across the table, or side by side on the bench) and, saying goodnight, a
kiss, a hug or a wave, standing face to face, close, seen from the side; each only after
a yes. New animations: hug, kiss, slow dance, holding hands. (`world/npc/moment.ts`)

### R5–R6 · Evenings at home, staying over, moving in

Becoming a couple and asking someone round (both asked); an evening at home together on
the sofa; asking them to stay (a fade to the morning, waking up together); moving in
(they live there, pay half the rent). A missed visit is remembered.
