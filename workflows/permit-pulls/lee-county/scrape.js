// Lee County (FL) builder permit scraper.
//
// Drives the public Accela / eConnect portal to pull residential
// new-construction permits (Single Family, Duplex, Two Family Attached)
// over a date window, opens each record's detail page to grab the
// applicant/contractor info + owner-builder flag, filters owner-builder
// rows out, and writes one CSV in the Marion builder-list column order.
//
// Usage:
//   npm run setup               # one-time: installs deps + Chromium
//   npm run pull                # default: trailing 12 months, headless
//   npm run pull:headed         # same, but watch the browser
//   npm run inspect             # opens search page, pauses for selector tuning
//   node scrape.js --from 2025-06-07 --to 2026-06-07
//   node scrape.js --window-days 14   # widen date chunks (default 7)
//
// Output:
//   ./output/lee-builders-<YYYY-MM-DD>.csv      # final Marion-format CSV
//   ./output/lee-raw-<YYYY-MM-DD>.jsonl         # raw scraped rows (resume source)
//   ./output/debug/                             # screenshots/html on failure
//
// Notes on selectors:
//   Accela's public ACA portal uses ASP.NET WebForms with stable-ish ids
//   like `ctl00_PlaceHolderMain_generalSearchForm_ddlGSPermitType`. The
//   selectors below are based on the standard ACA schema. If Lee has
//   customized them, run `npm run inspect` and adjust the SELECTORS block.

const { chromium } = require('playwright');
const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');

// --------------------------------------------------------------------
// Config
// --------------------------------------------------------------------

const SEARCH_URL = 'https://aca-prod.accela.com/LEECO/Cap/CapHome.aspx?module=Permitting&TabName=Permitting';

// Lee record-type hierarchy for the residential new-construction pull.
// These are the option-text values shown in the public eConnect dropdown.
const RECORD_TYPES = [
  { module: 'Residential', category: 'New Primary Structure', subType: 'Single Family Residence', csvType: 'New Construction - Single Family Residence' },
  { module: 'Residential', category: 'New Primary Structure', subType: 'Duplex',                    csvType: 'New Construction - Duplex' },
  { module: 'Residential', category: 'New Primary Structure', subType: 'Two Family Attached',      csvType: 'New Construction - Two Family Attached' },
];

// Marion CSV column order. Header is split across three logical lines in
// the source file because of embedded newlines inside two header cells.
const MARION_HEADER = [
  'BLDR PRICE', 'BLDR TYPE:', 'Lot size', 'lots sold date', 'City', 'Parcel ID',
  'Case Number', 'Type', 'Status', 'notes', 'Premit Issued Date', 'Applied Date',
  'Expiration Date', 'Finalized Date', 'Module Name', 'Address', 'company',
  'First Name ', 'Last Name', 'Phone', 'Email', 'Email 2', 'WEBSITE',
  'Total\n Permits', 'Period', 'Days Since\n Issued',
];

// Accela ACA standard selectors. Override here if Lee customized the form.
const SELECTORS = {
  recordTypeDropdown: '[id*="ddlGSPermitType"]',
  subTypeDropdown:    '[id*="ddlGSPermitSubType"]',
  startDate:          '[id*="txtGSStartDate"]',
  endDate:            '[id*="txtGSEndDate"]',
  searchButton:       'a:has-text("Search"), [id*="btnNewSearch"]',
  resultsTable:       'table[id*="gdvPermitList"]',
  resultRows:         'table[id*="gdvPermitList"] tr.ACA_TabRow_Odd, table[id*="gdvPermitList"] tr.ACA_TabRow_Even',
  recordLink:         'a[href*="CapDetail.aspx"]',
  pagerNext:          'a:has-text("Next >"), a[title="Next"]',
  detail: {
    workLocation:     '[id*="lblWorkLocation"]',
    description:      '[id*="lblDescription"], [id*="lblWorkDescription"]',
    status:           '[id*="lblRecordStatus"]',
    appliedDate:      '[id*="lblOpenDate"], [id*="lblApplicationDate"]',
    issuedDate:       '[id*="lblIssueDate"]',
    expirationDate:   '[id*="lblExpirationDate"]',
    finalizedDate:    '[id*="lblFinalizedDate"]',
    parcelStrap:      '[id*="lblParcelNumber"], [id*="lblStrap"]',
    parcelAcreage:    '[id*="lblAcreage"]',
    applicantBlock:   '[id*="trApplicant"], [id*="divApplicant"]',
    applicantName:    '[id*="lblApplicantName"]',
    applicantCompany: '[id*="lblApplicantCompany"], [id*="lblBusinessName"]',
    applicantPhone:   '[id*="lblApplicantPhone"], [id*="lblPhone"]',
    applicantEmail:   '[id*="lblApplicantEmail"], [id*="lblEmail"]',
    ownerBuilderRow:  'tr:has-text("Owner-Builder"), li:has-text("Owner-Builder")',
  },
};

// --------------------------------------------------------------------
// CLI args
// --------------------------------------------------------------------

