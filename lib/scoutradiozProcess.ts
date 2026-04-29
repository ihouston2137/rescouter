// Shared types and processing logic for ScoutRadioz field mapping configs

export type MathOp    = '+' | '-' | '*' | '/'
export type CompareOp = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'exists'
export type Strategy  = 'copy' | 'multi' | 'condition'
export type OutputType = 'string' | 'number' | 'boolean'

export type SourceFieldDef = {
  field: string
  mathOp?: MathOp  // operator to combine this value with running total; undefined for first field
}

export type ConditionDef = {
  sourceField: string
  operator: CompareOp
  value?: string
  outputValue?: string  // for string output: value emitted when condition matches
}

export type FieldMapping = {
  outputField: string
  outputType: OutputType
  strategy: Strategy | ''
  sourceField?: string            // copy
  sourceFields?: SourceFieldDef[] // multi
  separator?: string              // multi/string join separator
  conditions?: ConditionDef[]     // condition
  defaultValue?: string           // condition/string: emit when no condition matches
}

export type ConfigDoc = {
  _id?: string
  name: string
  season: number
  eventCode: string  // '' = all event codes
  org_key: string   // '' = all orgs
  mappings: FieldMapping[]
  createdAt?: string
  updatedAt?: string
}

export const OUTPUT_FIELDS: { name: string; type: OutputType }[] = [
  { name: 'startPosition',     type: 'string' },
  { name: 'autoScoredFuel',    type: 'boolean' },
  { name: 'autoCycles',        type: 'number' },
  { name: 'autoScore',         type: 'number' },
  { name: 'autoClimb',         type: 'boolean' },
  { name: 'teleScoredFuel',    type: 'boolean' },
  { name: 'teleFuelCycles',    type: 'number' },
  { name: 'teleScore',         type: 'number' },
  { name: 'telePassCycles',    type: 'number' },
  { name: 'endgameClimb',      type: 'boolean' },
  { name: 'endgameClimbLevel', type: 'string' },
  { name: 'passNeutral',       type: 'boolean' },
  { name: 'passOpposite',      type: 'boolean' },
  { name: 'beached',           type: 'boolean' },
  { name: 'stuckTrench',       type: 'boolean' },
  { name: 'stuckBump',         type: 'boolean' },
  { name: 'damaged',           type: 'boolean' },
  { name: 'died',              type: 'boolean' },
  { name: 'tipped',            type: 'boolean' },
  { name: 'accuracyRating',    type: 'number' },
  { name: 'skillRating',       type: 'number' },
  { name: 'defenseRating',     type: 'number' },
]

export function makeDefaultMapping(name: string, type: OutputType): FieldMapping {
  return { outputField: name, outputType: type, strategy: '', sourceField: '', sourceFields: [], separator: '', conditions: [], defaultValue: '' }
}

export function makeDefaultConfig(): ConfigDoc {
  return {
    name: '',
    season: new Date().getFullYear(),
    eventCode: '',
    org_key: '',
    mappings: OUTPUT_FIELDS.map(f => makeDefaultMapping(f.name, f.type)),
  }
}

// Ensure a loaded config has a mapping entry for every OUTPUT_FIELD
export function normalizeConfig(raw: Partial<ConfigDoc>): ConfigDoc {
  const existing = new Map((raw.mappings ?? []).map(m => [m.outputField, m]))
  return {
    _id:       raw._id,
    name:      raw.name ?? '',
    season:    raw.season ?? new Date().getFullYear(),
    eventCode: raw.eventCode ?? '',
    org_key:   raw.org_key ?? '',
    mappings:  OUTPUT_FIELDS.map(f => existing.get(f.name) ?? makeDefaultMapping(f.name, f.type)),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

// ── Processing ────────────────────────────────────────────────────────────────

function testCondition(data: Record<string, string>, cond: ConditionDef): boolean {
  const raw      = String(data[cond.sourceField] ?? '')
  const numRaw   = parseFloat(raw)
  const condVal  = cond.value ?? ''
  const numCond  = parseFloat(condVal)

  switch (cond.operator) {
    case '==':       return raw === condVal
    case '!=':       return raw !== condVal
    case '>':        return !isNaN(numRaw) && !isNaN(numCond) && numRaw > numCond
    case '<':        return !isNaN(numRaw) && !isNaN(numCond) && numRaw < numCond
    case '>=':       return !isNaN(numRaw) && !isNaN(numCond) && numRaw >= numCond
    case '<=':       return !isNaN(numRaw) && !isNaN(numCond) && numRaw <= numCond
    case 'contains': return raw.toLowerCase().includes(condVal.toLowerCase())
    case 'exists':   return raw !== '' && raw !== 'undefined' && raw !== 'null'
    default:         return false
  }
}

export function applyMapping(data: Record<string, string>, m: FieldMapping): string | number {
  if (!m.strategy) return m.outputType === 'number' ? 0 : ''

  switch (m.strategy) {
    case 'copy': {
      const raw = String(data[m.sourceField ?? ''] ?? '')
      if (m.outputType === 'number')  return parseFloat(raw) || 0
      if (m.outputType === 'boolean') {
        const n = parseFloat(raw)
        return (!isNaN(n) && n !== 0) || raw === 'true' ? 1 : 0
      }
      return raw
    }

    case 'multi': {
      const fields = m.sourceFields ?? []
      if (m.outputType === 'number') {
        if (fields.length === 0) return 0
        let result = parseFloat(String(data[fields[0].field] ?? '')) || 0
        for (let i = 1; i < fields.length; i++) {
          const sf  = fields[i]
          const val = parseFloat(String(data[sf.field] ?? '')) || 0
          switch (sf.mathOp) {
            case '+': result += val; break
            case '-': result -= val; break
            case '*': result *= val; break
            case '/': if (val !== 0) result /= val; break
          }
        }
        return Math.round(result * 100) / 100
      }
      return fields.map(sf => String(data[sf.field] ?? '')).join(m.separator ?? '')
    }

    case 'condition': {
      const conds = m.conditions ?? []
      if (m.outputType === 'boolean') {
        return conds.some(c => testCondition(data, c)) ? 1 : 0
      }
      for (const cond of conds) {
        if (testCondition(data, cond)) return cond.outputValue ?? ''
      }
      return m.defaultValue ?? ''
    }

    default:
      return m.outputType === 'number' ? 0 : ''
  }
}

export function processRecord(
  data: Record<string, string>,
  mappings: FieldMapping[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const m of mappings) {
    if (m.strategy) out[m.outputField] = applyMapping(data, m)
  }
  return out
}

export function buildScopeFilter(config: Pick<ConfigDoc, 'season' | 'eventCode' | 'org_key'>) {
  const filter: Record<string, unknown> = { season: config.season }
  if (config.eventCode) filter.eventCode = config.eventCode
  if (config.org_key)   filter.org_key   = config.org_key
  return filter
}
