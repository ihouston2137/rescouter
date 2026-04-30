import { getSession } from '@/lib/session'
import connectDB from '@/lib/db'
import ScoutRadioz from '@/lib/models/ScoutRadioz'
import fs from 'fs'
import path from 'path'

const SAVE_DIR = path.join(process.cwd(), 'scoutradioz')

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nonEmpty = lines.filter(l => l.trim() !== '')
  if (nonEmpty.length < 2) return []
  const headers = parseCSVLine(nonEmpty[0])
  return nonEmpty.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim() })
    return row
  })
}

// ── Transformations ───────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  const season     = parseInt(row['year'] ?? '0', 10)
  const eventCode  = (row['event_key'] ?? '').replace(/^\d+/, '').toUpperCase()
  const teamNumber = parseInt((row['team_key'] ?? '').replace(/^frc/i, ''), 10)

  const matchKey   = row['match_key'] ?? ''
  const qmMatch    = matchKey.match(/_qm(\d+)/i)
  const tournamentLevel = qmMatch ? 'Qualification' : 'Unidentified'
  const matchNumber     = qmMatch ? parseInt(qmMatch[1], 10) : 999

  const org_key = row['org_key'] ?? ''

  // Scouting-specific columns — exclude the fields we've already transformed
  const OMIT = new Set(['year', 'event_key', 'team_key', 'match_key', 'org_key'])
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    if (!OMIT.has(k)) data[k] = v
  }

  return { org_key, season, eventCode, teamNumber, tournamentLevel, matchNumber, data }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Optional event code override — manual entry takes precedence over dropdown selection
    const manualCode   = (form.get('eventCodeManual')   as string | null)?.trim().toUpperCase() || null
    const selectedCode = (form.get('eventCodeSelected') as string | null)?.trim().toUpperCase() || null
    const eventCodeOverride = manualCode ?? selectedCode ?? null

    const filename = file.name
    const text = await file.text()

    // Save raw file locally
    fs.mkdirSync(SAVE_DIR, { recursive: true })
    fs.writeFileSync(path.join(SAVE_DIR, filename), text, 'utf-8')

    // Parse and transform
    const rows = parseCSV(text)
    if (rows.length === 0) {
      return Response.json({ error: 'CSV contained no data rows' }, { status: 400 })
    }

    const docs = rows
      .map(row => {
        const doc = transformRow(row)
        if (eventCodeOverride) doc.eventCode = eventCodeOverride
        return doc
      })
      .filter(d => !isNaN(d.season) && !isNaN(d.teamNumber) && d.org_key && d.eventCode)

    await connectDB()

    // Bulk upsert
    const ops = docs.map(doc => ({
      updateOne: {
        filter: {
          org_key:         doc.org_key,
          season:          doc.season,
          eventCode:       doc.eventCode,
          teamNumber:      doc.teamNumber,
          tournamentLevel: doc.tournamentLevel,
          matchNumber:     doc.matchNumber,
        },
        update: { $set: doc },
        upsert: true,
      },
    }))

    const result = await ScoutRadioz.bulkWrite(ops, { ordered: false })
    const count  = result.upsertedCount + result.modifiedCount

    return Response.json({
      count,
      filename,
      eventCodeOverride,
      message: `Done — ${count} records upserted from ${filename} (${docs.length} rows processed)${eventCodeOverride ? `, event code overridden to ${eventCodeOverride}` : ''}.`,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
