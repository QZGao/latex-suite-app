using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using win_bridge.Rpc;

namespace win_bridge.Windows;

/// <summary>
/// Reads metadata for the current foreground window.
/// </summary>
internal sealed class ForegroundWindowService
{
    public HostContextResult? GetForegroundWindow()
    {
        var hwnd = GetForegroundWindowNative();
        if (hwnd == IntPtr.Zero)
        {
            return null;
        }

        var titleBuilder = new StringBuilder(512);
        GetWindowTextNative(hwnd, titleBuilder, titleBuilder.Capacity);

        GetWindowThreadProcessIdNative(hwnd, out var processId);
        string processName;

        try
        {
            processName = Process.GetProcessById((int)processId).ProcessName + ".exe";
        }
        catch
        {
            processName = "unknown.exe";
        }

        GetWindowRectNative(hwnd, out var rect);

        return new HostContextResult
        {
            Hwnd = $"0x{hwnd.ToInt64():X}",
            ProcessName = processName,
            WindowTitle = titleBuilder.ToString(),
            Bounds = new HostBounds
            {
                X = rect.Left,
                Y = rect.Top,
                Width = rect.Right - rect.Left,
                Height = rect.Bottom - rect.Top
            }
        };
    }

    [DllImport("user32.dll", EntryPoint = "GetForegroundWindow", SetLastError = true)]
    private static extern IntPtr GetForegroundWindowNative();

    [DllImport("user32.dll", EntryPoint = "GetWindowTextW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowTextNative(IntPtr hwnd, StringBuilder text, int count);

    [DllImport("user32.dll", EntryPoint = "GetWindowThreadProcessId", SetLastError = true)]
    private static extern uint GetWindowThreadProcessIdNative(IntPtr hwnd, out uint processId);

    [DllImport("user32.dll", EntryPoint = "GetWindowRect", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetWindowRectNative(IntPtr hwnd, out Rect rect);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
