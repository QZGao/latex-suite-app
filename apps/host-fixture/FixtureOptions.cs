namespace host_fixture;

/// <summary>
/// Parsed CLI options for the host fixture.
/// </summary>
internal sealed class FixtureOptions
{
    public string Scenario { get; init; } = "manual";
    public string InitialText { get; init; } = string.Empty;
    public int SelectionStart { get; init; }
    public int SelectionLength { get; init; }
    public string? ExpectedText { get; init; }
    public int? ExpectedEnterCount { get; init; }
    public int? ExpectedEscapeCount { get; init; }
    public int? ExpectedDeactivateCount { get; init; }
    public int TimeoutMs { get; init; } = 5000;
    public bool ExitOnMatch { get; init; }
    public bool CloseOnEnter { get; init; }
    public bool PrintReadyJson { get; init; }

    public static FixtureOptions Parse(string[] args)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < args.Length; index++)
        {
            var key = args[index];
            if (!key.StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            if (index + 1 < args.Length && !args[index + 1].StartsWith("--", StringComparison.Ordinal))
            {
                values[key] = args[index + 1];
                index++;
            }
            else
            {
                values[key] = "true";
            }
        }

        return new FixtureOptions
        {
            Scenario = values.GetValueOrDefault("--scenario", "manual"),
            InitialText = values.GetValueOrDefault("--text", string.Empty),
            SelectionStart = ParseInt(values.GetValueOrDefault("--selection-start")),
            SelectionLength = ParseInt(values.GetValueOrDefault("--selection-length")),
            ExpectedText = values.GetValueOrDefault("--expect-text"),
            ExpectedEnterCount = ParseOptionalInt(values.GetValueOrDefault("--expect-enter-count")),
            ExpectedEscapeCount = ParseOptionalInt(values.GetValueOrDefault("--expect-escape-count")),
            ExpectedDeactivateCount = ParseOptionalInt(values.GetValueOrDefault("--expect-deactivate-count")),
            TimeoutMs = Math.Max(1, ParseInt(values.GetValueOrDefault("--timeout-ms"), 5000)),
            ExitOnMatch = values.ContainsKey("--exit-on-match"),
            CloseOnEnter = values.ContainsKey("--close-on-enter"),
            PrintReadyJson = values.ContainsKey("--print-ready-json")
        };
    }

    private static int ParseInt(string? raw, int fallback = 0)
    {
        return int.TryParse(raw, out var parsed) ? parsed : fallback;
    }

    private static int? ParseOptionalInt(string? raw)
    {
        return int.TryParse(raw, out var parsed) ? parsed : null;
    }
}
