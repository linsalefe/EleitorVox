# ==============================================
# VoxCandidata - Script de Rebranding (PowerShell)
# Execute na raiz do projeto: .\rebrand.ps1
# ==============================================

Write-Host "Iniciando rebranding para VoxCandidata..." -ForegroundColor Cyan

$extensions = @("*.md","*.py","*.ts","*.tsx","*.js","*.jsx","*.json","*.css","*.html","*.yaml","*.yml")
$excludeDirs = @("node_modules",".next","venv","__pycache__")

function Replace-All {
    param([string]$old, [string]$new)
    
    foreach ($ext in $extensions) {
        Get-ChildItem -Recurse -Filter $ext -File | Where-Object {
            $path = $_.FullName
            $skip = $false
            foreach ($dir in $excludeDirs) {
                if ($path -match [regex]::Escape($dir)) { $skip = $true; break }
            }
            -not $skip
        } | ForEach-Object {
            $content = Get-Content $_.FullName -Raw -Encoding UTF8
            if ($content -and $content.Contains($old)) {
                $content = $content.Replace($old, $new)
                [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::UTF8)
            }
        }
    }
    Write-Host "  OK: $old -> $new"
}

Write-Host "-- Nomes do sistema --"
Replace-All "Cenat Hub" "VoxCandidata"
Replace-All "CENAT Hub" "VoxCandidata"
Replace-All "CenatHub" "VoxCandidata"
Replace-All "cenat-hub" "voxcandidata"
Replace-All "cenat_hub" "voxcandidata"
Replace-All "cenathub" "voxcandidata"

Write-Host "-- EduFlow --"
Replace-All "EduFlow" "VoxCandidata"
Replace-All "Eduflow" "VoxCandidata"
Replace-All "eduFlow" "voxcandidata"
Replace-All "eduflow" "voxcandidata"
Replace-All "EDUFLOW" "VOXCANDIDATA"

Write-Host "-- CENAT --"
Replace-All "CENAT" "VoxCandidata"
Replace-All "cenat" "voxcandidata"
Replace-All "Cenat" "VoxCandidata"

Write-Host "-- Dominios --"
Replace-All "hub.cenatdata.online" "voxcandidata.eduflow.com.br"
Replace-All "cenatdata.online" "eduflow.com.br"

Write-Host "-- Banco de dados --"
Replace-All "cenat_whatsapp" "voxcandidata_db"

Write-Host "-- Repositorio --"
Replace-All "pos-plataform" "voxcandidata"
Replace-All "pos_plataform" "voxcandidata"

Write-Host "-- Servicos systemd --"
Replace-All "cenat-backend" "voxcandidata-backend"
Replace-All "cenat-frontend" "voxcandidata-frontend"

Write-Host "-- Agente IA --"
Replace-All "Nat WhatsApp" "Agente IA WhatsApp"
Replace-All "Nat Voice" "Agente IA Voice"
Replace-All "a Nat" "o Agente IA"
Replace-All "A Nat" "O Agente IA"
Replace-All "da Nat" "do Agente IA"
Replace-All "pela Nat" "pelo Agente IA"
Replace-All "Agente Nat" "Agente IA"
Replace-All "agente Nat" "agente IA"
Replace-All "Nat (IA)" "Agente IA"
Replace-All "a IA Nat" "o Agente IA"
Replace-All "Nat esta" "Agente IA esta"

Write-Host "-- Webhook token --"
Replace-All "cenat_webhook_2024" "voxcandidata_webhook_2026"

Write-Host ""
Write-Host "Rebranding concluido com sucesso!" -ForegroundColor Green
