$url = "http://localhost:3000/api/scan"
$target = "https://google.com"
$modes = @("security", "seo", "performance", "accessibility", "full")

$results = @{}
foreach ($mode in $modes) {
    Write-Host "`n=== Testing mode: $mode ===" -ForegroundColor Cyan
    try {
        $body = @{ url = $target; mode = $mode } | ConvertTo-Json
        $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 120
        $content = $response.Content
        $lines = $content -split "`n"
        $events = @()
        $current = @()
        foreach ($line in $lines) {
            if ($line.StartsWith("data: ")) {
                $current += $line.Substring(6)
            } elseif ($line -eq "" -and $current.Count -gt 0) {
                $json = $current -join "`n"
                $events += $json
                $current = @()
            }
        }
        $results[$mode] = $events
        Write-Host "Received $($events.Count) events" -ForegroundColor Green
        foreach ($evt in $events) {
            try {
                $obj = $evt | ConvertFrom-Json
                Write-Host "  type=$($obj.type) stage=$($obj.stage) progress=$($obj.progress) label=$($obj.label)" -ForegroundColor Yellow
                if ($obj.type -eq "log") {
                    Write-Host "    log: $($obj.message)" -ForegroundColor Gray
                }
                if ($obj.type -eq "error") {
                    Write-Host "    ERROR: $($obj.message)" -ForegroundColor Red
                }
                if ($obj.type -eq "result") {
                    Write-Host "    RESULT: score=$($obj.score) findings=$($obj.findings.Count) grade=$($obj.grade)" -ForegroundColor Magenta
                    Write-Host "    summary: $($obj.summary.Substring(0, [Math]::Min(200, $obj.summary.Length)))..." -ForegroundColor Magenta
                }
            } catch {
                Write-Host "  (non-JSON event)" -ForegroundColor DarkGray
            }
        }
    } catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            $reader.Close()
            Write-Host "Body: $body" -ForegroundColor Red
        }
        $results[$mode] = @("ERROR: $_")
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
foreach ($mode in $modes) {
    $count = $results[$mode].Count
    $hasResult = $false
    foreach ($evt in $results[$mode]) {
        if ($evt -match '"type":"result"') { $hasResult = $true; break }
    }
    $status = if ($hasResult) { "OK" } else { "NO RESULT" }
    Write-Host "$mode : $count events - $status"
}
