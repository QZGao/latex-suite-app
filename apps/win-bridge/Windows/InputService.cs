using System.Windows.Forms;

namespace win_bridge.Windows;

/// <summary>
/// Sends a narrow set of keyboard chords to the active window.
/// </summary>
internal sealed class InputService
{
    private static readonly IReadOnlyDictionary<string, string> SpecialKeys =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Enter"] = "{ENTER}",
            ["Escape"] = "{ESC}",
            ["Esc"] = "{ESC}",
            ["Tab"] = "{TAB}",
            ["Space"] = " ",
            ["Backspace"] = "{BACKSPACE}",
            ["Delete"] = "{DELETE}",
            ["Insert"] = "{INSERT}",
            ["Home"] = "{HOME}",
            ["End"] = "{END}",
            ["Left"] = "{LEFT}",
            ["Right"] = "{RIGHT}",
            ["Up"] = "{UP}",
            ["Down"] = "{DOWN}"
        };

    public void SendKeys(IReadOnlyList<string> keys, int keyDelayMs, int settleDelayMs)
    {
        if (keyDelayMs > 0)
        {
            Thread.Sleep(keyDelayMs);
        }

        foreach (var chord in keys)
        {
            SendKeysInternal.SendWait(TranslateChord(chord));

            if (keyDelayMs > 0)
            {
                Thread.Sleep(keyDelayMs);
            }
        }

        if (settleDelayMs > 0)
        {
            Thread.Sleep(settleDelayMs);
        }
    }

    private static string TranslateChord(string chord)
    {
        var parts = chord.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            throw new InvalidOperationException("Key chord must not be empty.");
        }

        var modifiers = string.Empty;
        foreach (var part in parts[..^1])
        {
            modifiers += part.ToLowerInvariant() switch
            {
                "ctrl" or "control" => "^",
                "shift" => "+",
                "alt" => "%",
                _ => throw new InvalidOperationException($"Unsupported modifier '{part}'.")
            };
        }

        return $"{modifiers}{TranslateMainKey(parts[^1])}";
    }

    private static string TranslateMainKey(string token)
    {
        if (SpecialKeys.TryGetValue(token, out var translated))
        {
            return translated;
        }

        if (token.Length == 1)
        {
            return token;
        }

        throw new InvalidOperationException($"Unsupported key token '{token}'.");
    }

    private static class SendKeysInternal
    {
        public static void SendWait(string keys)
        {
            System.Windows.Forms.SendKeys.SendWait(keys);
        }
    }
}
