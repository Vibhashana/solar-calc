import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : []
  })
}

describe('engine and data purity', () => {
  const files = [...sourceFiles('src/engine'), ...sourceFiles('src/data')]

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('never imports React or UI code', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from ['"]react/)
      expect(source, file).not.toMatch(/from ['"].*\/ui\//)
      expect(source, file).not.toMatch(/from ['"].*\/state\//)
    }
  })

  it('performs no I/O and reads no globals', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\bfetch\s*\(/)
      expect(source, file).not.toMatch(/\blocalStorage\b/)
      expect(source, file).not.toMatch(/\bwindow\./)
    }
  })
})