function parseArgs() {
  const args = { headed: false, inspect: false, windowDays: 7 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--headed') args.headed = true;
    else if (a === '--inspect') { args.inspect = true; args.headed = true; }
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--to') args.to = argv[++i];
    else if (a === '--window-days') args.windowDays = parseInt(argv[++i], 10);
    else if (a === '--debug') args.debug = true;
    else { console.error(`Unknown arg: ${a}`); process.exit(1); }
  }
  if (!args.to) args.to = ymd(new Date());
  if (!args.from) {
    const d = new Date(args.to);
    d.setFullYear(d.getFullYear() - 1);
    args.from = ymd(d);
  }
  return args;
}

function ymd(d) {
  const x = (d instanceof Date) ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

function mmddyyyy(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${m}/${d}/${y}`;
}

function* dateWindows(fromYmd, toYmd, days) {
  let cursor = new Date(fromYmd);
  const end = new Date(toYmd);
  while (cursor <= end) {
    const winEnd = new Date(cursor);
    winEnd.setDate(winEnd.getDate() + days - 1);
    if (winEnd > end) winEnd.setTime(end.getTime());
    yield [ymd(cursor), ymd(winEnd)];
    cursor = new Date(winEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
}

// --------------------------------------------------------------------
// Scrape
// --------------------------------------------------------------------

async function runSearch(page, recordType, fromYmd, toYmd) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Module dropdown (top-level): "Residential" / "Commercial"
  await page.locator(SELECTORS.recordTypeDropdown).first()
    .selectOption({ label: new RegExp(recordType.module, 'i') });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Sub-type dropdown: "New Primary Structure -> Single Family Residence" etc.
  // Accela cascades these; the exact level depends on Lee's config. Try the
  // sub-type dropdown first; fall back to typing into a combined dropdown.
  const subDd = page.locator(SELECTORS.subTypeDropdown).first();
  if (await subDd.count()) {
    await subDd.selectOption({ label: new RegExp(recordType.subType, 'i') })
      .catch(async () => {
        await subDd.selectOption({ label: new RegExp(recordType.category, 'i') });
      });
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await page.locator(SELECTORS.startDate).fill(mmddyyyy(fromYmd));
  await page.locator(SELECTORS.endDate).fill(mmddyyyy(toYmd));
  await page.locator(SELECTORS.searchButton).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function collectRecordLinks(page) {
  const links = new Set();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await page.waitForSelector(SELECTORS.resultsTable, { timeout: 15000 })
      .catch(() => null);
    const rowLinks = await page.locator(SELECTORS.recordLink).all();
    for (const l of rowLinks) {
      const href = await l.getAttribute('href');
      const text = (await l.innerText()).trim();
      if (href) links.add(JSON.stringify({ href, text }));
    }
    const next = page.locator(SELECTORS.pagerNext).first();
    if (!(await next.count()) || !(await next.isEnabled())) break;
    const cls = (await next.getAttribute('class')) || '';
    if (/disabled/i.test(cls)) break;
    await next.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return Array.from(links).map((s) => JSON.parse(s));
}

async function scrapeDetail(page, link) {
  const url = link.href.startsWith('http') ? link.href : `https://aca-prod.accela.com${link.href}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  async function text(sel) {
    const loc = page.locator(sel).first();
    if (!(await loc.count())) return '';
    return (await loc.innerText()).trim();
  }

  // Owner-builder check: look for the question + answer pair anywhere on
  // the detail page (label/value tables vary by Accela tenant).
  const bodyText = await page.locator('body').innerText();
  const ownerBuilder = /Owner[-\s]?Builder[^?]*\?\s*[:\-]?\s*Yes/i.test(bodyText);

  return {
    caseNumber:     link.text,
    address:        await text(SELECTORS.detail.workLocation),
    description:    await text(SELECTORS.detail.description),
    status:         await text(SELECTORS.detail.status),
    appliedDate:    await text(SELECTORS.detail.appliedDate),
    issuedDate:     await text(SELECTORS.detail.issuedDate),
    expirationDate: await text(SELECTORS.detail.expirationDate),
    finalizedDate:  await text(SELECTORS.detail.finalizedDate),
    parcelStrap:    await text(SELECTORS.detail.parcelStrap),
    parcelAcreage:  await text(SELECTORS.detail.parcelAcreage),
    applicantName:  await text(SELECTORS.detail.applicantName),
    company:        await text(SELECTORS.detail.applicantCompany),
    phone:          await text(SELECTORS.detail.applicantPhone),
    email:          await text(SELECTORS.detail.applicantEmail),
    ownerBuilder,
    url,
  };
}

// --------------------------------------------------------------------
// Output mapping
// --------------------------------------------------------------------

