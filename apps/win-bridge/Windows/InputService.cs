using System.ComponentModel;
using System.Runtime.InteropServices;

namespace win_bridge.Windows;

/// <summary>
/// Sends a narrow set of keyboard chords to the active window using
/// <c>SendInput</c>. This is more reliable for Electron-based hosts than
/// WinForms <c>SendKeys</c>.
/// </summary>
internal sealed class InputService
{
    private const int InputKeyboard = 1;
    private const uint KeyeventfExtendedKey = 0x0001;
    private const uint KeyeventfKeyup = 0x0002;

    private static readonly IReadOnlyDictionary<string, KeyDefinition> SpecialKeys =
        new Dictionary<string, KeyDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["Enter"] = new(0x0D),
            ["Escape"] = new(0x1B),
            ["Esc"] = new(0x1B),
            ["Tab"] = new(0x09),
            ["Space"] = new(0x20),
            ["Backspace"] = new(0x08),
            ["Delete"] = new(0x2E, KeyeventfExtendedKey),
            ["Insert"] = new(0x2D, KeyeventfExtendedKey),
            ["Home"] = new(0x24, KeyeventfExtendedKey),
            ["End"] = new(0x23, KeyeventfExtendedKey),
            ["Left"] = new(0x25, KeyeventfExtendedKey),
            ["Right"] = new(0x27, KeyeventfExtendedKey),
            ["Up"] = new(0x26, KeyeventfExtendedKey),
            ["Down"] = new(0x28, KeyeventfExtendedKey)
        };

    public void SendKeys(IReadOnlyList<string> keys, int keyDelayMs, int settleDelayMs)
    {
        if (keyDelayMs > 0)
        {
            Thread.Sleep(keyDelayMs);
        }

        foreach (var chord in keys)
        {
            SendChord(chord);

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

    private static void SendChord(string chord)
    {
        var parts = chord.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            throw new InvalidOperationException("Key chord must not be empty.");
        }

        var modifiers = parts[..^1].Select(ResolveModifier).ToArray();
        var mainKey = ResolveMainKey(parts[^1]);
        var inputs = new List<Input>(modifiers.Length * 2 + 2);

        foreach (var modifier in modifiers)
        {
            inputs.Add(CreateKeyboardInput(modifier.VirtualKey, modifier.Flags));
        }

        inputs.Add(CreateKeyboardInput(mainKey.VirtualKey, mainKey.Flags));
        inputs.Add(CreateKeyboardInput(mainKey.VirtualKey, mainKey.Flags | KeyeventfKeyup));

        for (var index = modifiers.Length - 1; index >= 0; index--)
        {
            var modifier = modifiers[index];
            inputs.Add(CreateKeyboardInput(modifier.VirtualKey, modifier.Flags | KeyeventfKeyup));
        }

        var sent = SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf<Input>());
        if (sent != inputs.Count)
        {
            var errorCode = Marshal.GetLastWin32Error();
            throw new Win32Exception(errorCode, $"SendInput failed for chord '{chord}' with Win32 error {errorCode}.");
        }
    }

    private static KeyDefinition ResolveModifier(string token)
    {
        return token.Trim().ToLowerInvariant() switch
        {
            "ctrl" or "control" => new KeyDefinition(0x11),
            "shift" => new KeyDefinition(0x10),
            "alt" or "menu" => new KeyDefinition(0x12),
            _ => throw new InvalidOperationException($"Unsupported modifier '{token}'.")
        };
    }

    private static KeyDefinition ResolveMainKey(string token)
    {
        if (SpecialKeys.TryGetValue(token, out var definition))
        {
            return definition;
        }

        if (token.Length == 1)
        {
            var character = char.ToUpperInvariant(token[0]);
            if (char.IsAsciiLetterOrDigit(character))
            {
                return new KeyDefinition(character);
            }
        }

        throw new InvalidOperationException($"Unsupported key token '{token}'.");
    }

    private static Input CreateKeyboardInput(ushort virtualKey, uint flags)
    {
        return new Input
        {
            Type = InputKeyboard,
            Anonymous = new InputUnion
            {
                Keyboard = new KeyboardInput
                {
                    VirtualKey = virtualKey,
                    ScanCode = 0,
                    Flags = flags,
                    Time = 0,
                    ExtraInfo = IntPtr.Zero
                }
            }
        };
    }

    private readonly record struct KeyDefinition(ushort VirtualKey, uint Flags = 0);

    [StructLayout(LayoutKind.Sequential)]
    private struct Input
    {
        public int Type;
        public InputUnion Anonymous;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct InputUnion
    {
        [FieldOffset(0)]
        public KeyboardInput Keyboard;

        [FieldOffset(0)]
        public MouseInput Mouse;

        [FieldOffset(0)]
        public HardwareInput Hardware;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KeyboardInput
    {
        public ushort VirtualKey;
        public ushort ScanCode;
        public uint Flags;
        public uint Time;
        public IntPtr ExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MouseInput
    {
        public int X;
        public int Y;
        public uint MouseData;
        public uint Flags;
        public uint Time;
        public IntPtr ExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct HardwareInput
    {
        public uint Message;
        public ushort ParameterLow;
        public ushort ParameterHigh;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint numberOfInputs, Input[] inputs, int sizeOfInputStructure);
}
