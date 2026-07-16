/**
 * apply-curated-deadlines — overlays real (curated) deadlines onto the matching
 * `colleges` rows, keyed by IPEDS id. Sets deadlines_estimated=false. Run AFTER
 * the Scorecard ingest; the ingest's on-conflict update does not touch deadline
 * columns, so this overlay survives future re-ingests.
 *
 *   node scripts/ingest-colleges/apply-curated-deadlines.mjs > /tmp/curated.sql
 *   psql "$LOCAL_DB" -f /tmp/curated.sql
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const overlay = JSON.parse(readFileSync(join(here, 'curated-deadlines.json'), 'utf8'))

const esc = (s) => String(s).replace(/'/g, "''")
const jsonb = (o) => `'${esc(JSON.stringify(o))}'::jsonb`

const lines = overlay.map((c) =>
  `update public.colleges set ` +
  `application_deadlines=${jsonb(c.applicationDeadlines)}, ` +
  `financial_aid_deadlines=${jsonb(c.financialAidDeadlines)}, ` +
  `meets_full_need=${c.meetsFullNeed}, no_loan_policy=${c.noLoanPolicy}, ` +
  `npc_url='${esc(c.npcUrl)}', deadlines_estimated=false ` +
  `where slug='${esc(c.ipeds)}';`,
)

process.stdout.write(lines.join('\n') + '\n')
process.stderr.write(`emitted ${lines.length} curated-deadline updates\n`)
