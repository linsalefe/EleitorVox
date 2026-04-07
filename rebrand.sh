#!/bin/bash
# ==============================================
# VoxCandidata — Script de Rebranding
# Remove todas as referências a Eduflow/Cenat/Nat
# Execute na raiz do projeto: bash rebrand.sh
# ==============================================

set -e

echo "🔄 Iniciando rebranding para VoxCandidata..."
echo ""

replace_all() {
    local old="$1"
    local new="$2"
    find . -type f \( -name "*.md" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.css" -o -name "*.html" -o -name "*.yaml" -o -name "*.yml" \) \
        ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/venv/*" ! -name "README.md" \
        -exec sed -i "s|$old|$new|g" {} +
    echo "  ✅ '$old' → '$new'"
}

echo "📌 Nomes do sistema..."
replace_all "Cenat Hub" "VoxCandidata"
replace_all "CENAT Hub" "VoxCandidata"
replace_all "CenatHub" "VoxCandidata"
replace_all "cenat-hub" "voxcandidata"
replace_all "cenat_hub" "voxcandidata"
replace_all "cenathub" "voxcandidata"

echo "📌 EduFlow..."
replace_all "EduFlow" "VoxCandidata"
replace_all "Eduflow" "VoxCandidata"
replace_all "eduFlow" "voxcandidata"
replace_all "eduflow" "voxcandidata"
replace_all "EDUFLOW" "VOXCANDIDATA"

echo "📌 CENAT..."
replace_all "CENAT" "VoxCandidata"
replace_all "cenat" "voxcandidata"
replace_all "Cenat" "VoxCandidata"

echo "📌 Domínios..."
replace_all "hub.cenatdata.online" "voxcandidata.eduflow.com.br"
replace_all "cenatdata.online" "eduflow.com.br"

echo "📌 Banco de dados..."
replace_all "cenat_whatsapp" "voxcandidata_db"

echo "📌 Repositório..."
replace_all "pos-plataform" "voxcandidata"
replace_all "pos_plataform" "voxcandidata"

echo "📌 Serviços systemd..."
replace_all "cenat-backend" "voxcandidata-backend"
replace_all "cenat-frontend" "voxcandidata-frontend"

echo "📌 Agente IA..."
replace_all "Nat WhatsApp" "Agente IA WhatsApp"
replace_all "Nat Voice" "Agente IA Voice"
replace_all "a Nat" "o Agente IA"
replace_all "A Nat" "O Agente IA"
replace_all "da Nat" "do Agente IA"
replace_all "pela Nat" "pelo Agente IA"
replace_all "Agente Nat" "Agente IA"
replace_all "agente Nat" "agente IA"
replace_all "Nat (IA)" "Agente IA"
replace_all "a IA Nat" "o Agente IA"
replace_all "Nat está" "Agente IA está"

echo "📌 Webhook token..."
replace_all "cenat_webhook_2024" "voxcandidata_webhook_2026"

echo ""
echo "✅ Rebranding concluído!"
echo ""
echo "🔍 Verificando referências restantes..."
REMAINING=$(grep -ri "cenat\|eduflow\|pos-plataform" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css" -l 2>/dev/null | grep -v "README.md" | grep -v "node_modules" | grep -v ".next" || true)

if [ -z "$REMAINING" ]; then
    echo "  🎉 Nenhuma referência antiga encontrada!"
else
    echo "  ⚠️  Arquivos com referências restantes:"
    echo "$REMAINING"
fi
