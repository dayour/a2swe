import {useEffect, useMemo, useState} from 'react';
import {FolderPlus, Sparkles, X} from 'lucide-react';
import {bridgeRequest, isNative} from './bridge';
import type {GenerationRequest} from '../../../packages/core/src/contracts.generated';
import type {LibraryItem} from './types';

export type GenerationLaunch = {projectId: string; path: string; sessionId: string; state: string; requestPath: string};
type OutputFormat = GenerationRequest['formats'][number];
type GenerationDraft = Omit<GenerationRequest, 'schemaVersion' | 'sources' | 'libraryPaths' | 'formats'> & {
  sources: string[]; libraryPaths: string[]; formats: OutputFormat[];
};
const formats: {id: GenerationRequest['formats'][number]; name: string}[] = [
  {id: 'remotion', name: 'Video + narration'}, {id: 'pptx', name: 'PowerPoint'}, {id: 'pdf', name: 'PDF'},
  {id: 'docx', name: 'Word'}, {id: 'html', name: 'HTML'}, {id: 'adaptiveDeck', name: 'AdaptiveDeck'},
  {id: 'png', name: 'PNG'}, {id: 'jpeg', name: 'JPEG'}
];

export function NewProject({library, profiles, selected, onClose, onLaunched, reportError, busyAgent}: {
  library: LibraryItem[]; profiles: LibraryItem[]; selected: string[]; onClose: () => void;
  onLaunched: (launch: GenerationLaunch, mode: 'guided' | 'auto') => Promise<void>; reportError: (error: unknown) => void; busyAgent: boolean;
}) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idEdited, setIdEdited] = useState(false);
  const [kind, setKind] = useState<GenerationRequest['kind']>('topic');
  const [brief, setBrief] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [paths, setPaths] = useState(selected);
  const [query, setQuery] = useState('');
  const [voiceProfile, setVoiceProfile] = useState(profiles.find(p => p.id === 'am_michael')?.id ?? profiles[0]?.id ?? '');
  const [speed, setSpeed] = useState(1);
  const [outputs, setOutputs] = useState<OutputFormat[]>(formats.map(f => f.id));
  const [mode, setMode] = useState<'guided' | 'auto'>('guided');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!voiceProfile && profiles.length) setVoiceProfile(profiles.find(p => p.id === 'am_michael')?.id ?? profiles[0].id);
  }, [profiles, voiceProfile]);
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return library.filter(item => item.path?.startsWith('library/') && !item.extractionStatus?.startsWith('protected'))
      .filter(item => { if (seen.has(item.path!)) return false; seen.add(item.path!); return true; })
      .filter(item => `${item.title ?? item.name} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  }, [library, query]);
  async function generate() {
    setError('');
    const sources = [...new Set(sourceText.split(/\r?\n/).map(value => value.trim()).filter(Boolean))];
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id) || !name.trim() || !brief.trim() || !outputs.length || !voiceProfile) {
      setError('Provide a name, a lowercase project ID, a brief, a voice and at least one output.'); return;
    }
    for (const source of sources) {
      try {
        const url = new URL(source);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported source');
      } catch { setError(`Use a public HTTP/HTTPS URL without credentials: ${source}`); return; }
    }
    if (sources.length > 20 || paths.length > 40) { setError('Choose at most 20 URLs and 40 library items.'); return; }
    const request: GenerationDraft = {id, name: name.trim(), kind, brief: brief.trim(),
      sources, libraryPaths: paths, voiceProfile, speed, formats: outputs, mode};
    setStarting(true);
    try {
      const launch = await bridgeRequest<GenerationLaunch>('project.generate', request);
      await onLaunched(launch, mode);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      reportError(cause);
    } finally { setStarting(false); }
  }
  return <div className="settings-backdrop"><form className="new-project-dialog" aria-label="New a2swe project" onSubmit={event => {event.preventDefault();void generate();}}>
    <header><div><span className="eyebrow">Prompt to production</span><h2><FolderPlus size={21}/> New project</h2></div><button type="button" className="icon-button" aria-label="Close new project" disabled={starting} onClick={onClose}><X size={18}/></button></header>
    <div className="new-project-columns"><section>
      <label>Project name<input aria-label="Project name" maxLength={160} value={name} onChange={event => {
        setName(event.target.value);
        if (!idEdited) setId(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80));
      }} required/></label>
      <div className="form-row"><label>Project ID<input aria-label="Project ID" pattern="[a-z0-9][a-z0-9-]{0,79}" value={id} onChange={event => {setIdEdited(true);setId(event.target.value);}} required/></label>
        <label>Context type<select aria-label="Context type" value={kind} onChange={event => setKind(event.target.value as GenerationRequest['kind'])}>
          {['topic', 'company', 'customer', 'framework', 'repository', 'tool'].map(k => <option key={k} value={k}>{k === 'tool' ? 'product / tool' : k}</option>)}
        </select></label></div>
      <label>What should the agent create?<textarea aria-label="Project brief" rows={5} maxLength={12000} value={brief} onChange={event => setBrief(event.target.value)} placeholder="Explain the product for engineering leaders. Research the brand, build a domain SWE agent, and produce a narrated video and presentation..." required/></label>
      <label>Source URLs (one per line)<textarea aria-label="Project source URLs" rows={3} value={sourceText} onChange={event => setSourceText(event.target.value)} placeholder="https://company.example/product&#10;https://docs.example/overview"/></label>
      <div className="form-row"><label>Voice<select aria-label="Project voice" value={voiceProfile} onChange={event => setVoiceProfile(event.target.value)}>
        {!profiles.length && <option value="">No voice profiles loaded</option>}
        {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name ?? profile.title ?? profile.id}</option>)}
      </select></label><label>Speech speed<input aria-label="Speech speed" type="number" min={0.5} max={2} step={0.05} value={speed} onChange={event => setSpeed(Number(event.target.value))}/></label></div>
      <fieldset><legend>Generate outputs</legend><div className="output-options">{formats.map(format => <label key={format.id}><input type="checkbox" checked={outputs.includes(format.id)} onChange={event => setOutputs(current => event.target.checked ? [...current, format.id] : current.filter(value => value !== format.id))}/>{format.name}</label>)}</div></fieldset>
    </section><section>
      <h3>Attach library context <span className="count">{paths.length}</span></h3><p>Choose skills, agents, product documents, or reusable assets. The agent retrieves selected material as needed.</p>
      <input aria-label="Find project library context" placeholder="Find a skill, product or diagram" value={query} onChange={event => setQuery(event.target.value)}/>
      {paths.length > 0 && <div className="selected-context">{paths.map(path => <button type="button" key={path} onClick={() => setPaths(current => current.filter(p => p !== path))} title={`Remove ${path}`}>{path.split('/').slice(-2).join('/')} <X size={12}/></button>)}</div>}
      <div className="context-picker">{candidates.slice(0, 50).map(item => <label key={item.path}><input type="checkbox" checked={paths.includes(item.path!)} onChange={event => setPaths(current => event.target.checked ? [...current, item.path!] : current.filter(p => p !== item.path))}/><span><strong>{item.title ?? item.name ?? item.id}</strong><small>{item.path}</small></span></label>)}</div>
      {candidates.length > 50 && <p>Narrow the search to find additional entries.</p>}
      <fieldset><legend>Generation mode</legend>
        <label><input type="radio" name="generation-mode" checked={mode === 'guided'} onChange={() => setMode('guided')}/> Guided: review tool requests</label>
        <label><input type="radio" name="generation-mode" checked={mode === 'auto'} onChange={() => setMode('auto')}/> Auto: generate and verify autonomously</label>
      </fieldset>
      <p className="mode-explanation">{mode === 'auto'
        ? 'Auto authorizes the agent to research, edit this checkout, run tools, render the selected formats and repair failed checks without per-tool prompts, subject to managed policy. Model usage and local rendering consume resources. Stop remains available.'
        : 'The agent builds the project with you. Permission prompts appear in the console and widget; production quality checks still run.'}</p>
    </section></div>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {busyAgent && <p role="status">Stop or finish the current agent turn before starting another project.</p>}
    <footer><span>{starting ? 'Creating project and connecting the agent...' : 'A real project, persisted request, source receipts and QC. Existing folders are never overwritten.'}</span>
      {starting && <button type="button" className="secondary-button" onClick={() => void bridgeRequest('agent.abort', {projectId: id}).catch(reportError)}>Stop launch</button>}
      <button type="submit" className="primary-button" disabled={starting || busyAgent || !isNative || !voiceProfile}><Sparkles size={16}/>{starting ? 'Starting...' : mode === 'auto' ? 'Create and auto-generate' : 'Create with agent'}</button></footer>
  </form></div>;
}
