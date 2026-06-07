# lee-county

Lee County, FL — builder permit pulls.

**Date verified:** 2026-06-07

## TL;DR

Lee County is the equivalent of Marion's EnerGov self-service search, but
Lee runs on **Accela / eConnect**, not EnerGov. Public, no login required
to search or view records.

Two data sources are useful for the builder pull:

1. **eConnect search** — live, complete, but pagination-capped at 100
   results per query; needs detail-page scraping for builder info.
2. **Weekly/monthly PDF reports** — published every Monday/4th of month
   under `leegov.com/dcd/reports`, already contains contractor names.
   Faster path; less complete than the live search.

For a "last 12 months" residential builder list, use **both**: PDFs for
the bulk backlog, eConnect for the most recent weeks not yet in a PDF.

---

## Source 1 — eConnect (live search)

### URLs

- DCD eServices landing: https://www.leegov.com/dcd/eServ
- Public eConnect portal: https://aca-prod.accela.com/LEECO/Cap/CapHome.aspx?module=Permitting&TabName=Permitting

### Search path

1. Open eConnect → **Permitting** tab.
2. **Search Applications** → **General Search**.
3. **Record Type:** `Residential / New Primary Structure`
   (covers Single Family, Duplex, Two Family Attached — but **not**
   apartment/condo, which Lee files under Commercial; see below).
4. Set the date window (use the application date or issued date fields).
5. Click **Search**.

### What the result grid shows

| Field | In grid? | Notes |
|---|---|---|
| Record number | yes | e.g. `RES2026-04832` |
| Address | yes | Work-site address |
| Description | yes | Free text, e.g. `NEW DUPLEX FAMILY RESIDENCE` |
| Status | yes | e.g. `Issued`, `Submitted` |
| Action / fee status | yes | |
| Related records count | yes | |
| Submittal type | yes | |
| **Builder / applicant name** | **no** | Must open the detail page |
| Builder phone / email | no | Must open the detail page |
| Owner-builder flag | no | Must open the detail page |

There is a `Download results` link in the grid that calls a hidden
handler like `/LEECO/Export2CSV.ashx?flag=4259`. The handler **requires
an active Accela browser session** — unauthenticated curl returns
`an error has occured when exporting the result`. The export is bound to
the user's session cookie, not to a token. Treat it as browser-only.

### Result cap

The public grid shows `Showing 1-10 of 100+` and **caps at 100 records
per query**. For a 12-month pull, split into multiple narrow date windows
(e.g. one per week or one per 50-record chunk).

### Detail page fields (per record)

Opening any record exposes:

- Work location (street address)
- Applicant name and address
- Applicant phone and email (when present)
- Project description
- **More Details → Application Information** — includes the question
  *"Is the permit being pulled as Owner-Builder?"*. **Filter `Yes` rows
  out of the builder CSV.**
- **More Details → Parcel Information** — includes parcel/STRAP number
  and acreage.

### Lee permit category mapping (per Lee's official monthly report)

| Use case | Lee category path |
|---|---|
| Single family home | Residential → New Primary Structure → Single Family Residence |
| Duplex | Residential → New Primary Structure → Duplex |
| Two-family attached | Residential → New Primary Structure → Two Family Attached |
| Apartment / condo (5+ units) | **Commercial** → New Buildings → Apartment / Condo 5 or more units |

⚠️ Lee files apartment/condo multifamily under **Commercial New Building**
even though the use is residential. For a strict residential-only pull,
use `Residential / New Primary Structure` only. To include multifamily,
run a second search under `Commercial / New Building` and filter the
description or type-of-use field for `apartment` / `condo`.

### Sample records observed (2026-06-07 pull)

| Record # | Address | Description |
|---|---|---|
| RES2026-04832 | 1714 Williams Ave, Lehigh Acres FL 33972 | New construction primary home |
| RES2026-04825 | 133 Gilbert Ave S, Lehigh Acres FL 33973 | NEW DUPLEX FAMILY RESIDENCE |
| RES2026-04810 | 3003 Irene Ave S, Lehigh Acres FL 33976 | Single Family Residence |
| RES2026-04733 | 5212 29th St SW, Lehigh Acres FL 33973 | New Construction Duplex |

