# Genesis ITS — Hub API

API central do ecossistema Genesis ITS, responsável por autenticação, gestão de frotas e telemetria para os produtos **OtimiBus** (transporte público) e **FastTracking** (frota geral).

---

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Subir infraestrutura (PostgreSQL, Redis, Traccar)
docker compose up -d

# 3. Rodar migrations/seed (cria tabelas e dados de teste)
npm run seed

# 4. Iniciar servidor dev
npm run start:dev
```

**Swagger:** http://localhost:3000/docs

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 + TypeScript |
| Framework | NestJS 11 (Express) |
| Database | PostgreSQL 16 + TimescaleDB + PostGIS |
| Cache/Stream | Redis 7 (Streams) |
| Gateway GPS | Traccar (self-hosted) |
| Auth | JWT + Passport |
| Validação | class-validator |

---

## 🔐 Autenticação

### Registro

Cria um novo **Tenant** (cliente) e um **usuário MASTER** vinculado.

```
POST /v1/auth/register
```

```json
{
  "email": "admin@transportadora.com",
  "password": "123456",
  "name": "Admin da Transportadora",
  "tenantName": "Transportadora Exemplo",
  "tenantSlug": "transportadora-exemplo",
  "product": "OTIMIBUS"
}
```

**product:** `OTIMIBUS` | `FAST_TRACKING`

**Resposta (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@transportadora.com",
    "name": "Admin da Transportadora",
    "role": "MASTER",
    "tenantId": "uuid",
    "product": "OTIMIBUS"
  }
}
```

### Login

```
POST /v1/auth/login
```

```json
{
  "email": "admin@transportadora.com",
  "password": "123456"
}
```

**Resposta (200):**
```json
{
  "accessToken": "eyJ...",
  "user": { "id":"uuid", "email":"...", "name":"...", "role":"MASTER", "tenantId":"uuid", "product":"OTIMIBUS" }
}
```

### Como usar o token

Todas as rotas protegidas exigem o header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

O token JWT contém:
```json
{
  "sub": "uuid (user id)",
  "email": "user@email.com",
  "tenantId": "uuid",
  "role": "MASTER",
  "product": "OTIMIBUS"
}
```

> ⚠️ O token expira em **7 dias**.

---

## 👥 Modelo Multi-tenant

```
Genesis ITS (Hub)
├── OtimiBus
│   └── Tenant A (Transportadora ABC)
│       ├── Usuários (MASTER, ADMIN, OPERATOR, VIEWER)
│       └── Veículos
├── FastTracking
│   └── Tenant B (Logística XYZ)
│       ├── Usuários (MASTER, ADMIN, OPERATOR, VIEWER)
│       └── Veículos
```

### Papéis (Roles)

| Role | Acesso |
|---|---|
| **MASTER** | Acesso total, inclusive gerenciar tenant e outros usuários |
| **ADMIN** | CRUD de recursos do tenant (veículos, motoristas) |
| **OPERATOR** | Operação diária (visualizar e atualizar status) |
| **VIEWER** | Apenas leitura |

---

## 📋 Endpoints

### Tenants

| Método | Rota | Roles | Descrição |
|---|---|---|---|
| `GET` | `/v1/tenants` | MASTER | Listar todos os tenants |
| `GET` | `/v1/tenants/:id` | MASTER, ADMIN | Detalhes do tenant |
| `PATCH` | `/v1/tenants/:id` | MASTER | Atualizar dados do tenant |

### Veículos

| Método | Rota | Roles | Descrição |
|---|---|---|---|
| `GET` | `/v1/vehicles` | Todos | Listar veículos **do seu tenant** |
| `GET` | `/v1/vehicles/:id` | Todos | Detalhe do veículo |
| `POST` | `/v1/vehicles` | MASTER, ADMIN | Criar veículo |
| `PATCH` | `/v1/vehicles/:id` | MASTER, ADMIN | Atualizar veículo |
| `DELETE` | `/v1/vehicles/:id` | MASTER | Remover veículo |

**POST /v1/vehicles**
```json
{
  "plate": "ABC-1A23",
  "model": "Marcopolo Paradiso",
  "status": "AVAILABLE"
}
```

**Status disponíveis:** `AVAILABLE` | `IN_OPERATION` | `MAINTENANCE` | `OFFLINE`

> ⚠️ Todos os veículos são isolados por tenant. O usuário só vê os veículos do seu próprio tenant.

