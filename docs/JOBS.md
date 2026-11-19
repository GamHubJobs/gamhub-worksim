# Real Jobs: real-world job discovery

Real vacancies from public job sites, inside the game: suggestions for the
player's career where they live, a search with filters, each advert in full with
its own link to apply, saved jobs with application tracking and reminders, and a
CV and cover letters. On the work computer (**Real Jobs**) and on the phone.

What it never does:

- **Make anything up.** Every advert is a real vacancy from the source named on
  it, as that source gives it. There are no sample or placeholder adverts.
- **Estimate pay.** Pay is shown only when the advert states it. Adzuna's own
  estimates ("predicted" pay) are left out.
- **Apply for anyone.** The player opens the original advert on its source and
  applies through the employer's own process. The game cannot see real
  applications: statuses are what the player records.
- **Present the simulation as real.** What is practised in the game is shown
  only as "practice in a simulation", never as experience, a qualification or a
  certificate.

## Sources

All free. The four built in need no key and are asked from the browser.

| Source                                 | Covers                                                                                                                         | Its terms (as followed here)                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Jobicy](https://jobicy.com)           | Remote jobs from the last 7 days, filtered by where applicants may live (many countries, or EMEA, APAC, LATAM) and by industry | Credit Jobicy with a link; apply links go to Jobicy; at most 1 request a second                                                       |
| [Remotive](https://remotive.com)       | Remote jobs worldwide, shown a day after publication                                                                           | Link back and name Remotive; ask a few times a day at most (answers kept 6 hours)                                                     |
| [Remote OK](https://remoteok.com)      | Remote jobs worldwide, mostly technology, design and marketing                                                                 | A normal (followed) link to Remote OK and its name; its logo is not used                                                              |
| [Arbeitnow](https://www.arbeitnow.com) | Jobs in Germany (on site, hybrid, remote), some in Austria and Switzerland; many in German                                     | Free public API, not to be overused (answers kept 6 hours); a link back                                                               |
| [Adzuna](https://www.adzuna.com) (off) | Every kind of job, on site and remote, in 19 countries, by place and distance                                                  | Needs a key, so only through the jobs proxy (`server/jobs-proxy`, not deployed). "Adzuna" credited on each advert; non-commercial use |

Coverage is limited, and the app says so: the "What each covers" list under the
results, and a plain message when a country has nothing in these sources. Most
countries (The Gambia, say) get remote jobs open to them, worldwide or by region.
Without the proxy, on-site jobs come only from Germany and nearby.

## How it works

```
src/jobs/
  types.ts            an advert (JobListing), a search (JobQuery), a source's state
  providers/          one file per source: its addresses, and its answer read into adverts
    common.ts         the Provider interface; job types, seniority and pay as adverts state them
    index.ts          the list of sources (a new one is one file and one line here)
  feeds.ts            asking politely: kept answers (IndexedDB), spacing, shared requests, time-outs
  search.ts           which sources to ask, results as each answers, the same job once, filters
  geo.ts              countries and regions; who a remote job is open to, from its own words
  fields.ts           fields of work: the titles that are this work, and those that are not
  match.ts            recommendations, and the advert's skills against what the player practised
  documents.ts        the CV, a cover letter draft, interview questions
  location.ts         "use my approximate location" (asks first; rounded to about 10 km)
src/game/jobs.ts      the save (life.jobs): saved jobs, status, notes, reminders, where, CV details
src/apps/jobs/        the app: For you, Search, Saved, CV & letters; the advert in full; the phone
server/jobs-proxy/    the optional Adzuna proxy (a Cloudflare Worker), with how to set it up
```

- **Kept answers.** Each source's answer is kept for as long as it asks (an hour
  to six hours), in the browser's own database, apart from the saves. A source
  that fails is not asked again for three minutes, and what it gave before is
  still shown. A slow source holds up no other: results appear as each answers.
- **The same job twice** (the same title at the same company, from two sources)
  is shown once, the fuller advert kept.
- **Closed adverts.** Jobicy says which adverts have closed: saved ones are
  checked at most twice a day and marked "Advert closed", kept with the
  player's notes. Other sources have no such check; adverts over a month old
  say to check they are still open.
- **Recommendations** must be the player's kind of work by their title, or by
  their source's category: a word in common is not enough ("Software Engineer"
  is not civil engineering; "Customer Support Agent" is not IT support). They
  gain for a level that suits the player (senior and lead roles are not
  suggested in the first two levels), being open to the player where they live,
  skills the player has practised, and being recent. Each says why.
- **Location.** The country starts as a guess from the browser's language and
  is the player's to change. "Use my approximate location" asks the browser
  (which asks the player), rounds the position to about 10 km, and looks up the
  country and town once with BigDataCloud's free lookup for browser apps;
  nothing about it is kept but the country and town the player then sees.
- **Saves.** `life.jobs` has a default for every field: older saves load with no
  saved jobs. Saved adverts are kept as they were when saved (up to 200), in
  the player's save and backups.

## Tests

- `src/jobs/jobs.test.ts`: each source read from answers shaped as its real ones;
  where jobs are open to; fields; recommendations; filters; duplicates; kept
  answers, failures and a source down; the CV and letter.
- `src/game/jobs.test.ts`: saving, tracking, reminders, closed adverts, older saves.
- `tests/e2e/real-jobs.spec.ts`: the app in the browser, with the sources
  answered by the test (suggestions for someone in The Gambia, the advert in
  full and its link, saving and tracking across a reload, filters, a source
  down, a closed advert, the CV, a letter, the phone).

Checked live on 19 November 2026 (not part of the tests, which must not depend on
what is advertised that day): real adverts from all four sources, for someone in
The Gambia, Germany and the UK; links from Jobicy and Remote OK opened their
adverts (status 200).
