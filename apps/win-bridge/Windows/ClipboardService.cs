using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace win_bridge.Windows;

/// <summary>
/// Native clipboard wrapper with explicit retry behavior. The WinForms
/// clipboard helpers can block for seconds; this path keeps the timeout budget
/// under our control.
/// </summary>
internal sealed class ClipboardService
{
    private const uint CfUnicodeText = 13;
    private const uint GmemMoveable = 0x0002;
    private const int RetryCount = 20;
    private const int RetryDelayMs = 5;

    public string ReadText()
    {
        return WithOpenClipboard(() =>
        {
            if (!IsClipboardFormatAvailable(CfUnicodeText))
            {
                return string.Empty;
            }

            var handle = GetClipboardData(CfUnicodeText);
            if (handle == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetClipboardData failed.");
            }

            var pointer = GlobalLock(handle);
            if (pointer == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GlobalLock failed while reading the clipboard.");
            }

            try
            {
                return Marshal.PtrToStringUni(pointer) ?? string.Empty;
            }
            finally
            {
                GlobalUnlock(handle);
            }
        });
    }

    public void WriteText(string text)
    {
        WithOpenClipboard(() =>
        {
            if (!EmptyClipboard())
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "EmptyClipboard failed.");
            }

            if (string.IsNullOrEmpty(text))
            {
                return 0;
            }

            var bytes = Encoding.Unicode.GetBytes($"{text}\0");
            var memoryHandle = GlobalAlloc(GmemMoveable, (UIntPtr)bytes.Length);
            if (memoryHandle == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GlobalAlloc failed while writing the clipboard.");
            }

            var memoryPointer = GlobalLock(memoryHandle);
            if (memoryPointer == IntPtr.Zero)
            {
                GlobalFree(memoryHandle);
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GlobalLock failed while writing the clipboard.");
            }

            try
            {
                Marshal.Copy(bytes, 0, memoryPointer, bytes.Length);
            }
            finally
            {
                GlobalUnlock(memoryHandle);
            }

            if (SetClipboardData(CfUnicodeText, memoryHandle) == IntPtr.Zero)
            {
                var errorCode = Marshal.GetLastWin32Error();
                GlobalFree(memoryHandle);
                throw new Win32Exception(errorCode, "SetClipboardData failed.");
            }

            return 0;
        });
    }

    private static T WithOpenClipboard<T>(Func<T> operation)
    {
        for (var attempt = 0; attempt < RetryCount; attempt += 1)
        {
            if (OpenClipboard(IntPtr.Zero))
            {
                try
                {
                    return operation();
                }
                finally
                {
                    CloseClipboard();
                }
            }

            Thread.Sleep(RetryDelayMs);
        }

        throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenClipboard failed.");
    }

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool OpenClipboard(IntPtr newOwner);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseClipboard();

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EmptyClipboard();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetClipboardData(uint format);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetClipboardData(uint format, IntPtr memoryHandle);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsClipboardFormatAvailable(uint format);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalAlloc(uint flags, UIntPtr bytes);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalFree(IntPtr memoryHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalLock(IntPtr memoryHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalUnlock(IntPtr memoryHandle);
}
