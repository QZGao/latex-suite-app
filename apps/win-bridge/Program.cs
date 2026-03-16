using System.Text.Json;
using win_bridge.Diagnostics;
using win_bridge.Rpc;

namespace win_bridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Runs the bridge JSON loop over stdin/stdout.
    /// </summary>
    [STAThread]
    private static int Main()
    {
        Console.InputEncoding = System.Text.Encoding.UTF8;
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        var logger = new BridgeLogger();
        var dispatcher = new BridgeDispatcher();

        logger.Info("Bridge loop started.");

        string? line;
        while ((line = Console.ReadLine()) is not null)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            try
            {
                var request = JsonSerializer.Deserialize<BridgeRequestEnvelope>(line, JsonOptions);
                if (request is null)
                {
                    continue;
                }

                var response = dispatcher.Dispatch(request);
                Console.WriteLine(JsonSerializer.Serialize(response, JsonOptions));
            }
            catch (Exception exception)
            {
                logger.Error("Unhandled bridge error", exception);
            }
        }

        logger.Info("Bridge loop stopped.");
        return 0;
    }
}
