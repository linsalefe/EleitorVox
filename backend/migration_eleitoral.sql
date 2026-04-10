-- MIGRAÇÃO ELEITORAL — EleitoVox
-- Executar: sudo -u postgres psql voxcandidata_whatsapp < ~/voxcandidata/backend/migration_eleitoral.sql

-- 1. Lideranças
CREATE TABLE IF NOT EXISTS liderancas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255),
    tipo VARCHAR(30) NOT NULL DEFAULT 'cabo_eleitoral',
    regiao VARCHAR(100),
    lideranca_pai_id BIGINT REFERENCES liderancas(id),
    meta_eleitores INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liderancas_tenant ON liderancas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_liderancas_pai ON liderancas(lideranca_pai_id);

-- 2. Eleitores
CREATE TABLE IF NOT EXISTS eleitores (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    contact_id BIGINT REFERENCES contacts(id),
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    data_nascimento TIMESTAMP,
    telefone VARCHAR(20),
    email VARCHAR(255),
    foto_url TEXT,
    titulo_eleitor VARCHAR(20),
    zona_eleitoral VARCHAR(10),
    secao_eleitoral VARCHAR(10),
    endereco VARCHAR(500),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2) DEFAULT 'PB',
    cep VARCHAR(10),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    nivel_apoio INTEGER DEFAULT 0,
    origem VARCHAR(50),
    lideranca_id BIGINT REFERENCES liderancas(id),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eleitores_tenant ON eleitores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_bairro ON eleitores(tenant_id, bairro);
CREATE INDEX IF NOT EXISTS idx_eleitores_zona ON eleitores(tenant_id, zona_eleitoral);
CREATE INDEX IF NOT EXISTS idx_eleitores_nivel ON eleitores(tenant_id, nivel_apoio);
CREATE INDEX IF NOT EXISTS idx_eleitores_lideranca ON eleitores(lideranca_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_telefone ON eleitores(telefone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eleitores_cpf ON eleitores(cpf) WHERE cpf IS NOT NULL;
