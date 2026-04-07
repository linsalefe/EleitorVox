# 📞 VoxCandidata Voice AI — Módulo de Ligações com IA

Sistema de ligações automáticas com IA para qualificação de leads, integrado ao VoxCandidata Hub.

---

## ✅ O que está funcionando

| Componente | Status | Observação |
|------------|--------|------------|
| Servidor AWS Lightsail | ✅ Operacional | Ubuntu 22.04, 2GB RAM |
| PostgreSQL + Migrations | ✅ Operacional | 5 tabelas do Voice AI criadas |
| Backend FastAPI | ✅ Operacional | Uvicorn na porta 8001 |
| Frontend Next.js | ✅ Operacional | Build de produção na porta 3000 |
| Nginx + SSL | ✅ Operacional | portal.voxcandidataia.com |
| Login/Auth | ✅ Operacional | JWT funcionando |
| Dashboard `/api/voice-ai/dashboard` | ✅ Operacional | Métricas e KPIs |
| Twilio (disparo de chamadas) | ✅ Operacional | Número +553122980172 |
| Twilio Webhooks | ✅ Operacional | answer, status, recording |
| OpenAI Realtime API | ✅ Conecta + Funciona | gpt-realtime (modelo GA) |
| Voz Coral (feminina PT-BR) | ✅ Funciona | Calorosa, natural em português |
| Greeting (saudação inicial) | ✅ Funciona | Latência ~2-3s |
| Conversa bidirecional | ✅ Funciona | Lead fala ↔ IA responde em tempo real |
| Transcrição em tempo real | ✅ Funciona | gpt-4o-transcribe (alta precisão) |
| Semantic VAD | ✅ Funciona | eagerness: medium, interrupt_response: true |
| Barge-in inteligente | ✅ Funciona | response.cancel + clear Twilio |
| Function Calling | ✅ Funciona | update_lead_fields, change_state, end_call |
| FSM (Máquina de Estados) | ✅ Funciona | OPENING→CONTEXT→QUALIFY→SCHEDULE→CLOSE |
| Score de qualificação | ✅ Funciona | Score 0-100 calculado automaticamente |
| Resumo automático | ✅ Funciona | Gerado ao final da chamada |
| Atualização CRM | ✅ Funciona | Status e resumo atualizados no banco |
| RAG (Base de Conhecimento) | ✅ Funciona | 10 pós-graduações VoxCandidata com embeddings |
| Prompt SDR (Nat/VoxCandidata) | ✅ Funciona | Baseado no pitch real da Vitória |
| Agendamento inteligente | ✅ Funciona | Turno → Dia → Horário específico |
| Encerramento suave | ✅ Funciona | Voucher + ementa + recapitulação |
| Gravação de chamadas | ✅ Funciona | Salvas no Twilio + URL no banco |

---

## 🧠 Otimizações de Naturalidade (v5)

### Modelo e Voz
- **Modelo:** `gpt-realtime` (GA — mais avançado para voz)
- **Transcrição:** `gpt-4o-transcribe` (alta precisão, entende sotaque e ruído)
- **Voz:** `coral` (feminina, calorosa, otimizada para PT-BR)
- **Speed:** `1.05` (5% mais rápido, cadência natural)

### VAD e Barge-in
- **Semantic VAD** com `eagerness: medium` (detecta fim de fala com precisão)
- **interrupt_response: true** (cancela fala da IA quando lead interrompe)
- **response.cancel** enviado ao OpenAI + **clear** no Twilio (barge-in completo)
- **create_response: true** (resposta automática após detecção de turno)

### Prompt SDR Humanizado
- **Identidade:** Nat, consultora do VoxCandidata
- **Adaptive Listening:** Usa palavras do lead, conecta com o curso
- **Turn Pattern:** Ack curto → Espelho → Pergunta (nunca formulário)
- **Conversation Flow Rules:** Nunca para em frase informativa, sempre emenda com próximo passo
- **Agendamento:** Turno → Dia da semana → Horário específico → Confirmação
- **Encerramento:** Voucher + ementa WhatsApp + recapitulação + despedida calorosa
- **Variedade:** Alterna acks, nunca repete mesma frase

### RAG — Base de Conhecimento
10 pós-graduações do VoxCandidata com embeddings (text-embedding-3-small):
1. Psicologia Hospitalar e da Saúde
2. Supervisão Clínica-Institucional (2026)
3. Novas Abordagens em Saúde Mental (Luta Antimanicomial)
4. Saúde Mental Infantojuvenil
5. Ouvidores de Vozes (2025)
6. PICs em Saúde Mental
7. Saúde Mental na Atenção Primária
8. Direitos Humanos e Populações Vulnerabilizadas
9. Saúde Mental do Trabalhador
10. Acompanhamento Terapêutico (2026)

---

## ❌ O que falta concluir

### 🟡 Prioridade Média

