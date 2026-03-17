/**
 * Minimal host window context shared by the desktop shell.
 */
export interface HostBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Native window data used for host inspection and popup placement.
 */
export interface HostContext {
  hwnd: string;
  processName: string;
  windowTitle: string;
  bounds: HostBounds;
  focusedElementName?: string;
  focusedElementRole?: string;
  focusedElementBounds?: HostBounds;
}
