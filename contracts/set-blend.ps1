# Set Blend Pool Address for All Pools (PowerShell)
# Run after deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretKey,
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$BlendPool = "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
    
    [Parameter(Mandatory=$false)]
    [string]$WeeklyContract = "CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD",
    
    [Parameter(Mandatory=$false)]
    [string]$BiweeklyContract = "CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3",
    
    [Parameter(Mandatory=$false)]
    [string]$MonthlyContract = "CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Setting Blend Pool Address ===" -ForegroundColor Cyan
Write-Host "Blend Pool: $BlendPool" -ForegroundColor Yellow
Write-Host ""

Write-Host "Setting for Weekly pool..." -ForegroundColor Yellow
stellar contract invoke --id $WeeklyContract --network $Network --source-account $SecretKey set_blend_pool --blend_pool $BlendPool

Write-Host "Setting for Biweekly pool..." -ForegroundColor Yellow
stellar contract invoke --id $BiweeklyContract --network $Network --source-account $SecretKey set_blend_pool --blend_pool $BlendPool

Write-Host "Setting for Monthly pool..." -ForegroundColor Yellow
stellar contract invoke --id $MonthlyContract --network $Network --source-account $SecretKey set_blend_pool --blend_pool $BlendPool

Write-Host ""
Write-Host "=== Blend Pool Set for All Pools ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now call supply_to_blend() on each pool." -ForegroundColor Yellow
