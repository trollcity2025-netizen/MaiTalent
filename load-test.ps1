# MaiTalent Load Test Script
# This script simulates multiple users accessing the site concurrently

param(
    [int]$NumUsers = 10,
    [int]$RequestsPerUser = 5,
    [string]$Url = "http://localhost:5180"
)

$results = @()
$successful = 0
$failed = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MaiTalent Load Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Users: $NumUsers" -ForegroundColor Yellow
Write-Host "Requests per user: $RequestsPerUser" -ForegroundColor Yellow
Write-Host "Target URL: $Url" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$startTime = Get-Date

# Function to make a request
function Test-Url {
    param([string]$url)
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
        return @{
            Status = $response.StatusCode
            Success = $true
            Time = (Get-Date)
        }
    }
    catch {
        return @{
            Status = $_.Exception.Response.StatusCode
            Success = $false
            Time = (Get-Date)
            Error = $_.Exception.Message
        }
    }
}

# Test different endpoints
$endpoints = @(
    "/",
    "/home",
    "/calendar"
)

Write-Host "`nStarting load test..." -ForegroundColor Green

# Run concurrent requests
$jobs = @()

for ($user = 1; $user -le $NumUsers; $user++) {
    $job = Start-Job -ScriptBlock {
        param($userId, $numRequests, $targetUrl, $endpoints)
        
        $results = @()
        
        for ($i = 1; $i -le $numRequests; $i++) {
            $endpoint = $endpoints[$i % $endpoints.Count]
            $url = "$targetUrl$endpoint"
            
            try {
                $start = Get-Date
                $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
                $end = Get-Date
                $duration = ($end - $start).TotalMilliseconds
                
                $results += @{
                    User = $userId
                    Request = $i
                    Endpoint = $endpoint
                    Status = $response.StatusCode
                    Success = $true
                    Duration = $duration
                    Time = $end
                }
            }
            catch {
                $results += @{
                    User = $userId
                    Request = $i
                    Endpoint = $endpoint
                    Status = 0
                    Success = $false
                    Error = $_.Exception.Message
                    Time = Get-Date
                }
            }
            
            # Small delay between requests
            Start-Sleep -Milliseconds 100
        }
        
        return $results
    } -ArgumentList $user, $RequestsPerUser, $Url, $endpoints
    
    $jobs += $job
    
    # Stagger the starts slightly
    Start-Sleep -Milliseconds 50
}

Write-Host "Running $NumUsers concurrent users..." -ForegroundColor Yellow

# Wait for all jobs to complete
$allResults = @()
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job -Wait
    $allResults += $result
}

Remove-Job -Job $jobs -Force

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

# Analyze results
$successfulRequests = $allResults | Where-Object { $_.Success -eq $true }
$failedRequests = $allResults | Where-Object { $_.Success -eq $false }
$totalRequests = $allResults.Count
$successRate = if ($totalRequests -gt 0) { ($successfulRequests.Count / $totalRequests) * 100 } else { 0 }

# Calculate average response time
$avgResponseTime = if ($successfulRequests.Count -gt 0) { 
    ($successfulRequests | Measure-Object -Property Duration -Average).Average 
} else { 0 }

# Requests per second
$requestsPerSecond = if ($totalDuration -gt 0) { $totalRequests / $totalDuration } else { 0 }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "LOAD TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Requests: $totalRequests" -ForegroundColor White
Write-Host "Successful: $($successfulRequests.Count)" -ForegroundColor Green
Write-Host "Failed: $($failedRequests.Count)" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round($successRate, 2))%" -ForegroundColor $(if ($successRate -gt 95) { "Green" } elseif ($successRate -gt 80) { "Yellow" } else { "Red" })
Write-Host "Average Response Time: $([math]::Round($avgResponseTime, 2))ms" -ForegroundColor White
Write-Host "Requests Per Second: $([math]::Round($requestsPerSecond, 2))" -ForegroundColor White
Write-Host "Total Duration: $([math]::Round($totalDuration, 2))s" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

# Show status code breakdown
if ($successfulRequests.Count -gt 0) {
    $statusGroups = $successfulRequests | Group-Object -Property Status
    Write-Host "`nStatus Code Breakdown:" -ForegroundColor Yellow
    foreach ($group in $statusGroups) {
        Write-Host "  $($group.Name): $($group.Count) requests" -ForegroundColor White
    }
}

# Show failed requests
if ($failedRequests.Count -gt 0) {
    Write-Host "`nFailed Requests:" -ForegroundColor Red
    $failedRequests | Select-Object -First 5 | ForEach-Object {
        Write-Host "  User $($_.User) - $($_.Endpoint): $($_.Error)" -ForegroundColor Red
    }
}

# Performance assessment
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PERFORMANCE ASSESSMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($successRate -ge 99 -and $avgResponseTime -lt 500) {
    Write-Host "EXCELLENT - Site can handle $NumUsers users easily!" -ForegroundColor Green
} elseif ($successRate -ge 95 -and $avgResponseTime -lt 1000) {
    Write-Host "GOOD - Site performs well under $NumUsers users" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "MODERATE - Some performance issues detected" -ForegroundColor Yellow
} else {
    Write-Host "POOR - Significant performance issues" -ForegroundColor Red
}

Write-Host "`nNote: This test simulates basic page loads." -ForegroundColor Gray
Write-Host "Real-world usage with database queries, auth, etc. may show different results." -ForegroundColor Gray
