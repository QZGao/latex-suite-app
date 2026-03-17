using System.Runtime.InteropServices;
using win_bridge.Rpc;

namespace win_bridge.Windows;

/// <summary>
/// Polls the current keyboard state so automation can wait for trigger
/// modifiers to be released before it sends host key chords.
/// </summary>
internal sealed class KeyboardStateService
{
    public WaitForKeysReleasedResult WaitForKeysReleased(
        IReadOnlyList<string> keys,
        int timeoutMs,
        int pollIntervalMs)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(Math.Max(timeoutMs, 0));
        var normalizedKeys = keys
            .Select(NormalizeKeyToken)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        while (true)
        {
            var remainingKeys = normalizedKeys.Where(IsPressed).ToArray();
            if (remainingKeys.Length == 0)
            {
                return new WaitForKeysReleasedResult
                {
                    Released = true,
                    RemainingKeys = []
                };
            }

            if (DateTime.UtcNow >= deadline)
            {
                return new WaitForKeysReleasedResult
                {
                    Released = false,
                    RemainingKeys = remainingKeys
                };
            }

            Thread.Sleep(Math.Max(pollIntervalMs, 1));
        }
    }

    private static string NormalizeKeyToken(string key)
    {
        return key.Trim().ToLowerInvariant() switch
        {
            "alt" or "menu" => "Alt",
            "ctrl" or "control" => "Ctrl",
            "shift" => "Shift",
            _ => throw new InvalidOperationException($"Unsupported key token '{key}'.")
        };
    }

    private static bool IsPressed(string key)
    {
        var virtualKey = key switch
        {
            "Alt" => 0x12,
            "Ctrl" => 0x11,
            "Shift" => 0x10,
            _ => throw new InvalidOperationException($"Unsupported key token '{key}'.")
        };

        return (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
    }

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int virtualKey);
}
