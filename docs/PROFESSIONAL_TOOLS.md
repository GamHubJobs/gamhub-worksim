# Professional tools: research, design and plan

Every career in GamHub WorkSim includes working simulations of the software that
professionals in that field use every day. This document records which tools real
teams use, what we simulate and why, how the tool framework works, and the order
in which the tools are built.

Real products are named here **only as research references** for typical features
and workflows. The tools in the game have original names, interfaces and data, and
copy no branding, assets or code.

---

## 1. Research: what professionals actually use

| Field                | Common tools (references)                                                                                                 | The daily work they support                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounting           | QuickBooks, Xero, Sage; Excel alongside                                                                                   | Chart of accounts and journals; sales invoices and customer payments (receivables); supplier bills and payments (payables); bank feeds and reconciliation; payroll runs; statements                           |
| IT support           | ServiceNow, Jira Service Management, Zendesk; Active Directory / Entra ID; asset tools; ping, ipconfig, nslookup, tracert | Ticket queues with priority (impact × urgency) and SLAs; incident handling; asset inventory and assignment; joiners, movers and leavers (accounts, groups, access); network fault finding; knowledge articles |
| Digital marketing    | Google Analytics, Meta Ads Manager, HubSpot, Semrush; social schedulers                                                   | Campaigns with budgets and bids; scheduling posts across channels; SEO audits (titles, descriptions, headings, keywords); website analytics (sources, pages, conversions); budget pacing; performance reports |
| Data analysis        | SQL editors, Power BI, Tableau, Python notebooks, Excel / Power Query                                                     | Importing datasets; cleaning (types, blanks, duplicates, inconsistent text); transforming (filter, group, join); SQL queries; descriptive statistics; dashboards and charts                                   |
| Software development | VS Code, Git and GitHub, terminal, debuggers, Postman                                                                     | Editing code; running commands and tests in a terminal; version control (status, staging, commits, branches, merges); stepping through failures; testing HTTP APIs                                            |

What the research shows is that professionals don’t use these tools to explore features:
they use them for **repeatable workflows** (raise an invoice, then record the payment;
onboard a new starter; launch a campaign and watch the pacing; clean, query and chart a
dataset; branch, fix, test and commit). The simulations are built around those
workflows, with realistic sample data, so that tasks can only be completed by doing
the real work inside the tool.

---

## 2. What we simulate (original WorkSim modules)

Each module is a separate app on the WorkSim desktop, registered by its department.
Sections inside a module unlock as the player is promoted.

### Accounting: **Books** (accounting software)

- **Chart of accounts and general ledger**: accounts by type, journal entries that must
  balance before they can be posted, an account ledger with running balances.
- **Sales (receivables)**: customers, invoices with lines and VAT, recording payments,
  aged receivables.
- **Purchases (payables)**: suppliers, bills, paying bills.
- **Banking**: an imported bank statement; matching each line to ledger transactions,
  or creating the missing entry; a reconciliation summary that must balance.
- **Payroll** (from Accountant): employees, pay runs with gross pay, income tax,
  national insurance and pension, payslips, and posting the payroll journal.
- **Reports**: trial balance, profit and loss and balance sheet, calculated live
  from the ledger.

Everything posts to the same ledger, so an invoice changes receivables and sales, a
payment changes the bank, and the reports always agree, as in real software.

### IT Help Desk: **Service Desk**, **Directory**, **Network Tools**

- **Service Desk** (extends the existing Help Desk): tickets, impact × urgency →
  priority, SLA timers, linking tickets to incidents, and an editable knowledge base.
- **Directory and assets**: user accounts (enable, disable, unlock, reset password,
  MFA), security groups and access, and an asset inventory (laptops, phones, licences)
  with assignment, status and warranty.
- **Network Tools**: a diagnostics console (`ping`, `ipconfig`, `nslookup`,
  `tracert`, `ports`) over a simulated office network in which faults can be planted
  and found.
- **Tickets tied to the systems**: a ticket can carry conditions on Network Tools
  and Directory, and resolves only when the problem is really fixed (see
  [STATE_AWARE_TICKETS.md](STATE_AWARE_TICKETS.md)).
- **Identity verification and access control**: in a directory with a security
  policy, account changes are refused until the person is verified against the
  records (and approved where needed); see
  [IDENTITY_VERIFICATION.md](IDENTITY_VERIFICATION.md).

