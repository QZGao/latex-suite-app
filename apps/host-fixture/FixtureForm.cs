using System.Diagnostics;
using System.Text.Json;

namespace host_fixture;

/// <summary>
/// Minimal window used for deterministic host automation tests.
/// </summary>
internal sealed class FixtureForm : Form
{
    private readonly FixtureOptions options;
    private readonly Stopwatch stopwatch = Stopwatch.StartNew();
    private readonly Label statusLabel;
    private readonly TextBox editorTextBox;
    private readonly System.Windows.Forms.Timer timeoutTimer;

    private bool completed;
    private bool isReady;
    private int deactivateCount;
    private int enterCount;
    private int escapeCount;

    public FixtureForm(FixtureOptions options)
    {
        this.options = options;

        Text = $"Latex Suite Fixture - {options.Scenario}";
        Width = 640;
        Height = 360;
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;

        statusLabel = new Label
        {
            Dock = DockStyle.Top,
            Height = 26,
            Text = $"Scenario: {options.Scenario}"
        };

        editorTextBox = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            AcceptsReturn = true,
            AcceptsTab = true,
            Font = new Font("Consolas", 11),
            Text = options.InitialText
        };

        timeoutTimer = new System.Windows.Forms.Timer
        {
            Interval = options.TimeoutMs
        };

        Controls.Add(editorTextBox);
        Controls.Add(statusLabel);

        Shown += HandleShown;
        Activated += HandleActivated;
        Deactivate += HandleDeactivate;
        editorTextBox.TextChanged += HandleStateChanged;
        editorTextBox.KeyDown += HandleEditorKeyDown;
        timeoutTimer.Tick += HandleTimeout;
    }

    private void HandleShown(object? sender, EventArgs args)
    {
        ApplySelection();
    }

    private void HandleActivated(object? sender, EventArgs args)
    {
        editorTextBox.Focus();
        ApplySelection();

        if (!isReady)
        {
            isReady = true;

            if (options.PrintReadyJson)
            {
                Console.WriteLine(JsonSerializer.Serialize(CreateSnapshot("ready")));
            }

            if (options.ExitOnMatch || options.TimeoutMs > 0)
            {
                timeoutTimer.Start();
            }

            EvaluateCompletion();
        }
    }

    private void HandleEditorKeyDown(object? sender, KeyEventArgs args)
    {
        RecordSpecialKey(args.KeyCode);
        EvaluateCompletion();
    }

    private void HandleDeactivate(object? sender, EventArgs args)
    {
        deactivateCount++;
        EvaluateCompletion();
    }

    private void HandleStateChanged(object? sender, EventArgs args)
    {
        EvaluateCompletion();
    }

    private void HandleTimeout(object? sender, EventArgs args)
    {
        if (completed)
        {
            return;
        }

        var error = ValidateExpectations() ?? $"Timed out after {options.TimeoutMs} ms.";
        Complete(1, "failed", error);
    }

    private void EvaluateCompletion()
    {
        if (completed || !options.ExitOnMatch)
        {
            return;
        }

        var error = ValidateExpectations();
        if (error is null)
        {
            Complete(0, "passed", null);
        }
    }

    private string? ValidateExpectations()
    {
        if (options.ExpectedText is not null && editorTextBox.Text != options.ExpectedText)
        {
            return $"Expected text '{options.ExpectedText}' but found '{editorTextBox.Text}'.";
        }

        if (options.ExpectedEnterCount is not null && enterCount < options.ExpectedEnterCount.Value)
        {
            return $"Expected at least {options.ExpectedEnterCount.Value} Enter key presses but found {enterCount}.";
        }

        if (options.ExpectedEscapeCount is not null && escapeCount < options.ExpectedEscapeCount.Value)
        {
            return $"Expected at least {options.ExpectedEscapeCount.Value} Escape key presses but found {escapeCount}.";
        }

        if (options.ExpectedDeactivateCount is not null && deactivateCount < options.ExpectedDeactivateCount.Value)
        {
            return $"Expected at least {options.ExpectedDeactivateCount.Value} deactivations but found {deactivateCount}.";
        }

        return null;
    }

    private void Complete(int exitCode, string status, string? error)
    {
        if (completed)
        {
            return;
        }

        completed = true;
        timeoutTimer.Stop();
        Console.WriteLine(JsonSerializer.Serialize(CreateSnapshot(status, error)));
        Environment.ExitCode = exitCode;
        Close();
    }

    private void ApplySelection()
    {
        var start = Math.Clamp(options.SelectionStart, 0, editorTextBox.TextLength);
        var length = Math.Clamp(options.SelectionLength, 0, editorTextBox.TextLength - start);
        editorTextBox.SelectionStart = start;
        editorTextBox.SelectionLength = length;
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        switch (keyData)
        {
            case Keys.Control | Keys.A:
                editorTextBox.Focus();
                editorTextBox.SelectAll();
                EvaluateCompletion();
                return true;
            case Keys.Control | Keys.C:
                editorTextBox.Focus();
                var selectedText = editorTextBox.SelectedText;
                if (!string.IsNullOrEmpty(selectedText))
                {
                    Clipboard.SetText(selectedText);
                }

                EvaluateCompletion();
                return true;
            case Keys.Control | Keys.V:
                editorTextBox.Focus();
                var clipboardText = Clipboard.ContainsText() ? Clipboard.GetText() : string.Empty;
                var selectionStart = editorTextBox.SelectionStart;
                var selectionLength = editorTextBox.SelectionLength;

                if (options.Scenario.Equals("selection_replace", StringComparison.OrdinalIgnoreCase) &&
                    selectionLength == 0)
                {
                    selectionStart = Math.Clamp(options.SelectionStart, 0, editorTextBox.TextLength);
                    selectionLength = Math.Clamp(options.SelectionLength, 0, editorTextBox.TextLength - selectionStart);
                }

                var prefix = editorTextBox.Text[..selectionStart];
                var suffix = editorTextBox.Text[(selectionStart + selectionLength)..];
                editorTextBox.Text = prefix + clipboardText + suffix;
                editorTextBox.SelectionStart = prefix.Length + clipboardText.Length;
                editorTextBox.SelectionLength = 0;
                EvaluateCompletion();
                return true;
            case Keys.Enter:
                RecordSpecialKey(Keys.Enter);
                if (options.CloseOnEnter)
                {
                    var error = ValidateExpectations();
                    Complete(error is null ? 0 : 1, error is null ? "passed" : "failed", error);
                }
                else
                {
                    EvaluateCompletion();
                }

                return true;
            case Keys.Escape:
                RecordSpecialKey(Keys.Escape);
                EvaluateCompletion();
                return true;
            default:
                return base.ProcessCmdKey(ref msg, keyData);
        }
    }

    private void RecordSpecialKey(Keys keyCode)
    {
        if (keyCode == Keys.Enter)
        {
            enterCount++;
        }
        else if (keyCode == Keys.Escape)
        {
            escapeCount++;
        }
    }

    private object CreateSnapshot(string status, string? error = null)
    {
        return new
        {
            scenario = options.Scenario,
            status,
            error,
            elapsedMs = stopwatch.ElapsedMilliseconds,
            handle = $"0x{Handle.ToInt64():X}",
            title = Text,
            text = editorTextBox.Text,
            textLength = editorTextBox.TextLength,
            selectionStart = editorTextBox.SelectionStart,
            selectionLength = editorTextBox.SelectionLength,
            enterCount,
            escapeCount,
            deactivateCount
        };
    }
}
