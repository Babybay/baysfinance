# Client Dashboard Setup Steps

## Purpose

This document describes how new clients are given access to the CAL client-facing dashboard after sign-up and approval. The client dashboard is the visible interface for clients on the CAL website. The underlying system of record for client-related work is the internal operations system; the website dashboard is the client view only. This guide is for staff who provision, verify, and maintain client dashboard access.

---

## Overview

### Two systems, one client experience

- The website is the client portal and public-facing surface.
- The internal operations system holds the master client records, tasks, documents, invoices, permits, and deadlines.
- Client dashboard content is drawn from the operations system and shown to the client through the website.
- Staff update work in the operations system; the client sees the approved client-facing view on the website.

### Who this document is for

- Staff who approve new client requests
- Staff who create client accounts
- Staff who verify client dashboard access
- Staff who maintain client access over time

---

## Step 1: Client Requests Access

### 1.1 Where the request starts

Clients request access through the public CRM registration page on the CAL website. This is the public intake path for prospective clients.

### 1.2 What the client provides

A client typically submits:

- Full name
- Business email address
- Phone number
- Company name
- Service needed or area of interest

The form should remain simple and safe for public use. Do not ask for sensitive data such as tax IDs, bank details, or government identifiers on the public registration form.

### 1.3 What happens after submission

- The website sends the request into the internal operations system as a new lead or inquiry.
- The website shows the client a confirmation message.
- The website may provide a request reference or reference number so the client can follow up later.
- Submission does not mean the client is approved or has dashboard access yet.

### 1.4 Intake quality checks

Before treating the request as ready for review:

- Confirm the submission looks legitimate and not duplicate.
- Confirm the email address is a business or plausible contact email.
- Note any missing or incomplete information that may need follow-up.
- If the request appears suspicious or duplicate, handle it according to normal intake review, not by granting access.

---

## Step 2: Staff Reviews the Request

### 2.1 Review in the operations system

- Staff review the new request in the internal operations system.
- Staff confirm the request is real, meaningful, and not a duplicate of an existing client.
- Staff do not treat public website registration as proof of approval.

### 2.2 What staff should verify

- Whether the client or company already exists in the system
- Whether the service requested matches a real service offering
- Whether the request needs additional information before approval
- Whether the person should be treated as a prospective client or an existing client

### 2.3 If more information is needed

- Follow the normal client intake process.
- Ask for missing information through an approved channel.
- Record the follow-up in the operations system.
- Do not approve access before the client record is ready.

### 2.4 If the request is not approved

- Record the reason internally.
- If appropriate, inform the client through the website or approved communication channel.
- Do not leave the client in an ambiguous state where they believe they have access when they do not.

---

## Step 3: Client Account Is Created

### 3.1 When account creation happens

Client account creation happens only after the client request has been reviewed and approved internally. Registration alone is not account creation.

### 3.2 How the client account is created

- Staff create the client account on the website side through the approved internal process.
- The client account is linked to the correct client record and organization in the operations system.
- The client role is set to client, not staff.
- Staff do not give the client staff permissions or access to the internal operations system.

### 3.3 Account creation checklist

Before finishing account creation:

- [ ] Client has been approved internally.
- [ ] Client account is linked to the correct client record.
- [ ] Client record is linked to the correct company or organization.
- [ ] Client role is “client,” not “staff.”
- [ ] No staff permissions were accidentally granted.
- [ ] No access to another client’s data was opened.
- [ ] The client can be identified correctly after sign-in.

### 3.4 What staff should not do

- Do not create client accounts before approval.
- Do not create client accounts from the public form directly without internal review.
- Do not create client accounts that mirror staff permissions.
- Do not create client accounts that can see another client’s data.

---

## Step 4: Client Signs In

### 4.1 Where the client signs in

Clients sign in through the sign-in page on the CAL website. This is the client-facing authentication entry point.

### 4.2 What happens at sign-in

- The website authenticates the client.
- The website creates a session for the client.
- The client is identified by client role and client ID.
- The system should ensure the client is only served their own data.

### 4.3 Sign-in verification

After sign-in, staff or the client should be able to confirm:

- The client reached their own dashboard.
- The client did not reach staff areas.
- The client did not reach another client’s data.
- The client’s company or account context is correct.

---

## Step 5: Client Dashboard Opens

### 5.1 What the dashboard is

The client dashboard is the client-facing view after sign-in. It should present the client’s own account-relevant information in a clear, client-appropriate layout.

### 5.2 Loading expectations

When the dashboard loads:

- It should show only the logged-in client’s data.
- It should not expose staff-only information unless that information is intentionally client-facing.
- It should not expose another client’s records.
- It should load the client’s relevant items based on their account, not a generic admin view.

### 5.3 Role-based differences

- Clients see a client-scoped view.
- Staff and admins see broader views based on their role.
- The same dashboard route should not show staff-level data to a client.
- If a page is intended for staff only, the client should not see it, even if the URL exists.

---

## Step 6: What the Client Can See

The client dashboard should show the client-relevant information that staff have approved for client view. Common examples include:

- Invoices and payment status relevant to the client
- Documents shared with or uploaded for the client
- Permit cases or application status, where applicable
- Tax deadlines or reminders relevant to the client
- Account details and contact information for the client’s own account
- Tasks, updates, or notes meant for client viewing

Not every item in the operations system should be visible to the client. Only the client-facing subset should be shown.

---

## Step 7: What the Client Cannot See

The client dashboard should not show:

- Another client’s records
- Staff internal notes not intended for the client
- Internal workflow details that are not client-facing
- Data that has not been approved for client view
- Staff permissions, admin screens, or internal configuration
- Sensitive financial or identity data not meant for client display

