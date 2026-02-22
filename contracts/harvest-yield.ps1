# Harvest Yield from Blend into Prize Fund (PowerShell)
# Query Blend get_positions(pool_contract) off-chain first; yield = actual_balance - get_supplied_to_blend
# Example: .\harvest-yield.ps1 -SecretKey "S..." -ContractId "C..." -Amount 500000000 -MinReturn 500000000

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ContractId,
    
    [Parameter(Mandatory=$true)]
    [string]$Amount,  # Yield amount in stroops
    
    [Parameter(Mandatory=$false)]
    [string]$MinReturn,  # Defaults to Amount; use lower to allow rounding
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet"
)

if (-not $MinReturn) { $MinReturn = $Amount }

$ErrorActionPreference = "Stop"

Write-Host "=== Harvesting Yield from Blend ===" -ForegroundColor Cyan
Write-Host "Contract: $ContractId" -ForegroundColor Yellow
Write-Host "Amount: $Amount stroops | min_return: $MinReturn" -ForegroundColor Yellow
Write-Host ""

stellar contract invoke --id $ContractId --network $Network --source-account $SecretKey harvest_yield --amount $Amount --min_return $MinReturn

Write-Host ""
Write-Host "=== Harvest Complete ===" -ForegroundColor Green
