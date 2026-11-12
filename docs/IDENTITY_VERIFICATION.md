# Identity verification and access control

Knowing how to unlock an account is not enough. Before an account is changed,
the player must establish that the person asking really is the account holder,
and that the change is authorised. The Directory enforces this itself.

- **Code:** `src/tools/directory/security.ts` (the engine and the policy) and
  `src/tools/directory/model.ts` (the actions it guards).
- **Help Desk:** `src/apps/helpdesk/VerificationPanel.tsx`.
- **The first task using it:** `src/content/assignments/it/accountUnlock.ts`
  ("The Account Unlock Request").

It builds on [tickets tied to the systems](STATE_AWARE_TICKETS.md). The
verified change is an ordinary Directory change, so the ticket still resolves
because the account is really fixed.

## Where it applies

A directory enforces a policy when its state has a `security` block. The
scenarios that use it set one. Every directory before this one has none, and
works exactly as before: the leaver and lockout task, the joiner task, the
Wi-Fi task, and the practice file.

## Three separate questions

| Question          | Answered by                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| **Identity**      | identity checks in a verification session, against the directory's records |
| **Authorisation** | approval from the person the records name (line manager, group owner)      |
| **Operation**     | the action itself: allowed only with a session that covers it              |

A verified identity grants nothing by itself. A session covers:

- one account;
- one ticket;
- the changes chosen when it was started (and one group, for a group change).

It expires after 10 minutes, and each change can be made with it once.

## Verification methods

All the data is fictional. People's records (`employeeId`, `badge`, `extension`,
`manager`) are optional fields on Directory users. Group owners are an optional
`owner` on groups.

| Method                   | How it works                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee number          | The player asks; the person answers (from the scenario). The player enters what they said; it is compared with the record. The record is never shown.                                                     |
| Staff badge number       | The same, with the badge number.                                                                                                                                                                          |
| Callback                 | A call to the extension on record. Whoever has that extension answers: the requester confirms if it is them and they are at their desk. A number the caller gives proves nothing (recorded as a warning). |
| Manager / owner approval | Authorisation, not identity. Only the line manager on record (or a privileged group's owner) can approve. Anyone else is refused.                                                                         |

- **Matching** ignores case, spaces and hyphens.
- **Wrong answers:** three of them end the session (`attempts-exceeded`).
- **No random answers:** what each requester says, whether they are at their
  desk, and who declines to approve are scenario data
  (`security.requests`, `security.declines`).

## The policy

| Change                                           | Needs                                             |
| ------------------------------------------------ | ------------------------------------------------- |
| View accounts, groups, assets, audit             | nothing (read only)                               |
| Unlock, reset password, register MFA             | 1 identity check                                  |
| Reset MFA                                        | 2 different identity checks                       |
| Disable, enable                                  | approval from the manager on record               |
| Add to or remove from a group                    | 1 identity check and the manager's approval       |
| A privileged group (Payroll Data, Domain Admins) | 2 different checks and the group owner's approval |
| Unlock or reset a **privileged account**         | the manager's approval as well                    |

- **Stricter per scenario:** `security.policy` can make a change need more.
- **Nobody to approve:** if no one on record can approve, the change cannot be
  made; the player is told to escalate.
- **Not covered:** creating accounts and asset changes are not covered (they
  come from HR and IT requests, not from the account holder).

## Enforced at the operation boundary

Every sensitive action in `model.ts` runs through `guarded()`:

1. `authorize(state, op, user, group)` looks for an active session that covers
   this account and this change, and checks identity and approval.
2. **Refused:**
   - the account and the audit log are unchanged;
   - a security event is recorded;
   - the reason is returned.
3. **Allowed:** the action runs, the session is used for that change, and a
   `performed` event says what allowed it.

Because the check is inside the action, it does not matter what calls it:

- the Directory tab's buttons (which stay enabled, and show what each change
  needs);
- the model answer;
- a test calling `unlockUser` directly.

The clock is `security.clock`, set by the host before each change (`withClock`).
It never goes back.

## Security events

Each event records:

- the account;
- the ticket;
- the change;
- the session;
- the time;
- the kind;
- a severity;
- an explanation.

Events never record an answer, a record or a password. No password exists in
the simulation: a reset only issues a temporary one.

| Severity | Kinds                                                                                                               | Consequence                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| info     | session started, check passed or failed, no answer, too many attempts, approval, change made                        | none: a failed answer is not the player's fault                 |
| warning  | expired session, outside its scope, not enough checks, approval missing, wrong approver, callback to a given number | refused; a little off the policy check (25% each, at most half) |
| breach   | no verification, after a failed verification, another employee's verification                                       | refused; the policy check scores nothing                        |

New events are written to the ticket's history ("Security policy breach: …",
"Refused by the security policy: …", or the step itself). They go to the ticket
they name, or else to the tickets about that account. Each event is written
once, by its sequence number. A ticket that is Assigned moves to In progress
when its requester's verification starts.

## In the Help Desk

A ticket whose requester is in the directory's `requests` shows **Identity
verification**. Its states are:

- Verification required;
- Verification in progress;
- Verification failed;
- Verification expired;
- Identity verified: approval needed;
- Authorisation denied;
- Operation permitted;
- Verified: change made.

To verify someone, the player:

1. chooses the account (names can be shared: there are two Owens);
2. chooses the change asked for, and starts;
3. asks for and checks the employee number or badge number, or calls back;
4. asks for approval if needed;
5. makes the change in the Directory tab.

The Directory shows each account's policy needs, the manager and extension on
record, and a **Security events** log under the audit log.

## Colleagues

`disruptionsOf` adds a `stage` from the real outcome of the requester's
verification. It is optional in the profile, and older saves have none.

| Stage               | What the colleague says                                           |
| ------------------- | ----------------------------------------------------------------- |
| `verifying`         | they are being checked                                            |
| `unverified`        | IT could not confirm it was them; they will bring their badge     |
| `awaiting-approval` | their manager has to approve                                      |
| `frustrated`        | two or more wrong answers, or an expired verification             |
| `verified`          | once fixed, they thank the player for checking it was really them |

## Grading

New Directory checks, graded by the tool's own grader:

- **`verified`** (name, operation, optional approver):
  - full marks if the change was made under a verification of that person, and
    approved by the named approver where one is given;
  - half if they were verified but the change was not made with it, or the
    approval is missing.
- **`verification-failed`** (name): their identity was checked, never accepted,
  and their account was not changed.
- **`compliance`**: no breaches (else 0). Warnings take 25% each, down to half
  marks. Failed answers cost nothing.

The Account Unlock task gives 60 points for the process (verified twice, the
failed verification, the policy) and 40 for the results and the reply. A
correct end state reached carelessly cannot get full marks.

## Saving

Everything is in the directory state inside the queue document, so it is saved,
versioned and restored with it.

- **Additive:** all new fields are optional or defaulted, and older queues,
  directories and profiles load unchanged (tested).
- **Sessions expire by time:** a session saved and loaded after its 10 minutes
  stays expired.
- **Single use:** a used session cannot be used again.

## Limits

- **Opt-in:** the policy applies to directories that carry one (the new task).
  The older tasks were written without verification and are unchanged.
- **Restoring an earlier version** of the queue restores its security record
  with it, as for any change. The versions themselves are kept.
- **The conversation is written, not voiced:** asking, answers and callbacks
  appear in the panel. It is not a phone call (phone calls are a later phase).
- **The clock is the real time**, so the 10 minutes are real minutes.
- **Approval** is given (or declined) straight away, by scenario data; there is
  no waiting for the manager.