| Tarefa | Status | Descrição |
|--------|--------|-----------|
| Retry automático | 🔲 Não testado | Re-tentativas (5min, 30min, 120min) |
| QA Engine | 🔲 Não testado | Avaliação automática pós-chamada |
| Scheduler Adapter | 🔲 Não testado | Google Calendar após agendamento |
| WhatsApp Follow-up | 🔲 Não testado | Ementa + voucher pós-ligação |

### 🟢 Prioridade Baixa

| Tarefa | Descrição |
|--------|-----------|
| Exact Spotter Timeline | Postar resumo na timeline do lead |
| Dashboard Frontend | Gráficos, lista de chamadas, player de gravação |
| Scripts/Roteiros | CRUD de roteiros personalizados via interface |

---

## Arquitetura

```
Internet → Nginx (443/SSL) → Frontend Next.js (3000) + Backend FastAPI (8001)
                                   ↓
                              PostgreSQL (5432)
                                   ↓
                         ┌─────────┴─────────┐
                         │   Voice AI Tables  │
                         │  ai_calls          │
                         │  ai_call_turns     │
                         │  ai_call_events    │
                         │  voice_scripts     │
                         │  ai_call_qa        │
                         │  knowledge_documents│
                         └─────────┬─────────┘
                                   ↓
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
              Twilio API    OpenAI Realtime    Exact Spotter
           (chamadas voz)   (STT+LLM+TTS)      (CRM)
```

### Fluxo da Chamada (v5 — Realtime API GA)

```
1. POST /api/voice-ai/leads/new
2. Backend cria registro em ai_calls (status: pending)
3. Twilio.calls.create() → liga para o lead
4. Lead atende → Twilio chama /twilio/answer
5. TwiML retorna <Connect><Stream> → WebSocket bidirecional
6. Pipeline pre-conecta ao OpenAI Realtime API via WSS
7. Configura sessão: coral, semantic_vad, speed 1.05
8. RAG: busca snippets por curso (embeddings + cosine similarity)
9. Greeting disparado automaticamente
10. Realtime API gerencia: STT + LLM + TTS + VAD + Barge-in
11. Áudio relay: Twilio ↔ OpenAI (g711_ulaw 8kHz direto)
12. Function calls: coleta dados, muda estado FSM
13. Agendamento: turno → dia → horário → confirmação
14. Encerramento suave: voucher + ementa + despedida (5s delay)
15. Chamada encerra → gera resumo, score, atualiza CRM
```

---

## Custos por Chamada (dados reais)

### Preços Oficiais (Fev/2026)

**OpenAI Realtime API — gpt-realtime (por 1M tokens):**

| Tipo | Input | Output |
|------|-------|--------|
| Audio | $32.00 | $64.00 |
| Text | $5.00 | $20.00 |
| Cached Audio Input | $0.40 | — |

**Twilio Voice — Brasil:**

| Tipo | Custo |
|------|-------|
| Chamada para celular BR | ~$0.14/min |
| Número local BR | ~$2-5/mês |

### Estimativa por Chamada (3 min média)

| Cenário | Custo/chamada | Custo/dia (100 chamadas) |
|---------|---------------|--------------------------|
| Modelo atual (gpt-realtime) | ~$0.85 (~R$5) | ~$85 (~R$510) |

---

## Estrutura de Arquivos

```
backend/app/voice_ai/
├── __init__.py
├── config.py              # Variáveis de ambiente e constantes
├── models.py              # Tabelas: ai_calls, ai_call_turns, etc.
├── fsm.py                 # Máquina de estados (OPENING→CLOSE)
├── llm_contract.py        # Contrato LLM + geração de resumo
├── voice_pipeline.py      # OpenAI Realtime API relay bidirecional
├── routes.py              # Endpoints da API + WebSocket handler
├── crm_adapter.py         # Integração CRM (Exact + interno)
├── scheduler_adapter.py   # Agendamento (Calendar + WhatsApp)
├── qa_engine.py           # Avaliação automática de qualidade
└── README.md              # Este arquivo
```

---

## Configuração do Servidor

| Item | Valor |
|------|-------|
| **IP** | 44.211.127.84 |
| **Domínio** | portal.voxcandidataia.com |
| **SSL** | Let's Encrypt |
| **SO** | Ubuntu 22.04 |
| **RAM** | 2GB (Lightsail $12/mês) |
| **Python** | 3.10 |
| **Node** | 20 |
| **PostgreSQL** | 14 |

### Serviços Systemd

```bash
sudo systemctl status voxcandidata-backend   # FastAPI (porta 8001)
sudo systemctl status voxcandidata-frontend  # Next.js (porta 3000)
```

### Variáveis de Ambiente (.env)

```env
DATABASE_URL=postgresql+asyncpg://voxcandidata:SENHA@localhost:5432/voxcandidata_db
OPENAI_API_KEY=SUA_OPENAI_KEY
TWILIO_ACCOUNT_SID=SEU_TWILIO_SID
TWILIO_AUTH_TOKEN=SEU_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=+553122980172
BASE_URL=https://portal.voxcandidataia.com
VOICE_AI_ENABLED=true
```

