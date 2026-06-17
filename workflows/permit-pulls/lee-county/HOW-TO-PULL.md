# How to pull Lee County builder permits — the Marion-equivalent flow

This is the **manual click-by-click** workflow, written so it maps
field-for-field to what you already do in Marion's EnerGov self-service.
Use this when you want to refresh the builder list and don't want to
run the scraper.

---

## Side-by-side: Marion vs Lee

| Step | Marion (EnerGov) | Lee (Accela / eConnect) |
|---|---|---|
| Portal | https://selfservice.marionfl.org/energov_prod/selfservice#/search | https://aca-prod.accela.com/LEECO/Cap/CapHome.aspx?module=Permitting&TabName=Permitting |
| Login | None | None |
| Search entry point | Top nav → **Search → Permits** | **Permitting** tab → **Search Applications** → **General Search** |
| Filter type | "Permit Type" dropdown | "Record Type" cascading dropdown |
| Pick residential new construction | `New Construction - Single Family Residence` (etc.) | Module = `Residential`, then `New Primary Structure`, then `Single Family Residence` / `Duplex` / `Two Family Attached` |
| Date filter | "Applied Date From / To" | "Start Date / End Date" (use Issued Date, not Applied) |
| Run search | "Search" button | "Search" button |
| Result-row cap | 1,000 per query (high) | **100 per query** — narrower windows needed |
| Builder visible in grid? | **Yes** (Marion shows contractor in the row) | **No** — must click into each record |
| Bulk export | "Export to CSV" button | "Download results" link → CSV, **session-cookie required** |
| Owner-builder filter | "Contractor Type" column | Detail page → **More Details → Application Information** → "Is the permit being pulled as Owner-Builder?" |

The biggest practical differences:
1. **Lee caps you at 100 results per search**, so split your date window
   into chunks instead of pulling a year at once.
2. **Lee hides the builder in the result grid** — you have to click each
   permit to see who pulled it.
3. **Apartment/condo 5+ units is filed under Commercial** in Lee, not
   Residential. If you want multifamily, run a second pass under
   Commercial New Building.

---

## Step-by-step (residential, last 30 days)

### 1. Open the portal
https://aca-prod.accela.com/LEECO/Cap/CapHome.aspx?module=Permitting&TabName=Permitting

### 2. Search Applications → General Search

### 3. Set the filter cascade
- **Module / Department**: `Residential`
- **Record Type**: `New Primary Structure`
- **Sub-Type** (if shown): `Single Family Residence`
  *(Run again for `Duplex` and `Two Family Attached` after this pass.)*

### 4. Set the date window
- **Start Date**: 30 days ago (e.g. 05/08/2026)
- **End Date**: today (e.g. 06/07/2026)
- Keep windows ≤ 2 weeks to stay under the 100-row cap.

### 5. Click Search

### 6. Export the grid (optional but fast)
- Click **Download results** at the bottom of the grid.
- A CSV drops to your Downloads folder.
- ⚠️ The CSV has permit #, address, status, description — **no builder name**. You still need step 7.

### 7. Open each record and pull the builder
For each row in the grid:
- Click the record number (e.g. `RES2026-04832`).
- Capture from the detail page:
  - **Work Location** → `Address`
  - **More Details → Application Information**:
    - Builder/applicant company name → `company`
    - Contact name → `First Name` / `Last Name`
    - Phone → `Phone`
    - Email → `Email`
    - **"Is the permit being pulled as Owner-Builder?"** → if `Yes`, **drop this row**, don't add to the list
  - **More Details → Parcel Information**:
    - STRAP → `Parcel ID`
    - Acreage → `Lot size`

### 8. Drop into the Marion-shape CSV
Use the column order in `../marion-county/csv-schema.md`.

---

## Faster path — the weekly PDFs already have the builder

Lee DCD publishes weekly residential PDFs that **already include the
contractor name + contractor address** — no detail-page clicking
needed. This is the fastest path for the last 12 months.

### Where to grab them
- Index: https://www.leegov.com/dcd/reports
- Direct (current month, swap WeekN):
  - `https://www.leegov.com/dcd/rpts/Documents/CurrentMonth/ULCBPRWeek1.PDF`
  - `https://www.leegov.com/dcd/rpts/Documents/CurrentMonth/ULCBPRWeek2.PDF`
  - `https://www.leegov.com/dcd/rpts/Documents/CurrentMonth/ULCBPRWeek3.PDF`
  - (Older months live under `…/UnincorporatedLeeCounty/{YYYY}/{Mon}/ULC{YYYY}{Mon}BPR.PDF`)
- Planning-community monthly PDFs (Lehigh, NFM, SFM, etc.):
  `https://www.leegov.com/dcd/rpts/Documents/PlanningCommunities/BldPrmtRESpc_{community}.pdf`

### How to read them
Each row in the PDF has:
- Record number (e.g. `RES2026-04832`)
- Issue date
- Work address
- Owner name
- **Contractor company + contractor address**
- Construction value
- Description (Single Family / Duplex / etc.)

Save the PDF, open it in Preview, copy-paste rows into the Marion CSV
columns. Or drop the PDF into a chat with me and I'll parse it for you.

### Caveats
- PDFs cover **unincorporated Lee County only** (no Cape Coral or Bonita
  Springs if they self-issue).
- Older months drop into `…/UnincorporatedLeeCounty/2024/Jan/` style
  paths once the current month rolls over.
- Issued vs Received — `BPR` files = **Issued** permits (you want this).
  `RPR` files = applications received (not yet issued).

---

## Recommended monthly cadence

1. **First of each month**: download all 4–5 weekly `ULCBPRWeek*.PDF`
   files for the previous month. Copy contractor rows into the Marion
   CSV. ~10 minutes.
2. **Mid-month**: same, for any new weekly PDFs that have dropped.
3. **Quarterly**: do a full eConnect General Search for the trailing
   90 days, filter out duplicates with the PDF rows, and detail-scrape
   any new permits the PDFs missed (Cape Coral, Bonita, etc.).

If you ever want this fully automated, run `npm run pull` from
`workflows/permit-pulls/lee-county/` and the Playwright scraper does
all three passes for you (see `README.md`).
