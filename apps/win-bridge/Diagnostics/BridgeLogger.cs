namespace win_bridge.Diagnostics;

/// <summary>
/// Writes bridge diagnostics to stderr so stdout remains reserved for JSON.
/// </summary>
internal sealed class BridgeLogger
{
    public void Info(string message)
    {
        Console.Error.WriteLine($"[bridge] {message}");
    }

    public void Error(string message, Exception exception)
    {
        Console.Error.WriteLine($"[bridge] {message}: {exception}");
    }
}
