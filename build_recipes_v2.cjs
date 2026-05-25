#!/usr/bin/env node
'use strict'

// ============================================================
// build_recipes_v2.cjs
// Batch recipe extractor — reads a .docx or .txt file,
// splits and parses all recipes, outputs import-ready JSON.
//
// Usage:
//   node build_recipes_v2.cjs <input-file> [output.json]
//
// If output file is omitted, JSON is written to stdout.
// Progress and counts are written to stderr.
// ============================================================

const fs   = require('fs')
const path = require('path')
const { splitIntoRecipes, parseOcrText } = require('./parse_recipes.cjs')

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf8')
  }

  if (ext === '.docx' || ext === '.doc') {
    const mammoth = require('mammoth')
    const result  = await mammoth.extractRawText({ path: filePath })
    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        process.stderr.write(`  [mammoth] ${msg.type}: ${msg.message}\n`)
      }
    }
    return result.value
  }

  throw new Error(`Unsupported file type: ${ext}. Supported: .txt, .md, .docx`)
}

async function main() {
  const [,, inputArg, outputArg] = process.argv

  if (!inputArg) {
    console.error('Usage: node build_recipes_v2.cjs <input-file> [output.json]')
    process.exit(1)
  }

  const inputPath = path.resolve(inputArg)
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`)
    process.exit(1)
  }

  process.stderr.write(`Reading: ${inputPath}\n`)
  const rawText = await extractText(inputPath)
  process.stderr.write(`Extracted ${rawText.length} characters\n`)

  process.stderr.write(`Splitting into recipes…\n`)
  const chunks = splitIntoRecipes(rawText)
  process.stderr.write(`Found ${chunks.length} recipe(s)\n\n`)

  const recipes = chunks.map((chunk, i) => {
    const parsed = parseOcrText(chunk)
    const ingredientCount = parsed.sections.reduce((n, s) => n + s.ingredients.length, 0)
    process.stderr.write(
      `  [${String(i + 1).padStart(2)}/${chunks.length}] ${parsed.title}` +
      ` — ${ingredientCount} ingredient(s), ${parsed.method_steps.length} step(s)` +
      (parsed.source ? `, source: ${parsed.source}` : '') +
      `\n`
    )
    return parsed
  })

  process.stderr.write(`\nDone.\n`)

  const output = JSON.stringify(recipes, null, 2)

  if (outputArg) {
    const outPath = path.resolve(outputArg)
    fs.writeFileSync(outPath, output, 'utf8')
    process.stderr.write(`Output written to: ${outPath}\n`)
  } else {
    process.stdout.write(output + '\n')
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
