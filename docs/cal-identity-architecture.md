# CAL identity and hosting architecture

## Current deployment

- CAL website: https://baysfinance.vercel.app
- ERPNext staff system: https://thebaysworld.j.frappe.cloud
- Website identity: local NextAuth accounts (Admin, Staff, Client).
- ERPNext identity: Frappe Users, Roles, Role Permissions and User Permissions.

These are separate origins and separate sessions. A Staff Portal link only navigates to ERPNext. Matching email addresses do not establish a trusted account link. There is no deployed SSO or automatic role synchronization.

## Target sign-in architecture (not implemented)

Prefer a shared identity provider with independently registered applications rather than sharing session cookies or passwords. Validate the deployed NextAuth and Frappe provider capabilities before choosing the provider and protocol. Account links should use a verified immutable provider subject plus an admin-approved local mapping, not unverified email alone.

| Identity class | Website authorization | ERPNext authorization |
| --- | --- | --- |
| CAL owner | Admin when explicitly assigned | Separately approved administrative/accounting roles |
| CAL accountant | Staff | Accounting roles plus assigned client Company permissions |
| CAL consultant | Staff | CRM/project roles appropriate to the engagement |
| Client | Client with explicit client mapping | No Desk entitlement by default |

Never map website Admin automatically to Frappe System Manager, or website Staff to access to all Companies. SSO authenticates an identity; each application must still authorize each action. Provisioning, suspension, MFA, logout, session expiry and role revocation require explicit cross-application policies and tests.

## Same origin versus one sign-in

The two existing hosting URLs cannot share an origin. Custom `www` and `erp` subdomains under a company-owned domain can make branding consistent, but are still different browser origins. Shared sign-in can work across different origins through a supported identity provider.

A literal same-origin deployment would require moving the client portal into Frappe or engineering a reverse proxy with comprehensive routing, cookies, CSRF, assets, redirects, uploads, realtime and host validation. Do not implement a blanket Vercel rewrite to Frappe. Never expose private files or proxy privileged API credentials to browser requests.

Keep the existing Vercel URL until a domain and authentication design are approved. No DNS, cookie-domain, CORS, authentication-provider or live user-role changes are authorized by publishing this document.

## Tenant and bookkeeping boundaries

Company separates legal ledgers, not every record in an ERPNext site. Shared Item, Customer, Supplier, Contact and custom records require separate analysis. Permission tests must include list views, direct URLs, reports, exports, files, search and API requests. A default Company or hidden Workspace is not an authorization boundary. Where clients operate their own ERP Desk or require hard isolation, prefer evaluating separate Frappe sites managed by CAL.

Confirm the legal billing entity before issuing CAL service invoices. Do not rename existing Companies or create parent/subsidiary relationships merely because CAL administers a client's books.
