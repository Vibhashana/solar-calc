import type { Sized, SystemDesign } from '../engine/types'

function Row({ label, field }: { label: string; field: Sized<unknown> }) {
  return (
    <li>
      <strong>{label}:</strong> {String(field.value)} {field.unit}
      <div>{field.explain.plain}</div>
      <code>{field.explain.substituted}</code>
    </li>
  )
}

export function DesignDump({ design }: { design: SystemDesign }) {
  return (
    <div>
      <h2>Panels</h2>
      <ul>
        <Row label="Sun hours used" field={design.array.designPsh} />
        <Row label="Panel count" field={design.array.panelCount} />
        <Row label="Installed size" field={design.array.installedPvKw} />
        <Row label="Roof area" field={design.array.roofAreaM2} />
      </ul>

      <h2>Inverter</h2>
      <ul>
        <Row label="Continuous rating" field={design.inverter.continuousW} />
        <Row label="Surge required" field={design.inverter.surgeRequiredW} />
      </ul>

      {design.battery && design.busVoltage && (
        <>
          <h2>Battery</h2>
          <ul>
            <Row label="System voltage" field={design.busVoltage} />
            <Row label="Capacity" field={design.battery.nominalKwh} />
            <Row label="Amp hours" field={design.battery.bankAh} />
            <Row label="In series" field={design.battery.modulesInSeries} />
            <Row label="In parallel" field={design.battery.modulesInParallel} />
          </ul>
        </>
      )}

      {design.controller && (
        <>
          <h2>Charge controller</h2>
          <ul>
            <Row label="Current" field={design.controller.amps} />
            <Row label="Type" field={design.controller.type} />
            <Row label="Maximum panel voltage" field={design.controller.maxStringVoc} />
          </ul>
        </>
      )}

      {design.warnings.length > 0 && (
        <>
          <h2>Things to check</h2>
          <ul>
            {design.warnings.map((w) => (
              <li key={w.id}>
                [{w.severity}] {w.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
