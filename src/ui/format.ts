/**
 * How every figure on the page is rendered: grouped thousands, at most two
 * decimals, and no trailing zeros. The engine already rounds its explanation
 * text to two decimals; this keeps the headline figures consistent with it.
 */
export function formatFigure(value: number): string {
  const normalised = Object.is(value, -0) ? 0 : value
  return normalised.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}
