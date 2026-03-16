using System.Text.Json.Serialization;

namespace win_bridge.Rpc;

internal sealed class BridgeRequestEnvelope
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("method")]
    public required string Method { get; init; }

    [JsonPropertyName("params")]
    public object? Params { get; init; }
}

internal sealed class BridgeResponseEnvelope
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonPropertyName("result")]
    public object? Result { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
}

internal sealed class PingResult
{
    [JsonPropertyName("bridgeVersion")]
    public required string BridgeVersion { get; init; }
}

internal sealed class RestoreFocusParams
{
    [JsonPropertyName("hwnd")]
    public required string Hwnd { get; init; }
}

internal sealed class RestoreFocusResult
{
    [JsonPropertyName("restored")]
    public required bool Restored { get; init; }
}

internal sealed class SendKeysParams
{
    [JsonPropertyName("keys")]
    public required string[] Keys { get; init; }

    [JsonPropertyName("keyDelayMs")]
    public int? KeyDelayMs { get; init; }

    [JsonPropertyName("settleDelayMs")]
    public int? SettleDelayMs { get; init; }
}

internal sealed class SendKeysResult
{
    [JsonPropertyName("sent")]
    public required string[] Sent { get; init; }
}

internal sealed class WriteClipboardTextParams
{
    [JsonPropertyName("text")]
    public required string Text { get; init; }
}

internal sealed class HostBounds
{
    [JsonPropertyName("x")]
    public required int X { get; init; }

    [JsonPropertyName("y")]
    public required int Y { get; init; }

    [JsonPropertyName("width")]
    public required int Width { get; init; }

    [JsonPropertyName("height")]
    public required int Height { get; init; }
}

internal sealed class HostContextResult
{
    [JsonPropertyName("hwnd")]
    public required string Hwnd { get; init; }

    [JsonPropertyName("processName")]
    public required string ProcessName { get; init; }

    [JsonPropertyName("windowTitle")]
    public required string WindowTitle { get; init; }

    [JsonPropertyName("bounds")]
    public required HostBounds Bounds { get; init; }
}