### Twilio Webhooks

| Evento | URL | Método |
|--------|-----|--------|
| A call comes in | `https://portal.voxcandidataia.com/api/voice-ai/twilio/answer` | POST |
| Call status changes | `https://portal.voxcandidataia.com/api/voice-ai/twilio/status` | POST |

---

## Endpoints da API

### Entrada de Leads
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/voice-ai/leads/new` | Sim | Recebe lead e dispara chamada |
| POST | `/api/voice-ai/calls/manual` | Sim | Disparo manual |

### Twilio Callbacks
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/voice-ai/twilio/answer` | TwiML quando atende |
| POST | `/api/voice-ai/twilio/status` | Status da chamada |
| POST | `/api/voice-ai/twilio/recording-status` | Gravação pronta |
| WS | `/api/voice-ai/stream` | Media Stream (Realtime API relay) |

### Gerenciamento
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/voice-ai/calls` | Sim | Lista chamadas |
| GET | `/api/voice-ai/calls/{id}` | Sim | Detalhe + transcrição |
| POST | `/api/voice-ai/calls/{id}/transfer` | Sim | Transferir para closer |
| POST | `/api/voice-ai/calls/{id}/end` | Sim | Encerrar chamada |
| GET | `/api/voice-ai/dashboard` | Sim | Métricas e KPIs |
| GET | `/api/voice-ai/scripts` | Sim | Lista roteiros |
| POST | `/api/voice-ai/scripts` | Sim | Criar roteiro |

---

## FSM (Máquina de Estados)

```
OPENING → CONTEXT → QUALIFY → HANDLE_OBJECTION
                                      │
                              ┌───────┼───────┐
                              ▼       ▼       ▼
                          SCHEDULE  TRANSFER  FOLLOW_UP
                              │       │       │
                              └───────┼───────┘
                                      ▼
                                    CLOSE
```

| Estado | O que faz | Campos obrigatórios |
|--------|-----------|---------------------|
| OPENING | Apresentação + permissão | — |
| CONTEXT | Confirma interesse/curso | confirmed_interest |
| QUALIFY | Coleta: formação, atuação, motivação, investimento | formação, atuação, motivação |
| HANDLE_OBJECTION | Trata objeções com empatia | — |
| SCHEDULE | Agenda reunião (turno→dia→horário) | data_agendamento, hora_agendamento |
| WARM_TRANSFER | Transfere pro closer | handoff_reason |
| FOLLOW_UP | Encerra com WhatsApp | — |
| CLOSE | Voucher + ementa + despedida | — |

---

## Score de Qualificação (0-100)

| Campo | Peso |
|-------|------|
| Confirmou interesse | 20 |
| Objetivo claro | 15 |
| Prazo definido | 15 |
| Disponibilidade | 15 |
| Forma de pagamento | 20 |
| Sem objeções | 15 |

---

## Como Debugar

### Logs do Backend
```bash
sudo journalctl -u voxcandidata-backend -f | grep -E "📞|✅|❌|🎙️|🤖|📡|RAG|TIMING|greeting|error"
```

### Disparar Chamada de Teste
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"SEU_EMAIL","password":"SUA_SENHA"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8001/api/voice-ai/leads/new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Teste","phone":"+55SEU_NUMERO","course":"Psicologia Hospitalar e da Saúde","source":"debug"}' | python3 -m json.tool
```

### Baixar Gravação
```bash
source ~/voxcandidata/backend/.env
sudo -u postgres psql voxcandidata_db -c "SELECT recording_url FROM ai_calls WHERE recording_url IS NOT NULL ORDER BY id DESC LIMIT 1;"
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" -o /tmp/gravacao.mp3 "URL_AQUI"
```

### Gerar Embeddings para novos documentos
```bash
cd ~/voxcandidata/backend && source venv/bin/activate && python3 /tmp/gen_embeddings.py
```

---

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| v1 | 18/02/2026 | Pipeline básico STT→LLM→TTS |
| v2 | 18/02/2026 | Migração para OpenAI Realtime API |
| v3 | 18/02/2026 | Conversa funcional, greeting estável |
| v4 | 19/02/2026 | Formato GA, latência reduzida 3-4s |
| **v5** | **19/02/2026** | **Coral, semantic_vad, prompt SDR, RAG, barge-in completo** |

---

## Git — Commits Importantes

| Hash | Descrição |
|------|-----------|
| `0706814` | ✅ Versão estável v3 — rag_snippets fix, conversa funcional |
| `a7f498a` | pre_connect + max_tokens 4096 + VAD 0.8 |
| Próximo commit | v5 — coral, semantic_vad, SDR prompt, RAG embeddings, barge-in |

> Para reverter para versão estável v3: `git reset --hard 0706814`