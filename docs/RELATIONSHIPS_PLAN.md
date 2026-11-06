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
