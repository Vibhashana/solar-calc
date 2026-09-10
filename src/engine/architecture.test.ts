import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    const isSource = (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')
    return isSource ? [full] : []
  })
}

/** Non-recursive: just the top-level files directly in `dir` (e.g. src/App.tsx). */
function topLevelSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return []
    const isSource = (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')
    return isSource ? [full] : []
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

describe('state layer boundaries', () => {
  const files = sourceFiles('src/state')

  it('finds the state modules', () => {
    expect(files.length).toBeGreaterThan(1)
  })

  it('never imports React or UI code', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from ['"]react/)
      expect(source, file).not.toMatch(/from ['"].*\/ui\//)
    }
  })
})

describe('storage', () => {
  it('keeps the URL as the only persistence', () => {
    const files = [
      ...topLevelSourceFiles('src'),
      ...sourceFiles('src/engine'),
      ...sourceFiles('src/data'),
      ...sourceFiles('src/state'),
      ...sourceFiles('src/ui'),
    ]
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/\blocalStorage\b/)
      expect(source, file).not.toMatch(/\bsessionStorage\b/)
      expect(source, file).not.toMatch(/\bindexedDB\b/)
      expect(source, file).not.toMatch(/document\.cookie/)
    }
  })
})
