import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { AppSettings, BridgeEvent } from './types';

export const isNative = '__TAURI_INTERNALS__' in window;

export async function bridgeRequest<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!isNative) {
    throw new Error('Native bridge unavailable. Run the Tauri desktop app to connect to a2swe.');
  }
  return invoke<T>('bridge_request', { method, params });
}

export async function readSettings(): Promise<AppSettings> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  return invoke<AppSettings>('get_settings');
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  return invoke<AppSettings>('save_settings', { settings });
}

export async function showWidget(): Promise<void> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  await invoke('show_widget');
}

export async function hideWidget(): Promise<void> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  await invoke('hide_widget');
}

export async function focusMain(): Promise<void> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  await invoke('focus_main');
}

export async function imageData(path: string): Promise<string> {
  if (!isNative) throw new Error('Native bridge unavailable.');
  return invoke<string>('read_image', { path });
}

export function subscribeToBridgeEvents(handler: (event: BridgeEvent) => void): Promise<UnlistenFn> {
  if (!isNative) return Promise.resolve(() => undefined);
  return listen<BridgeEvent>('a2swe-bridge-event', (event) => handler(event.payload));
}
