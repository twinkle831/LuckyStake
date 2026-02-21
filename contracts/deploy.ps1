# LuckyStake Pool Contract Deployment Script (PowerShell)
# Run this from the contracts directory

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretKey,
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$AdminAddress = "",
    
    [Parameter(Mandatory=$false)]
    [string]$TokenAddress = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    
    [Parameter(Mandatory=$false)]
    [switch]$UpgradeOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$WeeklyContract = "CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD",
    
    [Parameter(Mandatory=$false)]
    [string]$BiweeklyContract = "CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3",
    
    [Parameter(Mandatory=$false)]
    [string]$MonthlyContract = "CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN"
)

$ErrorActionPreference = "Stop"

Write-Host "=== LuckyStake Pool Contract Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "Step 1: Building contract..." -ForegroundColor Yellow
cargo build --target wasm32-unknown-unknown --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy/Upgrade
Write-Host "Step 2: Deploying WASM..." -ForegroundColor Yellow
$wasmPath = "target\wasm32-unknown-unknown\release\lucky_stake_pool.wasm"

if ($UpgradeOnly) {
    Write-Host "Upgrading existing contracts..." -ForegroundColor Yellow
    
    Write-Host "  - Weekly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey --upgrade-wasm $WeeklyContract
    
    Write-Host "  - Biweekly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey --upgrade-wasm $BiweeklyContract
    
    Write-Host "  - Monthly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey --upgrade-wasm $MonthlyContract
} else {
    Write-Host "Deploying new contracts..." -ForegroundColor Yellow
    Write-Host "  (Save the contract IDs from output)" -ForegroundColor Gray
    
    Write-Host "  - Weekly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey
    
    Write-Host "  - Biweekly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey
    
    Write-Host "  - Monthly pool..." -ForegroundColor Gray
    stellar contract deploy --wasm $wasmPath --network $Network --source-account $SecretKey
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Initialize (only if new deployment)
if (-not $UpgradeOnly -and $AdminAddress) {
    Write-Host "Step 3: Initializing pools..." -ForegroundColor Yellow
    
    Write-Host "  - Weekly pool (7 days)..." -ForegroundColor Gray
    stellar contract invoke --id $WeeklyContract --network $Network --source-account $SecretKey initialize --admin $AdminAddress --token $TokenAddress --period_days 7
    
    Write-Host "  - Biweekly pool (15 days)..." -ForegroundColor Gray
    stellar contract invoke --id $BiweeklyContract --network $Network --source-account $SecretKey initialize --admin $AdminAddress --token $TokenAddress --period_days 15
    
    Write-Host "  - Monthly pool (30 days)..." -ForegroundColor Gray
    stellar contract invoke --id $MonthlyContract --network $Network --source-account $SecretKey initialize --admin $AdminAddress --token $TokenAddress --period_days 30
    
    Write-Host "Initialization complete!" -ForegroundColor Green
    Write-Host ""
}

# Step 4: Set Blend Pool (optional)
$blendPool = "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF"
Write-Host "Step 4: Setting Blend pool address..." -ForegroundColor Yellow
Write-Host "  Blend Pool: $blendPool" -ForegroundColor Gray
Write-Host ""
Write-Host "To set Blend pool, run manually:" -ForegroundColor Yellow
Write-Host "  stellar contract invoke --id $WeeklyContract --network $Network --source-account <SECRET> set_blend_pool --blend_pool $blendPool" -ForegroundColor Gray
Write-Host "  (Repeat for biweekly and monthly pools)" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Set Blend pool: set_blend_pool --blend_pool $blendPool" -ForegroundColor White
Write-Host "2. Supply funds: supply_to_blend --amount <AMOUNT_IN_STROOPS>" -ForegroundColor White
Write-Host "3. Verify: get_supplied_to_blend" -ForegroundColor White
