import { approveAll, RuntimeConnection } from '@github/copilot-sdk';
import type { CopilotClientOptions, PermissionHandler, SessionConfig } from '@github/copilot-sdk';
import type { resolveRuntime } from './runtime.ts';

export type PermissionMode = 'auto' | 'ask' | 'deny';

export function permissionMode(value: string = 'auto'): PermissionMode {
  if (value !== 'auto' && value !== 'ask' && value !== 'deny') throw new Error('permissions must be auto, ask or deny');
  return value;
}

export function profilePermissions(mode: PermissionMode = 'auto', ask?: PermissionHandler): PermissionHandler {
  if (mode === 'deny') return () => ({ kind: 'reject', feedback: 'Tools denied by a2swe session policy.' });
  if (mode === 'ask') {
    if (!ask) throw new Error('ask permission mode requires an interactive permission handler');
    return ask;
  }
  return (request, invocation) => {
    if (invocation.managedSettingsEnabled || request.managedApprovalRequired) {
      return { kind: 'reject', feedback: 'blocked_by_policy: automatic approval cannot override managed settings; use the native Copilot permission flow.' };
    }
    return approveAll(request, invocation);
  };
}

export function profileClient(runtime: ReturnType<typeof resolveRuntime>): CopilotClientOptions {
  if (runtime.runtime !== 'copilot') throw new Error('Agency injects --session-id and cannot launch SDK --headless mode. Use npm run agency:copilot for Agency, or --cli with a Copilot executable for SDK sessions.');
  return { connection: RuntimeConnection.forStdio({ path: runtime.cli, args: runtime.args }), mode: 'copilot-cli',
    baseDirectory: runtime.baseDirectory, workingDirectory: runtime.workingDirectory, useLoggedInUser: true,
    logLevel: 'error', enableRemoteSessions: false };
}

export function profileSession(workingDirectory: string, onPermissionRequest: PermissionHandler,
  options: { model?: string; agent?: string } = {}): SessionConfig {
  return { workingDirectory, ...options, enableConfigDiscovery: true, enableOnDemandInstructionDiscovery: true,
    enableSkills: true, enableSessionStore: true, enableFileHooks: true, skipCustomInstructions: false,
    mcpOAuthTokenStorage: 'persistent', onPermissionRequest };
}

export async function deadline<Value>(operation: Promise<Value>, milliseconds: number): Promise<Value> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('copilot_operation_timeout')), milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}