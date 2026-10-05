import {useCallback, useEffect, useState} from 'react';
import {bridgeRequest, isNative, subscribeToBridgeEvents} from './bridge';
import type {Activity, BridgeEvent, ChatMessage} from './types';

type Permission = {requestId: string; request: unknown};
type InputRequest = {requestId: string; question: string; choices?: string[]};
export type GenerationStatus = {projectId: string; state: string; phase?: string; attempts?: number; error?: unknown;
  completion?: {releasePath: string; outputs?: {format: string; path: string}[]}};
type Snapshot = {
  sessionState: {currentSessionId?: string; savedSessionId?: string; lastState?: string; activeProjectId?: string};
  transcript: {events: {id?: string; type: string; content?: string; data?: Record<string, unknown>}[]};
  pendingPermissions?: Permission[];
  pendingInputs?: InputRequest[];
};

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [state, setState] = useState(isNative ? 'Connecting' : 'Native app required');
  const [sessionId, setSessionId] = useState<string>();
  const [activeProjectId, setActiveProjectId] = useState<string>();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [inputs, setInputs] = useState<InputRequest[]>([]);
  const [error, setError] = useState<string>();
  const [generation, setGeneration] = useState<GenerationStatus>();
  const reportError = useCallback((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)), []);
  const refresh = useCallback(async () => {
    if (!isNative) return;
    const snapshot = await bridgeRequest<Snapshot>('agent.snapshot', {limit: 100});
    setState(snapshot.sessionState.lastState ?? 'idle');
    setSessionId(snapshot.sessionState.currentSessionId ?? snapshot.sessionState.savedSessionId);
    setActiveProjectId(snapshot.sessionState.activeProjectId);
    if (snapshot.sessionState.activeProjectId) {
      const status = await bridgeRequest<GenerationStatus | null>('project.generation.status', {projectId: snapshot.sessionState.activeProjectId});
      setGeneration(status ?? undefined);
    }
    setPermissions(snapshot.pendingPermissions ?? []);
    setInputs(snapshot.pendingInputs ?? []);
    const history = snapshot.transcript.events.filter(e => ['user.message', 'assistant.message'].includes(e.type))
      .map(e => ({id: e.id ?? crypto.randomUUID(), role: e.type === 'user.message' ? 'user' as const : 'agent' as const,
        text: String(e.content ?? e.data?.content ?? e.data?.text ?? '')})).filter(e => e.text);
    setMessages(history);
  }, []);
  const onEvent = useCallback((event: BridgeEvent) => {
    const data = event.data ?? {};
    if (event.event === 'agent.status') {
      setState(String(data.state ?? 'idle'));
      if (typeof data.sessionId === 'string') setSessionId(data.sessionId);
      if (typeof data.activeProjectId === 'string') setActiveProjectId(data.activeProjectId);
      if (['aborted', 'idle', 'ready'].includes(String(data.state))) {
        setMessages(current => current.map(m => ({...m, streaming: false})));
      }
    }
    if (event.event === 'agent.error') reportError(data.message ?? 'Agent failed');
    if (event.event === 'project.generation.status' && typeof data.projectId === 'string' && typeof data.state === 'string') {
      setGeneration({projectId: data.projectId, state: data.state, phase: typeof data.phase === 'string' ? data.phase : undefined,
        error: data.error, attempts: typeof data.attempts === 'number' ? data.attempts : undefined,
        completion: data.completion && typeof data.completion === 'object' && 'releasePath' in data.completion
          && typeof data.completion.releasePath === 'string' ? {releasePath: data.completion.releasePath} : undefined});
    }
    if (event.event === 'agent.user') setMessages(current => [...current, {id: crypto.randomUUID(), role: 'user', text: String(data.text ?? '')}]);
    if (event.event === 'agent.message.delta' && data.text) setMessages(current => {
      const last = current.at(-1);
      return last?.streaming
        ? [...current.slice(0, -1), {...last, text: last.text + String(data.text ?? '')}]
        : [...current, {id: crypto.randomUUID(), role: 'agent', text: String(data.text ?? ''), streaming: true}];
    });
    if (event.event === 'agent.message' && data.text) setMessages(current => {
      const message: ChatMessage = {id: crypto.randomUUID(), role: 'agent', text: String(data.text ?? '')};
      return current.at(-1)?.streaming ? [...current.slice(0, -1), message] : [...current, message];
    });
    if (event.event === 'agent.tool' || event.event === 'tool.status') setActivities(current => [{id: crypto.randomUUID(), name: String(data.name ?? 'tool'),
      status: String(data.status ?? ''), details: (typeof data.details === 'string' ? data.details : JSON.stringify(data.details))?.slice(0, 8000)}, ...current].slice(0, 100));
    if (event.event === 'review.progress') setActivities(current => [{id: crypto.randomUUID(), name: `review.${String(data.action ?? 'media')}`,
      status: String(data.status ?? ''), details: typeof data.timeSeconds === 'number' ? `Frame time: ${data.timeSeconds}s` : undefined}, ...current].slice(0, 100));
    if (event.event === 'agent.permission') setPermissions(current => [...current.filter(p => p.requestId !== data.requestId),
      {requestId: String(data.requestId), request: data.request}]);
    if (event.event === 'agent.input') setInputs(current => [...current.filter(p => p.requestId !== data.requestId),
      {requestId: String(data.requestId), question: String(data.question ?? ''), choices: Array.isArray(data.choices) ? data.choices.map(String) : undefined}]);
    if (event.event === 'agent.permission.resolved') setPermissions(current => current.filter(p => p.requestId !== data.requestId));
    if (event.event === 'agent.input.resolved') setInputs(current => current.filter(p => p.requestId !== data.requestId));
  }, [reportError]);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void subscribeToBridgeEvents(onEvent).then(async dispose => {
      if (disposed) { dispose(); return; }
      unlisten = dispose;
      await refresh();
    }).catch(reportError);
    return () => { disposed = true; unlisten?.(); };
  }, [onEvent, refresh, reportError]);
  useEffect(() => {
    const onFocus = () => { if (isNative) void refresh().catch(reportError); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh, reportError]);
  async function send(prompt: string) {
    await bridgeRequest('agent.send', {prompt});
    setError(undefined);
  }
  async function answerPermission(requestId: string, approved: boolean) {
    await bridgeRequest('agent.permission', {requestId, approved});
    setPermissions(current => current.filter(p => p.requestId !== requestId));
  }
  async function answerInput(requestId: string, answer: string) {
    await bridgeRequest('agent.input', {requestId, answer});
    setInputs(current => current.filter(p => p.requestId !== requestId));
  }
  return {messages, activities, state, sessionId, activeProjectId, permissions, inputs, generation, error, setError, reportError,
    refresh, send, answerPermission, answerInput};
}
