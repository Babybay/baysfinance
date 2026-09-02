# Environment variables

## Staff portal

`NEXT_PUBLIC_STAFF_PORTAL_URL` optionally overrides the public Staff Portal link
shown in the site navigation.

If it is unset, the link defaults to:

```text
https://thebaysworld.j.frappe.cloud/app/bays-finance-operations
```

This is a public URL and must not contain credentials or other secrets.

## Website-to-ERPNext CRM registration

The public `/crm/register` form creates an **ERPNext Lead**. Configure these
server-only Vercel environment variables in the Bays Finance project:

```text
ERPNEXT_URL=https://your-frappe-site
ERPNEXT_API_KEY=your-integration-user-api-key
ERPNEXT_API_SECRET=your-integration-user-api-secret
```

Use an ERPNext **integration user** with only the permissions required to create
Leads and Comments. Do not use a human staff account or Administrator API key.
These variables must never be prefixed with `NEXT_PUBLIC_`, committed to the
repository, or entered in Hermes configuration.

## Portal workflow

- **Staff**: administrators provision ERPNext users. Staff sign in through the
  Staff Portal and use ERPNext for CRM, accounting, tax, projects, and operations.
- **New prospects**: register on `/crm/register`. The website creates an ERPNext
  Lead and records the requested service as a Lead comment. The form has a
  global and per-email submission limit as a safe server-side backstop; use
  Vercel Firewall or managed bot protection before increasing public traffic.
- **Existing clients**: sign in through `/sign-in` to the Bays Finance client
  portal. A consultant provisions this access after qualifying the Lead and
  establishing the client relationship.

The client website is intentionally not an ERPNext Desk login. It keeps
client-facing access separate from the internal staff workspace.