### Rotas (exclusivo OtimiBus)

| Método | Rota | Roles | Feature | Descrição |
|---|---|---|---|---|
| `GET` | `/v1/routes` | Todos | `routes:management` | Listar rotas |
| `POST` | `/v1/routes` | MASTER, ADMIN | `routes:management` | Criar rota |

**Requisição:** `GET /v1/routes`
```json
Authorization: Bearer <token_otimibus>
```

**Resposta (200):**
```json
[
  { "id": 1, "code": "R-001", "name": "Terminal Central → Bairro Novo" },
  { "id": 2, "code": "R-002", "name": "Rodoviária → Shopping" }
]
```

> ❌ Usuários do **FastTracking** recebem **403 Forbidden** com a mensagem: `"Funcionalidade 'routes:management' não disponível para o produto FAST_TRACKING"`

### Telemetria (Traccar)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/telemetry/traccar/positions` | Ingerir posições GPS |
| `POST` | `/v1/telemetry/traccar/events` | Ingerir eventos do dispositivo |

**POST /v1/telemetry/traccar/positions**
```json
[
  {
    "deviceId": 12345,
    "latitude": -23.5505,
    "longitude": -46.6333,
    "fixtime": "2026-05-25T12:00:00Z",
    "speed": 45.2,
    "ignition": true
  }
]
```

**POST /v1/telemetry/traccar/events**
```json
[
  {
    "deviceId": 12345,
    "type": "deviceOnline",
    "positionId": 67890,
    "geofenceId": null,
    "attributes": { "battery": 95 },
    "serverTime": "2026-05-25T12:00:00Z"
  }
]
```

---

## 🏷️ Feature Flags (diferenças entre produtos)

O guard `FeatureGuard` valida se o tenant do usuário logado tem acesso à funcionalidade.

| Feature | OtimiBus | FastTracking |
|---|---|---|
| `routes:management` | ✅ | ❌ |
| `schedules` | ✅ | ❌ |
| `ticketing` | ✅ | ❌ |
| `driver:management` | ✅ | ❌ |
| `delivery:management` | ❌ | ✅ |
| `maintenance` | ✅ | ✅ |
| `reports` | ✅ | ✅ |

Quando um endpoint exige uma feature que o produto não possui, a API retorna:

```json
{
  "statusCode": 403,
  "message": "Funcionalidade 'routes:management' não disponível para o produto FAST_TRACKING",
  "error": "Forbidden"
}
```

---

## ❌ Tratamento de erros

| Status | Significado |
|---|---|
| `400` | Requisição inválida (validação do body) |
| `401` | Não autenticado (token ausente ou inválido) |
| `403` | Não autorizado (role ou feature insuficiente) |
| `404` | Recurso não encontrado |
| `409` | Conflito (ex.: email duplicado) |

**Exemplo erro 400 (validação):**
```json
{
  "message": ["email must be an email", "password must be longer than or equal to 6 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Exemplo erro 401:**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

---

## 🧪 Dados de teste (seed)

```bash
npm run seed
```

Cria 2 tenants com usuários para cada papel:

| Produto | Email | Role | Senha |
|---|---|---|---|
| OtimiBus | master@otimibus.com | MASTER | 123456 |
| OtimiBus | admin@otimibus.com | ADMIN | 123456 |
| OtimiBus | operator@otimibus.com | OPERATOR | 123456 |
| OtimiBus | viewer@otimibus.com | VIEWER | 123456 |
| FastTracking | master@fasttracking.com | MASTER | 123456 |
| FastTracking | admin@fasttracking.com | ADMIN | 123456 |
| FastTracking | operator@fasttracking.com | OPERATOR | 123456 |
| FastTracking | viewer@fasttracking.com | VIEWER | 123456 |

---

## 🐳 Docker

```bash
# Subir todos os serviços
docker compose up -d

# Serviços:
# - transport-postgres (PostgreSQL + TimescaleDB + PostGIS) :5432
# - transport-redis (Redis 7)                               :6379
# - transport-traccar (Traccar GPS)                         :8082, 5000-5199
```

---

## 🔜 Próximas funcionalidades

- [ ] Gestão de usuários (CRUD)
- [ ] Histórico de posições (timescale)
- [ ] Geofences / alertas
- [ ] Relatórios
- [ ] WebSocket para posições em tempo real
- [ ] Endpoints específicos FastTracking (entregas)