function splitName(full) {
  const parts = (full || '').trim().split(/\s+/);
  if (parts.length < 2) return { first: full || '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function cityFromAddress(addr) {
  // Lee work addresses look like "1714 WILLIAMS AVE, LEHIGH ACRES FL 33972".
  const m = (addr || '').match(/,\s*([^,]+?)\s+FL\s+\d{5}/i);
  return m ? m[1].trim() : '';
}

function daysSince(issuedMmDdYyyy) {
  if (!issuedMmDdYyyy) return '';
  const [m, d, y] = issuedMmDdYyyy.split('/');
  if (!y) return '';
  const issued = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  const diff = Math.floor((Date.now() - issued.getTime()) / 86400000);
  return Number.isFinite(diff) ? String(diff) : '';
}

function toMarionRow(rec, csvType) {
  const { first, last } = splitName(rec.applicantName);
  return [
    '',                                  // BLDR PRICE (enrichment)
    '',                                  // BLDR TYPE:
    rec.parcelAcreage || '',             // Lot size
    '',                                  // lots sold date
    cityFromAddress(rec.address),        // City
    rec.parcelStrap || '',               // Parcel ID
    rec.caseNumber || '',                // Case Number
    csvType,                             // Type
    rec.status || '',                    // Status
    rec.description || '',               // notes
    rec.issuedDate || '',                // Premit Issued Date
    rec.appliedDate || '',               // Applied Date
    rec.expirationDate || '',            // Expiration Date
    rec.finalizedDate || '',             // Finalized Date
    'Permit',                            // Module Name
    rec.address || '',                   // Address
    rec.company || '',                   // company
    first,                               // First Name (trailing space header)
    last,                                // Last Name
    rec.phone || '',                     // Phone
    rec.email || '',                     // Email
    '',                                  // Email 2
    '',                                  // WEBSITE
    '',                                  // Total Permits
    '',                                  // Period
    daysSince(rec.issuedDate),           // Days Since Issued
  ];
}

// --------------------------------------------------------------------
// Main
// --------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const outDir = path.join(__dirname, 'output');
  const debugDir = path.join(outDir, 'debug');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(debugDir, { recursive: true });

  const stamp = ymd(new Date());
  const csvPath = path.join(outDir, `lee-builders-${stamp}.csv`);
  const rawPath = path.join(outDir, `lee-raw-${stamp}.jsonl`);

  console.log(`Lee County builder pull`);
  console.log(`  range:   ${args.from} -> ${args.to}`);
  console.log(`  window:  ${args.windowDays} days`);
  console.log(`  output:  ${csvPath}`);

  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  if (args.inspect) {
    console.log('\nInspect mode: opening search page. Update SELECTORS in scrape.js then re-run without --inspect.');
    await page.goto(SEARCH_URL);
    await page.pause();
    await browser.close();
    return;
  }

  const rawStream = fs.createWriteStream(rawPath, { flags: 'a' });
  const allRows = [];
  let kept = 0, dropped = 0, errors = 0;

  for (const recordType of RECORD_TYPES) {
    console.log(`\n=== ${recordType.csvType} ===`);
    for (const [winStart, winEnd] of dateWindows(args.from, args.to, args.windowDays)) {
      console.log(`  window ${winStart} -> ${winEnd}`);
      try {
        await runSearch(page, recordType, winStart, winEnd);
        const links = await collectRecordLinks(page);
        console.log(`    ${links.length} record links`);
        if (links.length >= 100) {
          console.warn('    WARNING: hit 100-row cap; shrink --window-days');
        }
        const detailPage = await context.newPage();
        for (const link of links) {
          try {
            const rec = await scrapeDetail(detailPage, link);
            rawStream.write(JSON.stringify({ recordType: recordType.csvType, ...rec }) + '\n');
            if (rec.ownerBuilder) { dropped++; continue; }
            if (!rec.company && !rec.applicantName) { dropped++; continue; }
            allRows.push(toMarionRow(rec, recordType.csvType));
            kept++;
          } catch (err) {
            errors++;
            console.error(`    detail error on ${link.text}: ${err.message}`);
            if (args.debug) {
              const safe = (link.text || 'unknown').replace(/[^a-z0-9-]/gi, '_');
              await detailPage.screenshot({ path: path.join(debugDir, `detail-${safe}.png`) }).catch(() => {});
            }
          }
        }
        await detailPage.close();
      } catch (err) {
        errors++;
        console.error(`  window error ${winStart}-${winEnd}: ${err.message}`);
        if (args.debug) {
          await page.screenshot({ path: path.join(debugDir, `window-${winStart}.png`) }).catch(() => {});
          fs.writeFileSync(path.join(debugDir, `window-${winStart}.html`), await page.content());
        }
      }
    }
  }

  rawStream.end();

  // Stitch the Marion header (with the literal embedded newlines).
  const csv = stringify([MARION_HEADER, ...allRows], { quoted: true });
  fs.writeFileSync(csvPath, csv);

  await browser.close();

  console.log(`\nDone.`);
  console.log(`  kept:    ${kept}`);
  console.log(`  dropped: ${dropped}  (owner-builder + empty-applicant)`);
  console.log(`  errors:  ${errors}`);
  console.log(`  csv:     ${csvPath}`);
  console.log(`  raw:     ${rawPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
