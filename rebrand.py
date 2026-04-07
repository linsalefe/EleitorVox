import os
import sys

EXTENSIONS = {'.md','.py','.ts','.tsx','.js','.jsx','.json','.css','.html','.yaml','.yml'}
EXCLUDE_DIRS = {'node_modules','.next','venv','__pycache__','.git'}

REPLACEMENTS = [
    # Nomes do sistema
    ("VoxCandidata", "VoxCandidata"),
    ("VoxCandidata", "VoxCandidata"),
    ("VoxCandidata", "VoxCandidata"),
    ("voxcandidata", "voxcandidata"),
    ("voxcandidata", "voxcandidata"),
    ("voxcandidata", "voxcandidata"),
    # VoxCandidata
    ("VoxCandidata", "VoxCandidata"),
    ("VoxCandidata", "VoxCandidata"),
    ("voxcandidata", "voxcandidata"),
    ("VOXCANDIDATA", "VOXCANDIDATA"),
    ("voxcandidata", "voxcandidata"),
    # Dominios
    ("voxcandidata.eduflow.com.br", "voxcandidata.voxcandidata.com.br"),
    ("eduflow.com.br", "voxcandidata.com.br"),
    # Banco
    ("voxcandidata_db", "voxcandidata_db"),
    # Servicos
    ("voxcandidata-backend", "voxcandidata-backend"),
    ("voxcandidata-frontend", "voxcandidata-frontend"),
    # Repositorio
    ("voxcandidata", "voxcandidata"),
    ("voxcandidata", "voxcandidata"),
    # Agente IA
    ("Agente IA WhatsApp", "Agente IA WhatsApp"),
    ("Agente IA Voice", "Agente IA Voice"),
    ("Agente IA", "Agente IA"),
    ("agente IA", "agente IA"),
    ("Agente IA", "Agente IA"),
    ("o Agente IA", "o Agente IA"),
    ("pelo Agente IA", "pelo Agente IA"),
    ("do Agente IA", "do Agente IA"),
    ("o Agente IA", "o Agente IA"),
    ("O Agente IA", "O Agente IA"),
    ("Agente IA esta", "Agente IA esta"),
    # VoxCandidata (por ultimo pois e mais generico)
    ("VoxCandidata", "VoxCandidata"),
    ("VoxCandidata", "VoxCandidata"),
    ("voxcandidata", "voxcandidata"),
    # Webhook
    ("voxcandidata_webhook_2024", "voxcandidata_webhook_2026"),
]

def should_process(filepath):
    _, ext = os.path.splitext(filepath)
    return ext in EXTENSIONS

def main():
    print("Iniciando rebranding para VoxCandidata...")
    total_files = 0
    total_changes = 0

    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fname in files:
            fpath = os.path.join(root, fname)
            if not should_process(fpath):
                continue
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except:
                continue

            original = content
            for old, new in REPLACEMENTS:
                content = content.replace(old, new)

            if content != original:
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)
                total_files += 1
                total_changes += original != content
                print(f"  Atualizado: {fpath}")

    print(f"\nConcluido! {total_files} arquivos atualizados.")

    # Verificar restantes
    print("\nVerificando referencias restantes...")
    found = False
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fname in files:
            fpath = os.path.join(root, fname)
            if not should_process(fpath):
                continue
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().lower()
                for term in ["voxcandidata", "voxcandidata", "voxcandidata"]:
                    if term in content:
                        print(f"  ATENCAO: {fpath} ainda contem '{term}'")
                        found = True
                        break
            except:
                continue

    if not found:
        print("  Nenhuma referencia antiga encontrada!")

if __name__ == "__main__":
    main()
