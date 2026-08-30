/**
 * Guards the one duplication this project accepts on purpose.
 *
 * The CSS preset (src/preset/DefaultContent.tsx) and the shadcn registry block
 * (registry/image-view/image-view.tsx) are the same UI expressed twice — once
 * with custom properties, once with Tailwind classes. Offering both is a real
 * decision, but it means a control added to one can silently be missing from
 * the other, and the two only diverge visibly for whoever installed the wrong
 * one. That already nearly happened: fixing the hardcoded Chinese strings
 * needed edits in both files and the second was easy to miss.
 *
 * This compares the set of parts each composition uses. It does not check that
 * they look alike — a screenshot would be needed for that, and the two are
 * styled deliberately differently — only that neither has drifted into
 * exposing something the other does not.
 *
 *   node scripts/check-registry.mjs
 */
import { readFileSync } from 'node:fs'

const PRESET = 'src/preset/DefaultContent.tsx'
const REGISTRY = 'registry/image-view/image-view.tsx'

/**
 * Parts that are structural rather than user-facing. The registry block spells
 * out the whole tree (`ImageView.Group`, `Stage`, …) because it is standalone
 * source; the preset gets some of that from its own imports. Comparing those
 * would report a difference that does not exist.
 */
const STRUCTURAL = new Set([
  'Group',
  'ImageView',
  'Content',
  'Stage',
  'Image',
  'Header',
  'Toolbar',
  'Footer',
  'DefaultContent',
])

/** The registry writes `ImageView.Error`; the preset imports it as `ErrorState`. */
const ALIASES = new Map([['ErrorState', 'Error']])

function partsIn(file, pattern) {
  const source = readFileSync(file, 'utf8')
  const found = new Set()
  for (const match of source.matchAll(pattern)) {
    const name = match[1]
    if (STRUCTURAL.has(name)) continue
    // Icons are drawn from different sources on purpose — the preset ships its
    // own so it has no dependencies, the registry block uses lucide-react
    // because a shadcn project already has it. That is a chosen difference,
    // not drift.
    if (name.endsWith('Icon')) continue
    found.add(ALIASES.get(name) ?? name)
  }
  return found
}

const preset = partsIn(PRESET, /<([A-Z][A-Za-z]*)[\s/>]/g)
const registry = partsIn(REGISTRY, /ImageView\.([A-Z][A-Za-z]*)/g)

const missingFromRegistry = [...preset].filter((p) => !registry.has(p)).sort()
const missingFromPreset = [...registry].filter((p) => !preset.has(p)).sort()

if (missingFromRegistry.length === 0 && missingFromPreset.length === 0) {
  console.log(`registry:check — both compositions expose the same ${preset.size} parts`)
  process.exit(0)
}

console.error('The preset and the registry block have drifted.\n')
if (missingFromRegistry.length) {
  console.error(`  In ${PRESET} but not ${REGISTRY}:`)
  for (const p of missingFromRegistry) console.error(`    - ${p}`)
}
if (missingFromPreset.length) {
  console.error(`  In ${REGISTRY} but not ${PRESET}:`)
  for (const p of missingFromPreset) console.error(`    - ${p}`)
}
console.error('\nAdd the part to whichever is missing it, or — if the difference')
console.error('is deliberate — record it in STRUCTURAL/ALIASES in this script.')
process.exit(1)
