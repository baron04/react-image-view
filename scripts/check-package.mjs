import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'))
const archive = `${name}-${version}.tgz`
const backupDir = mkdtempSync(join(tmpdir(), 'react-img-view-package-check-'))
const backup = join(backupDir, archive)
const hadArchive = existsSync(archive)
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

if (hadArchive) renameSync(archive, backup)

try {
  execFileSync(pnpm, ['exec', 'publint'], { stdio: 'inherit' })
  execFileSync(
    pnpm,
    [
      'exec',
      'attw',
      '--pack',
      '.',
      '--entrypoints',
      '.',
      './primitives',
      './core',
      './locales/zh-CN',
      '--profile',
      'node16',
    ],
    { stdio: 'inherit' },
  )
} finally {
  // attw packs to the conventional filename and removes it. Preserve a local
  // archive that existed before the check, even if validation fails midway.
  if (hadArchive) {
    rmSync(archive, { force: true })
    renameSync(backup, archive)
  }
  rmSync(backupDir, { recursive: true, force: true })
}
