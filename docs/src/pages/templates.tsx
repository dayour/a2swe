import {useState} from 'react';
import Link from '@docusaurus/Link';
import {Blueprint, catalog, download, LibraryShell, SourceLink, Stats, type Template} from '../components/library/shared';
import {RecipePreview} from '../components/library/recipe';
import {brandInstructions, brandPlanWarnings, createBrandPlan, densities, slideIntents, validateBrandPlan, validateSlideRecipe, type BrandPlan, type SlideRecipe} from '../../../template/scripts/brand-plan';

function recipeOf(item: Template): SlideRecipe | null {
  const recipe = item.recipe;
  if (!recipe) return null;
  validateSlideRecipe(recipe);
  return recipe;
}

function TemplateCard({item, selected, onToggle}: {item: Template; selected: boolean; onToggle: () => void}) {
  const [back, setBack] = useState(false);
  const recipe = recipeOf(item);
  return <article className={`library-card ${selected ? 'library-card--selected' : ''}`}>
    <div className="library-card-body">
      <div className="library-meta"><span className="library-badge">{item.category}</span>
        <button aria-pressed={back} onClick={() => setBack(!back)} aria-label={`${back ? 'Preview' : 'Inspect'} ${item.title}`}>{back ? 'Preview' : 'Inspect manifest'}</button></div>
      <h2>{item.title}</h2>
      {back ? <pre className="library-manifest" tabIndex={0} aria-label={`${item.title} manifest`}>{JSON.stringify({source: item.source, symbol: item.symbol, sha256: item.digest, category: item.category, tags: item.tags, recipe}, null, 2)}</pre>
        : <>{recipe ? <RecipePreview recipe={recipe} /> : <Blueprint kind={item.preview} name={item.title} />}<p className="library-description">{item.description}</p></>}
      <div className="library-tags">{item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="library-actions library-card-footer">
        <button className={selected ? '' : 'library-primary'} aria-pressed={selected} onClick={onToggle}>{selected ? 'Remove from scenario' : 'Add to scenario'}</button>
        <SourceLink source={item.source}>Open source</SourceLink>
      </div>
    </div>
  </article>;
}

export default function Templates() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scenario, setScenario] = useState('');
  const [audience, setAudience] = useState('Engineering leaders');
  const [duration, setDuration] = useState('30');
  const [output, setOutput] = useState('video');
  const [exemplar, setExemplar] = useState('');
  const [intent, setIntent] = useState('All');
  const [density, setDensity] = useState('All');
  const [limit, setLimit] = useState(18);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const categories = ['All', ...Array.from(new Set(catalog.templates.map((item) => item.category)))];
  const items = catalog.templates.filter((item) => (category === 'All' || item.category === category) &&
    (intent === 'All' || item.recipe?.intent === intent) && (density === 'All' || item.recipe?.density === density) &&
    `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const selected = catalog.templates.filter((item) => selectedIds.includes(item.id));
  const formats: BrandPlan['formats'] = output === 'both' ? ['pptx', 'video'] : output === 'pptx' ? ['pptx'] : ['video'];
  const recipes = selected.flatMap((item) => { const recipe = recipeOf(item); return recipe ? [recipe] : []; });
  const brandPlan = createBrandPlan(recipes, formats, exemplar);
  const plan = {schemaVersion: 'a2swe-scenario/2', scenario: scenario.trim(), audience, targetSeconds: Number(duration), brandPlan,
    execution: 'manual-review-required', templates: selected.map((item) => ({id: item.id, category: item.category, source: item.source, symbol: item.symbol, sha256: item.digest})),
    gates: ['Confirm scope and domain approval', 'Review sample slides and verified brand basis', 'Approve narration', 'Approve voice and any external transfer', 'Approve pilot and slide samples', 'Review rights and release']};
  const prompt = `Create an English explainer about: ${scenario.trim()}\nAudience: ${audience}\nOutputs: ${formats.join(', ')}\nVideo target (if selected): ${duration} seconds\n\nRead SKILL.md and reference/production-rules.md first. Scaffold a separate project; do not overwrite existing work.\n\nSelected repository material:\n${selected.map((item) => `- ${item.category}: ${item.source}${item.symbol ? ` (${item.symbol})` : ''} [sha256 ${item.digest}]`).join('\n')}\n\n${brandInstructions(brandPlan)}\n\nSave the companion a2swe-scenario.json download in the new project for the preflight command. Adapt the selected sources; do not inherit prior facts, approvals, or rights. Confirm scope, approve narration and voice handling, then approve the pilot before completing production. Report missing tools and sources rather than claiming success.`;
  function validatePlan() {
    if (!scenario.trim() || !selected.length) { setError('Describe your scenario and add at least one library entry.'); return false; }
    try { validateBrandPlan(brandPlan); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return false; }
    setError(''); return true;
  }
  async function copyPrompt() {
    if (!validatePlan()) return;
    try { await navigator.clipboard.writeText(prompt); setMessage('Scenario instructions copied. Paste into your coding agent for review.'); }
    catch (cause) { setError(`Clipboard unavailable: ${cause instanceof Error ? cause.message : String(cause)}. Use Download instructions instead.`); }
  }
  return <LibraryShell title="Template Library" description="Choose the expertise, visual language, and story structure for your scenario. Inspect every card back to its actual source.">
    <Stats items={[{value: catalog.templates.length, label: 'Source-backed entries'}, {value: categories.length - 1, label: 'Categories'}, {value: selected.length, label: 'In your scenario'}]} />
    <p className="library-notice">Inspired by <a href="https://microsoft.github.io/flipcard/flipdeck/">FlipDeck</a>: preview on the front, source manifest on the back. Illustrations explain the pattern; they are not live Remotion renders. Applying entries exports a reviewable plan, not an automatic production run. <Link to="/docs/platform/templates">Template contract</Link></p>
    <section className="library-brand-guide" aria-label="Example-led brand workflow">
      <h2>Start with a complete example</h2>
      <p>Sample slides first, layouts second, Slide Master fallback. Choose a complete slide recipe, then add agents, graphics, and storylines. Recipes demonstrate light, medium, and heavy density; they are not official brand templates.</p>
      <div className="library-actions"><button onClick={() => { setCategory('Slide recipes'); setIntent('All'); setDensity('All'); setQuery(''); setLimit(18); }}>Browse slide recipes</button>
        <Link to="/docs/specifications/brand-templates">PPT and video brand specification</Link></div>
    </section>
    <div className="library-workspace">
      <aside className="library-sidebar">
        <h2>Browse by type</h2>
        <div className="library-categories" role="group" aria-label="Template category">{categories.map((value) =>
          <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setLimit(18); }}>{value}<span>{value === 'All' ? catalog.templates.length : catalog.templates.filter((item) => item.category === value).length}</span></button>)}</div>
        <section className="library-scenario">
          <h2>Your scenario</h2>
          <label className="library-field">What are you explaining?<textarea value={scenario} maxLength={2000} onChange={(event) => setScenario(event.target.value)} placeholder="A maintenance-request agent for field technicians..." rows={4} /></label>
          <label className="library-field">Audience<input value={audience} maxLength={160} onChange={(event) => setAudience(event.target.value)} /></label>
          <label className="library-field">Output format<select value={output} onChange={(event) => setOutput(event.target.value)}><option value="video">Video</option><option value="pptx">PowerPoint</option><option value="both">PowerPoint + video</option></select></label>
          <label className="library-field">Target duration<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="120">2 minutes</option><option value="180">3 minutes</option></select></label>
          <label className="library-field">Brand exemplar reference (optional)<textarea value={exemplar} maxLength={2000} rows={3} onChange={(event) => setExemplar(event.target.value)} placeholder="Approved template path and sample slide numbers..." /></label>
          <p>This is a reference only. No file is opened or uploaded; rights, source hashes, and approvals must be verified separately.</p>
          <ul className="library-selection">{selected.map((item) => <li key={item.id}>{item.title}<button onClick={() => setSelectedIds(selectedIds.filter((id) => id !== item.id))} aria-label={`Remove ${item.title}`}>Remove</button></li>)}</ul>
          {!selected.length && <p>Add cards to assemble your brief.</p>}
          <p>{recipes.length} complete recipes selected. At least one is required for a PPT/video authoring plan.</p>
          <details><summary>Brand readiness: review required</summary><ul>{brandPlanWarnings(brandPlan).map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
          <div className="library-stack">
            <button className="library-primary" onClick={() => { if (validatePlan()) { download('a2swe-scenario.json', JSON.stringify(plan, null, 2)); setMessage('Scenario plan downloaded. No project files were changed.'); } }}>Download scenario</button>
            <button onClick={copyPrompt}>Copy agent instructions</button>
            <button onClick={() => { if (validatePlan()) download('a2swe-scenario.txt', prompt, 'text/plain'); }}>Download instructions</button>
          </div>
          {error && <p role="alert" className="library-error">{error}</p>}<p role="status">{message}</p>
        </section>
      </aside>
      <section aria-label="Template gallery">
        <label className="library-field">Search the library<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(18); }} placeholder="Agent, storyboard, glow, Power Platform..." /></label>
        <div className="library-toolbar">
          <label className="library-field">Slide intent<select value={intent} onChange={(event) => { setIntent(event.target.value); setLimit(18); }}>{['All', ...slideIntents].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="library-field">Content density<select value={density} onChange={(event) => { setDensity(event.target.value); setLimit(18); }}>{['All', ...densities].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <p role="status">{items.length} matching entries / {selected.length} selected</p>
        <div className="library-grid library-grid--templates">{items.slice(0, limit).map((item) =>
          <TemplateCard key={item.id} item={item} selected={selectedIds.includes(item.id)} onToggle={() => setSelectedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} />)}</div>
        {!items.length && <p className="library-empty">No entries match. Try another category or search term.</p>}
        {items.length > limit && <button className="library-more" onClick={() => setLimit(limit + 18)}>Show more ({items.length - limit} remaining)</button>}
      </section>
    </div>
  </LibraryShell>;
}
