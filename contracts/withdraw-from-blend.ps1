# Withdraw from Blend back to Pool (PowerShell)
# Example: .\withdraw-from-blend.ps1 -SecretKey "S..." -ContractId "C..." -Amount 1000000000 -MinReturn 990000000

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ContractId,
    
    [Parameter(Mandatory=$true)]
    [string]$Amount,  # Amount in stroops to withdraw
    
    [Parameter(Mandatory=$false)]
    [string]$MinReturn,  # Minimum received (defaults to Amount); use lower to allow rounding
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet"
)

if (-not $MinReturn) { $MinReturn = $Amount }

$ErrorActionPreference = "Stop"

Write-Host "=== Withdrawing from Blend ===" -ForegroundColor Cyan
Write-Host "Contract: $ContractId" -ForegroundColor Yellow
Write-Host "Amount: $Amount stroops | min_return: $MinReturn" -ForegroundColor Yellow
Write-Host "Note: May fail if Blend has low liquidity; retry later." -ForegroundColor Yellow
Write-Host ""

stellar contract invoke --id $ContractId --network $Network --source-account $SecretKey withdraw_from_blend --amount $Amount --min_return $MinReturn

Write-Host ""
Write-Host "=== Withdraw Complete ===" -ForegroundColor Green
