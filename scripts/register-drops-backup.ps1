param(
  [string]$StateDirectory = 'C:\dev\.microscape-live-backup',
  [switch]$Replace
)

$ErrorActionPreference = 'Stop'
$taskName = 'Microscape Wiki Live Drops Backup'
if (!$Replace -and (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
  throw "The $taskName task already exists. Pass -Replace to update it."
}

$state = [IO.Path]::GetFullPath($StateDirectory)
New-Item -ItemType Directory -Path $state -Force | Out-Null
$publisher = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'backup-refresh-drops.mjs')).ProviderPath
$fallback = (Get-Command node.exe -ErrorAction Stop).Source
$powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$start = (Get-Date).AddSeconds(25).ToString("yyyy-MM-dd'T'HH:mm:ss")

# Launch Node from a hidden Windows PowerShell command so no PowerShell script
# policy settings are needed when the task runs.
$launch = @'
$ErrorActionPreference = 'Stop'
$state = '__STATE_DIRECTORY__'
try {
  $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (!$node -and (Test-Path -LiteralPath '__FALLBACK_NODE__' -PathType Leaf)) {
    $node = '__FALLBACK_NODE__'
  }
  if (!$node) {
    $runtime = Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime*' -ErrorAction SilentlyContinue |
      Sort-Object Version -Descending | Select-Object -First 1
    if ($runtime) {
      $candidate = Join-Path $runtime.InstallLocation 'dependencies\node\bin\node.exe'
      if (Test-Path -LiteralPath $candidate -PathType Leaf) { $node = $candidate }
    }
  }
  if (!$node) { throw 'Node.js was not found.' }
  & $node '__PUBLISHER_PATH__' $state
  exit $LASTEXITCODE
} catch {
  $message = '{0:o} {1}' -f [DateTimeOffset]::UtcNow, $_.Exception.Message
  Set-Content -LiteralPath (Join-Path $state 'last-run.log') -Value $message
  exit 1
}
'@
$launch = $launch.Replace('__STATE_DIRECTORY__', $state.Replace("'", "''"))
$launch = $launch.Replace('__FALLBACK_NODE__', $fallback.Replace("'", "''"))
$launch = $launch.Replace('__PUBLISHER_PATH__', $publisher.Replace("'", "''"))
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($launch))
$command = [Security.SecurityElement]::Escape($powerShell)

$definition = @"
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Publish a fresh public Microscape drops snapshot when GitHub's feed is behind.</Description></RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <Repetition><Interval>PT15M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition>
      <StartBoundary>$start</StartBoundary><Enabled>true</Enabled>
    </TimeTrigger>
    <LogonTrigger><Enabled>true</Enabled><UserId>$userSid</UserId></LogonTrigger>
  </Triggers>
  <Principals><Principal id="Author"><UserId>$userSid</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT3M</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$command</Command>
      <Arguments>-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand $encoded</Arguments>
    </Exec>
  </Actions>
</Task>
"@
$task = Register-ScheduledTask -TaskName $taskName -Xml $definition -Force:$Replace
$info = $task | Get-ScheduledTaskInfo
"Registered $taskName. First scheduled attempt: $($info.NextRunTime.ToString('o'))."