(RES2026-04832 was being pulled as **owner-builder** on the detail page,
so it gets filtered out of the final builder CSV.)

---

## Source 2 — Weekly / monthly PDF reports

### Where

- Reports index: https://www.leegov.com/dcd/reports
- Current-month folder pattern:
  `https://www.leegov.com/dcd/rpts/Documents/CurrentMonth/`
- Known filename patterns:
  - `ULCBPRWeek{N}.PDF` — Unincorporated Lee County Building Permits
    Received, weekly
  - `ULCRPRWeek{N}.PDF` — Unincorporated Lee County Residential Permits
    Received, weekly
  - Monthly equivalents drop on the 4th of the following month.

> Per Lee DCD: "Monthly reports are available on the fourth day of the
> following month. If you need reports for a permit type not listed for
> a particular year, send a Records Request to DCDRecords@leegov.com."

### What's in the PDFs

The residential weekly already includes contractor name, contractor
address, owner, parcel, record number, issue date, and construction
value. This is the **fast path** to a builder list — no detail-page
scraping needed. Downside: covers unincorporated Lee only (no Cape
Coral / Fort Myers / Bonita Springs city permits) and excludes
in-flight/not-yet-issued records.

### Pulling the historical year

The current-month folder only holds the active month. For the previous
12 months, either:

- Browse `leegov.com/dcd/reports` for the per-month archive links, or
- Email `DCDRecords@leegov.com` for a Records Request covering the
  desired range.

---

## Recommended end-to-end pull (residential, last 12 months)

1. **PDFs first.** Grab every weekly/monthly residential PDF for the
   trailing 12 months from `leegov.com/dcd/reports`. Parse contractor
   rows directly.
2. **eConnect for gaps.** For the last 2–3 weeks (not yet rolled into a
   PDF) and for cities not covered by the unincorporated reports, run
   the General Search with `Residential / New Primary Structure` in
   narrow date windows (≤ 50 records each) to stay under the 100-row
   cap. Scrape each detail page for builder info.
3. **Owner-builder filter.** Drop any row where the detail page shows
   *"Is the permit being pulled as Owner-Builder? Yes"*, or where the
   PDF lists the owner as the contractor.
4. **Multifamily (optional).** Repeat eConnect step under
   `Commercial / New Building` filtered to apartment/condo
   descriptions.
5. **Normalize** to the columns in
   `../marion-county/csv-schema.md`.

### Lee → Marion-CSV field mapping

| Marion CSV column | Lee source |
|---|---|
| `City` | Postal city from the work address (e.g. `Lehigh Acres`) |
| `Parcel ID` | STRAP from detail-page **Parcel Information** |
| `Case Number` | Record number (e.g. `RES2026-04832`) |
| `Type` | Map from Lee category: `New Construction - Single Family Residence` / `- Duplex` / `- Two Family Attached` / `- Multi-Family` |
| `Status` | Lee `Status` column |
| `notes` | Lee `Description` field |
| `Premit Issued Date` | Issued date from detail page (or PDF) |
| `Applied Date` | Lee application date |
| `Expiration Date` | Lee expiration date (if shown; otherwise blank) |
| `Finalized Date` | Lee finalized date (if shown; otherwise blank) |
| `Module Name` | `Permit` |
| `Address` | Work location |
| `company` | Applicant company name (skip if Owner-Builder = Yes) |
| `First Name ` / `Last Name` | Applicant contact name |
| `Phone` | Applicant phone |
| `Email` | Applicant email |
| `Email 2` | Secondary email if present |
| `Lot size` | Acreage from detail-page Parcel Information |
| `BLDR PRICE`, `BLDR TYPE:`, `lots sold date`, `WEBSITE`, `Total Permits`, `Period`, `Days Since Issued` | Enrichment — not in Lee source |

---

## Environment limitations observed

Both `aca-prod.accela.com` and `www.leegov.com` return **HTTP 403** to
this Claude Code runtime's User-Agent. The export handler on eConnect
also requires an active Accela session cookie. **All actual data pulls
must run from an authenticated browser session** (Chrome on the owner's
machine, a Chrome MCP, or a Playwright/Selenium runner). This repo
documents the workflow; it does not execute the network calls from the
Claude Code container.
