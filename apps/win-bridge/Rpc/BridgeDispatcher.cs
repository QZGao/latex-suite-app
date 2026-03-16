using System.Text.Json;
using win_bridge.Windows;

namespace win_bridge.Rpc;

/// <summary>
/// Handles the small bridge RPC surface. Keep this explicit and boring.
/// </summary>
internal sealed class BridgeDispatcher
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ClipboardService clipboardService = new();
    private readonly FocusService focusService = new();
    private readonly ForegroundWindowService foregroundWindowService = new();
    private readonly InputService inputService = new();

    public BridgeResponseEnvelope Dispatch(BridgeRequestEnvelope request)
    {
        try
        {
            return request.Method switch
            {
                "ping" => Ok(request.Id, new PingResult { BridgeVersion = "0.1.0" }),
                "getForegroundWindow" => Ok(request.Id, foregroundWindowService.GetForegroundWindow()),
                "restoreFocus" => HandleRestoreFocus(request),
                "readClipboardText" => Ok(request.Id, clipboardService.ReadText()),
                "writeClipboardText" => HandleWriteClipboardText(request),
                "sendKeys" => HandleSendKeys(request),
                _ => Error(request.Id, $"Unknown bridge method '{request.Method}'.")
            };
        }
        catch (Exception exception)
        {
            return Error(request.Id, exception.Message);
        }
    }

    private BridgeResponseEnvelope HandleRestoreFocus(BridgeRequestEnvelope request)
    {
        var parameters = DeserializeParams<RestoreFocusParams>(request);
        var restored = focusService.RestoreFocus(parameters.Hwnd);
        return Ok(request.Id, new RestoreFocusResult { Restored = restored });
    }

    private BridgeResponseEnvelope HandleWriteClipboardText(BridgeRequestEnvelope request)
    {
        var parameters = DeserializeParams<WriteClipboardTextParams>(request);
        clipboardService.WriteText(parameters.Text);
        return Ok(request.Id, new { });
    }

    private BridgeResponseEnvelope HandleSendKeys(BridgeRequestEnvelope request)
    {
        var parameters = DeserializeParams<SendKeysParams>(request);
        inputService.SendKeys(
            parameters.Keys,
            parameters.KeyDelayMs.GetValueOrDefault(20),
            parameters.SettleDelayMs.GetValueOrDefault(40));

        return Ok(request.Id, new SendKeysResult { Sent = parameters.Keys });
    }

    private static T DeserializeParams<T>(BridgeRequestEnvelope request)
    {
        if (request.Params is not JsonElement element)
        {
            throw new InvalidOperationException("Missing params payload.");
        }

        var parameters = JsonSerializer.Deserialize<T>(element.GetRawText(), JsonOptions);
        return parameters ?? throw new InvalidOperationException("Invalid params payload.");
    }

    private static BridgeResponseEnvelope Ok(string id, object? result)
    {
        return new BridgeResponseEnvelope
        {
            Id = id,
            Ok = true,
            Result = result
        };
    }

    private static BridgeResponseEnvelope Error(string id, string error)
    {
        return new BridgeResponseEnvelope
        {
            Id = id,
            Ok = false,
            Error = error
        };
    }
}
