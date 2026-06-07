# marion-county

Marion County, FL — builder permit pulls.

## Source

EnerGov self-service portal:
https://selfservice.marionfl.org/energov_prod/selfservice#/search

No login required to search or view permit details. Builder/contractor
name, address, phone, and email appear directly on the public permit
detail page.

## Record types to pull

- `New Construction - Single Family Residence`
- `New Construction - Duplex`
- `New Construction - Two Family Attached`
- `New Construction - Multi-Family` (if applicable)

Residential only. Filter out owner-builder records.

## Output

Normalize to the schema in `csv-schema.md` (this is the canonical builder
CSV shape used by every county in this repo).
