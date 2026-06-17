# Builder CSV schema (Marion-style)

This is the canonical column layout produced by the Marion County pull and
the target shape for every other county. Source: real export the owner
already runs out of Marion's EnerGov self-service.

## Columns (in order)

| # | Column | Notes |
|---|---|---|
| 1 | `BLDR PRICE` | Manual / enrichment. Dollar string, e.g. `$11,000`. Blank or `NO SALE` allowed. |
| 2 | `BLDR TYPE:` | Manual / enrichment. Often blank in source. |
| 3 | `Lot size` | Acres, decimal (e.g. `0.23`). From parcel data. |
| 4 | `lots sold date` | Manual / enrichment. |
| 5 | `City` | E.g. `Rain Bow Lakes Estates`. Subdivision/community, not the postal city. |
| 6 | `Parcel ID` | County parcel/folio. |
| 7 | `Case Number` | County permit/record number (e.g. `2025094111`, `BLDR-26-01-04896`). |
| 8 | `Type` | Permit type. Standard values: `New Construction - Single Family Residence`, `New Construction - Duplex`, `New Construction - Two Family Attached`, `New Construction - Multi-Family`. |
| 9 | `Status` | E.g. `Issued`. |
| 10 | `notes` | Free-form. Often holds the legal subdivision name from the permit. |
| 11 | `Premit Issued Date` | (sic) `MM/DD/YYYY`. |
| 12 | `Applied Date` | `MM/DD/YYYY`. |
| 13 | `Expiration Date` | `M/D/YYYY`. |
| 14 | `Finalized Date` | Blank until permit is finalized. |
| 15 | `Module Name` | Source module, usually `Permit`. |
| 16 | `Address` | Work-site street address. |
| 17 | `company` | **Builder company name.** Pulled from the permit's contractor / applicant block. Owner-builder rows should be filtered out before reaching this CSV. |
| 18 | `First Name ` | Contractor contact first name. (Trailing space in header is intentional — matches source.) |
| 19 | `Last Name` | Contractor contact last name. |
| 20 | `Phone` | Best phone for the builder. |
| 21 | `Email` | Best email for the builder. |
| 22 | `Email 2` | Secondary email. |
| 23 | `WEBSITE` | Builder website. Enrichment-stage column. |
| 24 | `Total Permits` | Rolling count for that builder. Enrichment. |
| 25 | `Period` | Reporting period this row belongs to. Enrichment. |
| 26 | `Days Since Issued` | Computed from `Premit Issued Date`. |

## Notes

- Columns 1, 2, 4, 23, 24, 25, 26 are **enrichment columns** — they are
  not in the county source. They get filled by a later step (parcel
  lookup, builder lookup, license-board lookup, etc.).
- Columns 5–22 should come directly from the county permit record.
- One physical permit can produce **multiple rows** when the builder has
  multiple phone numbers or emails (see Marion rows 20–21 and 68–69 in
  the sample export). Downstream dedupe handles this.
- Header row in the source file is split across three CSV lines because
  of embedded newlines inside `"Total\n Permits"`, `"Days Since\n Issued"`.
  Parsers must be quote-aware.
