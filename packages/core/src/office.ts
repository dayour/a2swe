import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { sha256 } from './canonical.ts';
import { projectIdOf } from './release.ts';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// PowerPoint and Word are driven read-only with alerts suppressed so no hidden dialog can block automation; documents opened
// here are closed without saving, and the applications quit only if they had no open documents.
const OFFICE_SCRIPT = String.raw`
param([string]$Deck, [string]$Document, [string]$Out)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force (Join-Path $Out 'slides') | Out-Null
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.DisplayAlerts = 1
$initial = $ppt.Presentations.Count
$deckFile = $null; $overflow = @(); $slides = 0; $pptVersion = $ppt.Version
try {
  $deckFile = $ppt.Presentations.Open([string]$Deck, -1, 0, 0)
  $deckFile.Export([string](Join-Path $Out 'slides'), 'PNG', 1600, 900)
  $slides = $deckFile.Slides.Count
  foreach ($slide in $deckFile.Slides) { foreach ($shape in $slide.Shapes) { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
    $range = $shape.TextFrame.TextRange
    if ($range.BoundHeight -gt ($shape.Height + 2) -or $range.BoundWidth -gt ($shape.Width + 2)) { $overflow += @{ slide = $slide.SlideIndex; shape = $shape.Name; text = $range.Text } }
  } } }
} finally { if ($deckFile) { $deckFile.Close() }; if ($initial -eq 0 -and $ppt.Presentations.Count -eq 0) { $ppt.Quit() } }
$word = New-Object -ComObject Word.Application
$word.DisplayAlerts = 0
$initial = $word.Documents.Count
$doc = $null; $pages = 0; $wordVersion = $word.Version
try {
  # COM arguments are cast to [string]: Word blocks indefinitely when ExportAsFixedFormat receives a PowerShell-wrapped Join-Path result.
  $doc = $word.Documents.Open([string]$Document, $false, $true, $false)
  $doc.ExportAsFixedFormat([string](Join-Path $Out 'document-native.pdf'), 17)
  $pages = $doc.ComputeStatistics(2)
} finally { if ($doc) { $doc.Close([ref]0) }; if ($initial -eq 0 -and $word.Documents.Count -eq 0) { $word.Quit([ref]0) } }
@{ powerPointVersion = $pptVersion; wordVersion = $wordVersion; slides = $slides; pages = $pages; overflow = @($overflow) } | ConvertTo-Json -Depth 6 -Compress
`;

// Stops only window-less PowerPoint/Word automation processes created after the given time, i.e. instances a timed-out run left behind.
const OFFICE_CLEANUP = String.raw`
param([string]$Since)
$start = [DateTime]::Parse($Since).ToLocalTime()
Get-Process POWERPNT, WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge $start -and -not $_.MainWindowTitle } | ForEach-Object { Stop-Process -Id $_.Id -Force }
`;

const RASTERIZE = `import sys, pymupdf
document = pymupdf.open(sys.argv[1])
for index, page in enumerate(document):
    page.get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(f"{sys.argv[2]}/{sys.argv[3]}-{index + 1:02d}.png")
print(len(document))
`;

async function contactSheet(files: string[], target: string, width: number, height: number, columns: number): Promise<void> {
  if (!files.length) return;
  const tiles = await Promise.all(files.map((file) => sharp(file).resize(width - 16, height - 16, { fit: 'contain', background: '#d9dfe8' }).toBuffer()));
  const rows = Math.ceil(tiles.length / columns);
  await sharp({ create: { width: columns * width, height: rows * height, channels: 3, background: '#d9dfe8' } })
    .composite(tiles.map((input, index) => ({ input, left: (index % columns) * width + 8, top: Math.floor(index / columns) * height + 8 })))
    .jpeg({ quality: 84, mozjpeg: true }).toFile(target);
}

/** Renders the release PPTX and DOCX with native Microsoft Office and records source-bound QA evidence in qc/native-office. */
export async function renderNativeOffice(projectDirectory: string) {
  if (process.platform !== 'win32') throw new Error('native_office_requires_windows');
  const project = path.resolve(projectDirectory);
  const deck = path.join(project, 'release', 'outputs', 'deck.pptx');
  const document = path.join(project, 'release', 'outputs', 'document.docx');
  if (!existsSync(deck) || !existsSync(document)) throw new Error('native_office_inputs_missing');
  const out = path.join(project, 'qc', 'native-office');
  await rm(out, { recursive: true, force: true });
  await mkdir(path.join(out, 'pages'), { recursive: true });
  const script = path.join(out, '.office-render.ps1');
  await writeFile(script, OFFICE_SCRIPT);
  const startedAt = new Date(Date.now() - 1000).toISOString();
  const office = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, deck, document, out],
    { encoding: 'utf8', timeout: 5 * 60 * 1000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  await rm(script, { force: true });
  if (office.error || office.status !== 0) {
    const cleanup = path.join(out, '.office-cleanup.ps1');
    await writeFile(cleanup, OFFICE_CLEANUP);
    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', cleanup, startedAt], { timeout: 60 * 1000, windowsHide: true });
    await rm(cleanup, { force: true });
    throw new Error(`native_office_failed: ${(office.error?.message ?? office.stderr ?? office.stdout).trim().slice(-2000)}`);
  }
  const result = JSON.parse(office.stdout.trim().split(/\r?\n/).at(-1) ?? '{}') as { powerPointVersion: string; wordVersion: string; slides: number; pages: number; overflow: unknown[] };
  const python = path.join(REPOSITORY_ROOT, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  for (const [pdf, prefix] of [[path.join(out, 'document-native.pdf'), 'word'], [path.join(project, 'release', 'outputs', 'document.pdf'), 'core']]) {
    const raster = spawnSync(python, ['-c', RASTERIZE, pdf, path.join(out, 'pages'), prefix], { encoding: 'utf8', timeout: 5 * 60 * 1000, windowsHide: true });
    if (raster.error || raster.status !== 0) throw new Error(`native_office_rasterize_failed: ${(raster.error?.message ?? raster.stderr).trim().slice(-1000)}`);
  }
  const slides = (await readdir(path.join(out, 'slides'))).filter((name) => /\.png$/i.test(name))
    .sort((a, b) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(b)?.[0])).map((name) => path.join(out, 'slides', name));
  const pages = (await readdir(path.join(out, 'pages'))).sort();
  await contactSheet(slides, path.join(out, 'slides-contact.jpg'), 800, 474, 2);
  await contactSheet(pages.filter((name) => name.startsWith('word-')).map((name) => path.join(out, 'pages', name)), path.join(out, 'word-contact.jpg'), 420, 570, 3);
  await contactSheet(pages.filter((name) => name.startsWith('core-')).map((name) => path.join(out, 'pages', name)), path.join(out, 'core-contact.jpg'), 420, 570, 3);
  const receipt = {
    schemaVersion: '1.0.0', projectId: projectIdOf(project), checkedAt: new Date().toISOString(),
    pptx: { renderer: 'Microsoft PowerPoint', version: result.powerPointVersion, slides: result.slides, overflow: result.overflow ?? [],
      sha256: sha256(await readFile(deck)), preview: 'qc/native-office/slides-contact.jpg' },
    docx: { renderer: 'Microsoft Word', version: result.wordVersion, pages: result.pages, sha256: sha256(await readFile(document)),
      pdf: 'qc/native-office/document-native.pdf', preview: 'qc/native-office/word-contact.jpg' },
    corePdf: { pages: pages.filter((name) => name.startsWith('core-')).length, preview: 'qc/native-office/core-contact.jpg' }
  };
  await writeFile(path.join(out, 'native-render.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
