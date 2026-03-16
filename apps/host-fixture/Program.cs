namespace host_fixture;

internal static class Program
{
    /// <summary>
    /// Main entry point for the CLI-controllable host fixture.
    /// </summary>
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        var options = FixtureOptions.Parse(args);
        Application.Run(new FixtureForm(options));
    }
}
