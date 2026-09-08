import { useState } from 'react'
import { DISTRICTS } from './data/psh'
import { defaultInputs } from './engine/defaults'
import { sizeSystem } from './engine/sizeSystem'
import type { SystemType } from './engine/types'
import { DesignDump } from './ui/DesignDump'

export function App() {
  const [systemType, setSystemType] = useState<SystemType>('hybrid')
  const [districtId, setDistrictId] = useState('colombo')
  const [monthlyKwh, setMonthlyKwh] = useState(250)

  const design = sizeSystem({
    ...defaultInputs(systemType, districtId),
    load: { mode: 'bill', monthlyKwh, nightFraction: 0.6 },
  })

  return (
    <main>
      <h1>Solar System Calculator</h1>
      <p>Phase 1 engine check. The real interface arrives in Phase 2.</p>

      <label>
        System type{' '}
        <select value={systemType} onChange={(e) => setSystemType(e.target.value as SystemType)}>
          <option value="off-grid">Off-grid</option>
          <option value="hybrid">Hybrid</option>
          <option value="grid-tied">Grid-tied</option>
        </select>
      </label>

      <label>
        District{' '}
        <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label>
        Monthly units{' '}
        <input
          type="number"
          value={monthlyKwh}
          min={0}
          onChange={(e) => setMonthlyKwh(Math.max(0, Number(e.target.value)))}
        />
      </label>

      <DesignDump design={design} />
    </main>
  )
}
