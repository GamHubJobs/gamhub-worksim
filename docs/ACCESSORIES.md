# Accessories, equipment and personal belongings

What the player can buy, own, wear and carry, and what colleagues and people in
town wear. Built on the existing character model, save, money, phone, pause menu
and home, not alongside them.

## Where things are

| Part                                                                                                 | File                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| The catalogue: 75 items, slots, tiers, prices, colours, careers, what each does                      | `src/content/accessories.ts`                                                                          |
| Rules: buy, sell, wear, take off, clashes, packing a bag, wear and tear, the site's safety-kit check | `src/game/accessories.ts`                                                                             |
| The save: `life.wardrobe` (owned, worn, packed, history, condition)                                  | `src/persistence/schemas.ts`                                                                          |
| 3D models, attached to the body                                                                      | `src/world/character/accessories3d.tsx`, `accessoryLook.ts`, `office/scene/people.tsx`                |
| What the player wears in every scene                                                                 | `src/world/character/playerWear.ts`                                                                   |
| Colleagues, site crews and people in town                                                            | `src/office/scene/npcWear.ts`, `workwear.ts`, `engineering/scene/crew.ts`, `city/scene/CityScene.tsx` |
| Shop and wardrobe                                                                                    | `src/accessories/AccessoryStore.tsx`, `store.ts`                                                      |
| Watch display by the clock                                                                           | `src/accessories/WristDisplay.tsx`, `workday/WorkdayBar.tsx`                                          |
| Own kit at work (stethoscope, badge)                                                                 | `src/office/scene/ownKit.ts`                                                                          |
| Belongings kept at home                                                                              | `src/home/scene/belongings.tsx`                                                                       |

## The catalogue

Nine categories: watches and wrist, eyewear, hats and helmets, audio, jewellery,
bags, footwear, personal items, and professional equipment. Five tiers: basic
(under £40), standard, premium, luxury (over half a week's starting pay) and
professional-grade. Every career has professional equipment of its own:

| Career                     | Examples                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Engineering                | hard hat, safety glasses and goggles, hi-vis vest, cut-resistant gloves, safety boots, tool belt, tape, laser measure, multimeter, ear defenders |
| Healthcare                 | stethoscope, fob watch, medical ID badge, scrub cap, nitrile gloves, penlight                                                                    |
| Law                        | court ID badge, case folder, document bag, briefcase, reading glasses, tablet                                                                    |
| IT help desk               | technician's toolkit, anti-static strap, cable tester, encrypted USB, portable SSD, office headset, staff badge                                  |
| Finance and administration | calculator, briefcase, tablet, case folder, office headset, presentation clicker                                                                 |
| Accounting                 | calculator, briefcase, case folder, reading and computer glasses, tablet                                                                         |
| Digital marketing          | mirrorless camera, microphone, tripod, audio recorder, studio headphones, SSD                                                                    |
| Data analysis              | computer glasses, presentation clicker, tablet, USB, SSD, headphones                                                                             |
| Software development       | computer glasses, hardware security key, USB, headphones, the debugging duck                                                                     |

## Rules

- One item per place on the body, except pockets (four). Putting something on
  takes off what is in its place.
- A headphone band (headphones, gaming headset, office headset, ear defenders)
  cannot go over a hat: one takes the other off, and the wardrobe says why.
- Bags, the briefcase, the document bag and the tool belt have room for 2, 4 or
  6 work things (tools). Taking a bag off empties it back into the wardrobe.
- Things sell for 40% of what was paid, less as they wear. Professional safety
  kit and personal-issue items cannot be sold.
- Worn things wear a little each day; better tiers last longer.

## What they do

- **Watches**: the time beside the clock in the top bar. A smartwatch also shows
  unread messages; a smartwatch or fitness tracker shows energy, stress and last
  night's bedtime (all real save data; there is no step count, so none is shown).
- **Earbuds and headphones**: the ambience is quieter (much quieter with noise
  cancelling), through the audio manager's `hushAround`.
- **Site safety kit**: on the construction site the player wears their own hard
  hat, glasses, hi-vis and boots, and the site lends whatever is missing. Nothing
  is refused or skipped.
- **Stethoscope**: seeing a patient at the bedside includes listening to the
  chest with it.
- **ID badges**: shown at reception before saying hello.
- **Bags**: carry work things; a bag comes off while sitting, and what is carried
  is put down while sitting or doing something.
- **Phone case**: listed with pocket items (its colour is not yet on the phone in
  the hand; see limits).

## Where the player gets to them

- The phone's **Style** app: what is worn, and the way into the shop and wardrobe.
- The pause menu: **Inventory** lists what is worn and packed, with buttons to
  the wardrobe and shop; **Character** lists what is worn.
- At home: the **Wardrobe** button, and **choose your accessories** at the
  wardrobe in 3D. Bags, hats and a briefcase not being worn hang on a coat stand
  by the front door; watches lie in a tray on a table beside it.

## Saves

`life.wardrobe` has defaults for every field, so saves from before accessories
load with an empty wardrobe and nothing else changed (tested in
`game/accessories.test.ts`).

## Limits

- Models are made from simple shapes, like the characters; no external models
  were added.
- A phone case's colour does not yet show on the phone the character holds.
- Colleagues' accessories are fixed per person and workplace; they do not change
  through the day.
- Café customers have no accessories: they sit, and bags would pass through the
  chairs.