If something appears on the dashboard that should be restricted, treat it as an access issue and correct it before the client uses the dashboard.

---

## Step 8: How Data Flows

### 8.1 Source of truth

The internal operations system is the main backend for client-related work. It holds the authoritative client record and related operational data.

### 8.2 Website dashboard role

The website dashboard is the client-facing presentation layer. It shows the data that staff have approved for client view.

### 8.3 Update flow

- Staff update records in the operations system.
- The client dashboard reflects the data approved for client view.
- Changes made in the operations system should eventually appear in the client view if they are meant to be client-facing.
- Changes made only in the website layer do not replace the operations system as the source of truth.

### 8.4 Consistency expectations

- The client-facing view and the operations system should agree on the facts that matter to the client.
- If staff update a status, document, or deadline in the operations system, the client dashboard should reflect that update once it is client-facing.
- If the two systems disagree, staff should stop and investigate instead of editing both.

---

## Step 9: Access Control Rules

### 9.1 Client scope

Client access must be scoped to one client record. A client should only see their own data and the information tied to their own account.

### 9.2 Staff access is separate

Staff access and client access are separate. A client account must not act like a staff account, and a staff account must not be used as a client account.

### 9.3 Server-side enforcement

Client isolation is enforced on the server, not only in the user interface. The UI should hide restricted data, but the backend must also prevent unauthorized access. UI hiding alone is not enough.

### 9.4 Testing requirement

Before trusting client dashboard access:

- Test with a real client account.
- Confirm the client sees only their own records.
- Confirm the client cannot reach staff-only areas.
- Confirm the client cannot reach another client’s data.
- Confirm the client cannot see internal-only notes or data.

---

## Step 10: Ongoing Maintenance

### 10.1 When a client’s scope changes

If a client’s responsibilities, company, service scope, or records change:

- Update the client record in the operations system.
- Update the client account linkage if needed.
- Test the dashboard again after changes.
- Confirm the client still sees only what they should see.

### 10.2 When a client leaves

If a client leaves or the relationship ends:

- Disable or remove access through the correct offboarding process.
- Confirm whether any client data should be retained, archived, or restricted.
- Confirm the client can no longer sign in if access is meant to end.
- Record the change internally.

### 10.3 Keeping systems aligned

- Use the operations system as the authoritative source for client-related facts.
- Use the website dashboard as the approved client view.
- Do not maintain two independent copies of the same client state.
- If a discrepancy appears, correct the source of truth and then verify the client view.

### 10.4 Periodic review

- Periodically review which clients have active dashboard access.
- Confirm that active access matches the current client relationship.
- Remove stale access promptly.
- Confirm staff are not using client accounts for staff work.

---

## Step 11: Security and Privacy

### 11.1 Client account discipline

- A client account must not be used as a staff account.
- A client account must not be shared among multiple people unless that is an approved multi-user client arrangement.
- Client credentials must be handled through the approved client sign-in flow.

### 11.2 Data exposure rules

- Never expose another client’s data through the dashboard.
- Never expose internal notes, staff commentary, or backend details that are not approved for client view.
- Never place sensitive documents, tax IDs, or bank details into the public registration form.

### 11.3 Client data boundaries

- Client-facing content must be limited to what the client is allowed to see.
- If data is sensitive, keep it out of the client dashboard unless there is a clear approved reason.
- If in doubt, restrict rather than expose.

### 11.4 Incident handling

If client data is exposed to the wrong person:

- Stop further exposure immediately.
- Record what was exposed, to whom, and when.
- Correct the access issue in the system that owns the data.
- Report the incident through the normal internal process.

---

## Step 12: Common Issues and Handling

### 11.1 Client cannot sign in

- Confirm the client account exists and is approved.
- Confirm the client is using the correct sign-in page.
- Confirm the account is not disabled or mislinked.
- If needed, check whether the client record and website account are correctly connected.

### 11.2 Client sees wrong data

- Confirm the client account is linked to the correct client record.
- Confirm the client is not seeing another client’s scope.
- Check server-side access controls, not just the UI.
- Correct the source record and retest.

### 11.3 Dashboard is empty or incomplete

- Confirm the client has associated records in the operations system.
- Confirm those records are marked as client-facing where required.
- Confirm the dashboard is showing the intended client view, not a staff view.
- Add missing client-facing content only after confirming it should be visible.

### 11.4 Client sees staff-only content

- Treat this as a serious access issue.
- Remove the unauthorized visibility immediately.
- Investigate whether the issue is in role checks, route protection, or data filtering.
- Test again with a client account after fixing.

### 11.5 Operations system and dashboard disagree

- Do not patch both independently.
- Identify which system is the source of truth for the affected item.
- Correct the source of truth.
- Verify the client dashboard reflects the corrected state.

---

## Quick Reference

### Client setup sequence

1. Client submits request on the public CRM registration page
2. Staff review the request in the operations system
3. After approval, staff create the client account on the website side
4. Client signs in through the website sign-in page
5. Client dashboard opens with only the client’s own data
6. Staff verify client can see approved content and nothing else
7. Staff maintain alignment between operations system and client dashboard
8. Staff remove or adjust access when the client relationship changes

### Main rules

- Client dashboard is client-facing only.
- The operations system is the backend source of truth.
- Client access is scoped to one client.
- Staff access is separate from client access.
- Access control must be enforced on the server, not just the UI.
- Test with a real client account before relying on the dashboard.
- Never expose another client’s data.
- Never let a client account act like a staff account.
- When systems disagree, correct the source of truth and retest.