### Digital Marketing: **Campaigns**, **Social Planner**, **Site Analytics**, **SEO Audit**

- **Campaigns**: campaigns, ad sets and ads with budgets, bids and status;
  budget pacing; results by channel.
- **Social Planner**: composing posts per channel with live character limits,
  scheduling them on a calendar, and approval status.
- **Site Analytics**: website traffic by source, page, device and date, with
  filters, comparisons, conversion funnels and goals.
- **SEO Audit**: crawling the company’s (simulated) site for issues: missing or
  duplicate titles, long descriptions, missing H1s and alt text; keyword data; fixing
  pages and re-crawling.

### Data Analysis: **Data Studio**

- **Datasets**: import (paste CSV or use a provided dataset), preview, column types.
- **Clean and transform**: an applied-steps pipeline (trim, change type, replace,
  remove duplicates, filter, fill blanks, split columns, add calculated columns),
  each step visible and reversible.
- **SQL**: a query editor over the datasets with `SELECT`, `WHERE`, `GROUP BY`,
  aggregates, `JOIN`, `ORDER BY` and `LIMIT`, and result grids.
- **Statistics**: summaries (count, mean, median, standard deviation, min, max,
  quartiles) and correlation.
- **Dashboards**: charts built from query results, arranged on a dashboard.

### Software Development: **Code** (extended) and **API Client**

- **Code**: the existing editor and tests, plus a **terminal** (`ls`, `cat`,
  `npm test`, `git …`), **Git** (status, diff, add, commit, log, branches, checkout,
  merge, all simulated over the project’s files) and a **debug console** that runs a
  function with chosen inputs and shows the result, logs and the failing line.
- **API Client**: requests (method, URL, headers, body, bearer token) against a
  simulated company API, with status codes, JSON responses, saved collections and
  response tests.

---

## 3. The professional-tools framework

The framework lets each department register its tools, data and grading without
changing the desktop, storage or grading code.

```
src/tools/
  types.ts         ToolDefinition: id, name, icon, who gets it and from which level,
                   sections (each with an unlock level), state schema, sample data,
                   check schema and grader, and a beginner's guide
  registry.ts      registerTool / getTool / toolsFor(profile)
  <tool>/          one folder per tool: model (pure), grading (pure), sample data,
                   and the UI (loaded only when opened)
```

- **Saving**: all tool work is stored as one generic document kind, `tool`
  (`{ tool, state }`), and each tool validates its own state. Tool files therefore
  get autosave, the emergency journal, version history, backups and restore with
  no extra code.
- **Assignments**: a task can be `kind: 'tool'`, with the tool’s starting state (the
  scenario data), its checks and a model answer. Content tests prove that the model
  answer scores 100% and that untouched work fails.
- **Grading**: each tool grades its own checks against the player’s saved state
  (pure functions; expensive ones can run in a worker). The results join the usual
  grade, alongside report and presentation checks.
- **Progression**: a tool appears in a career’s dock from a given level, and its
  sections unlock with promotions. Locked tools and sections say when they unlock.
- **Guidance**: every tool has a built-in guide (what it is for, how to do the common
  jobs, a glossary), and tasks give step-by-step instructions, hints and explanations.
- **Practice**: every tool has a practice workspace with realistic sample data, so
  players can explore without affecting a task.

---

## 4. Build order

| Milestone | Content                                                                                    |
| --------- | ------------------------------------------------------------------------------------------ |
| 4.7       | The professional-tools framework, with a first small tool to prove it end to end           |
| 4.8       | Accounting: Books (ledger, sales, purchases, banking, payroll, reports) and tasks using it |
| 4.9       | IT Help Desk: Service Desk upgrades, Directory and assets, Network Tools, and tasks        |
| 4.10      | Digital Marketing: Campaigns, Social Planner, Site Analytics, SEO Audit, and tasks         |
| 4.11      | Data Analysis: Data Studio (datasets, cleaning, SQL, statistics, dashboards), and tasks    |
| 4.12      | Software Development: terminal, Git, debug console, API Client, and tasks                  |

Each milestone adds tasks to its career path at the right levels (keeping the
existing tasks, which already use Sheets, Docs and Slides as real professionals do),
and is finished only when its unit tests and browser tests pass.
