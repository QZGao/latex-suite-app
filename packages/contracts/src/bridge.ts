import type { HostContext } from "./host-adapter.js";

/**
 * RPC methods supported by the Windows bridge.
 */
export type BridgeMethod =
  | "ping"
  | "getForegroundWindow"
  | "restoreFocus"
  | "readClipboardText"
  | "writeClipboardText"
  | "sendKeys";

export interface BridgeRequest<TMethod extends BridgeMethod = BridgeMethod, TParams = unknown> {
  id: string;
  method: TMethod;
  params: TParams;
}

export interface BridgeResponse<TResult = unknown> {
  id: string;
  ok: boolean;
  result?: TResult;
  error?: string;
}

export interface PingResult {
  bridgeVersion: string;
}

export interface SendKeysParams {
  keys: string[];
  keyDelayMs?: number;
  settleDelayMs?: number;
}

export interface RestoreFocusParams {
  hwnd: string;
}

export type GetForegroundWindowResult = HostContext | null;

export interface RestoreFocusResult {
  restored: boolean;
}

export interface SendKeysResult {
  sent: string[];
}

export interface WriteClipboardTextParams {
  text: string;
}
