using System.Windows.Forms;

namespace win_bridge.Windows;

/// <summary>
/// Small clipboard wrapper that keeps clipboard access isolated from RPC logic.
/// </summary>
internal sealed class ClipboardService
{
    public string ReadText()
    {
        return Clipboard.ContainsText() ? Clipboard.GetText() : string.Empty;
    }

    public void WriteText(string text)
    {
        Clipboard.SetText(text ?? string.Empty);
    }
}
