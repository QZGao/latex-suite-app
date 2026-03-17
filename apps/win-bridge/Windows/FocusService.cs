using System.Globalization;
using System.Runtime.InteropServices;

namespace win_bridge.Windows;

/// <summary>
/// Restores focus to a previously captured top-level window handle.
/// </summary>
internal sealed class FocusService
{
    private const int SwRestore = 9;

    public bool RestoreFocus(string hwndRaw)
    {
        if (!TryParseWindowHandle(hwndRaw, out var hwnd) || hwnd == IntPtr.Zero || !IsWindow(hwnd))
        {
            return false;
        }

        var currentForeground = GetForegroundWindow();
        var currentThreadId = GetCurrentThreadId();
        var targetThreadId = GetWindowThreadProcessId(hwnd, out _);
        var foregroundThreadId = currentForeground != IntPtr.Zero
            ? GetWindowThreadProcessId(currentForeground, out _)
            : 0;

        var attachedToForeground = false;
        var attachedToTarget = false;

        try
        {
            if (IsIconic(hwnd))
            {
                ShowWindowAsync(hwnd, SwRestore);
            }

            if (foregroundThreadId != 0 && foregroundThreadId != currentThreadId)
            {
                attachedToForeground = AttachThreadInput(foregroundThreadId, currentThreadId, true);
            }

            if (targetThreadId != 0 && targetThreadId != currentThreadId)
            {
                attachedToTarget = AttachThreadInput(targetThreadId, currentThreadId, true);
            }

            BringWindowToTop(hwnd);
            SetForegroundWindow(hwnd);
            SetFocus(hwnd);
            Thread.Sleep(50);

            return GetForegroundWindow() == hwnd;
        }
        finally
        {
            if (attachedToTarget)
            {
                AttachThreadInput(targetThreadId, currentThreadId, false);
            }

            if (attachedToForeground)
            {
                AttachThreadInput(foregroundThreadId, currentThreadId, false);
            }
        }
    }

    private static bool TryParseWindowHandle(string hwndRaw, out IntPtr hwnd)
    {
        hwnd = IntPtr.Zero;
        if (string.IsNullOrWhiteSpace(hwndRaw))
        {
            return false;
        }

        var normalized = hwndRaw.StartsWith("0x", StringComparison.OrdinalIgnoreCase)
            ? hwndRaw[2..]
            : hwndRaw;

        if (!long.TryParse(normalized, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var value) &&
            !long.TryParse(normalized, NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
        {
            return false;
        }

        hwnd = new IntPtr(value);
        return true;
    }

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AttachThreadInput(uint attachId, uint attachToId, bool attach);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool BringWindowToTop(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsWindow(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsIconic(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ShowWindowAsync(IntPtr hwnd, int command);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetFocus(IntPtr hwnd);
}
