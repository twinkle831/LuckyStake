# Supply Pool Funds to Blend (PowerShell)
# Example: .\supply-to-blend.ps1 -SecretKey "S..." -Amount 1000000000

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ContractId,
    
    [Parameter(Mandatory=$true)]
    [string]$Amount,  # Amount in stroops (7 decimals for XLM)
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Supplying to Blend ===" -ForegroundColor Cyan
Write-Host "Contract: $ContractId" -ForegroundColor Yellow
Write-Host "Amount: $Amount stroops ($([math]::Round([decimal]$Amount / 10000000, 2)) XLM)" -ForegroundColor Yellow
Write-Host ""

stellar contract invoke --id $ContractId --network $Network --source-account $SecretKey supply_to_blend --amount $Amount

Write-Host ""
Write-Host "=== Supply Complete ===" -ForegroundColor Green
Write-Host "Check with: stellar contract invoke --id $ContractId --network $Network get_supplied_to_blend" -ForegroundColor Yellow
