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
| `POST` | `/v1/vehicles` | MASTER, ADMIN | Criar veículo (tenta sincronizar com Traccar) |
| `PATCH` | `/v1/vehicles/:id` | MASTER, ADMIN | Atualizar veículo |
| `DELETE` | `/v1/vehicles/:id` | MASTER | Remover veículo |
| `POST` | `/v1/vehicles/:id/sync-traccar` | MASTER, ADMIN | Sincronizar veículo pendente com o Traccar |
| `POST` | `/v1/vehicles/sync-all/pending` | MASTER, ADMIN | Sincronizar **todos** os pendentes/falhos |

**POST /v1/vehicles**
```json
{
  "plate": "ABC-1A23",
  "model": "Marcopolo Paradiso",
  "status": "AVAILABLE"
}
```

**Resposta (201 — sucesso):**
```json
{
  "id": "uuid",
  "plate": "ABC-1A23",
  "model": "Marcopolo Paradiso",
  "status": "AVAILABLE",
  "traccarDeviceId": 42,
  "traccarSyncStatus": "SYNCED",
  "tenantId": "uuid",
  "createdAt": "2026-05-25T12:00:00.000Z",
  "updatedAt": "2026-05-25T12:00:00.000Z"
}
```

**Resposta (201 — falha no Traccar, veículo criado mesmo assim):**
```json
{
  "id": "uuid",
  "plate": "ABC-1A23",
  "model": "Marcopolo Paradiso",
  "status": "AVAILABLE",
  "traccarDeviceId": null,
  "traccarSyncStatus": "PENDING",
  "tenantId": "uuid",
  "createdAt": "2026-05-25T12:00:00.000Z",
  "updatedAt": "2026-05-25T12:00:00.000Z"
}
```

**POST /v1/vehicles/:id/sync-traccar**
Sincroniza um veículo específico que ficou `PENDING` ou `FAILED`:
```json
// 200 OK
{
  "id": "uuid",
  "plate": "ABC-1A23",
  "traccarDeviceId": 42,
  "traccarSyncStatus": "SYNCED",
  ...
}
```

**POST /v1/vehicles/sync-all/pending**
Sincroniza **todos** os veículos com `traccarSyncStatus` diferente de `SYNCED`:
```json
// 200 OK
{
  "synced": 2,
  "failed": 1,
  "details": [
    { "id": "uuid", "plate": "ABC-1A23", "success": true },
    { "id": "uuid", "plate": "DEF-4B56", "success": true },
    { "id": "uuid", "plate": "GHI-7C89", "success": false, "error": "Erro de conexão" }
  ]
}
```

**Status disponíveis do veículo:** `AVAILABLE` | `IN_OPERATION` | `MAINTENANCE` | `OFFLINE`

**Status de sincronização Traccar:** `PENDING` | `SYNCED` | `FAILED`

> ⚠️ Veículos são isolados por tenant. Ao criar, o backend tenta cadastrar automaticamente no Traccar. Se falhar (ex.: Traccar offline), o veículo fica com `traccarSyncStatus: 'PENDING'` e pode ser sincronizado depois via `POST /v1/vehicles/:id/sync-traccar` ou em lote via `POST /v1/vehicles/sync-all/pending`.

---

### Integração frontend — Fluxo de cadastro de veículo

1. **Criar veículo:** `POST /v1/vehicles` → recebe `traccarSyncStatus`
2. **Exibir status na lista/tabela:**

| `traccarSyncStatus` | Significado | Ação no frontend |
|---|---|---|
| `SYNCED` | ✅ Rastreamento ativo | Mostrar badge verde. Veículo aparece no mapa. |
| `PENDING` | ⏳ Aguardando sync | Mostrar badge amarelo + botão "Sincronizar" |
| `FAILED` | ❌ Sync falhou | Mostrar badge vermelho + botão "Tentar novamente" |

3. **Sincronizar um veículo:** `POST /v1/vehicles/:id/sync-traccar` → retorna o veículo atualizado com `traccarDeviceId` e `traccarSyncStatus: 'SYNCED'`
4. **Sincronizar todos pendentes:** `POST /v1/vehicles/sync-all/pending` → retorna resumo com contagem de sucessos/falhas

**Telas sugeridas:**

- **Tela de frota (lista):** coluna "Rastreamento" com badge colorido (verde/amarelo/vermelho). Se não for `SYNCED`, exibir botão "🔄 Sincronizar".
- **Tela de detalhe do veículo:** exibir `traccarDeviceId` e status de rastreamento. Botão para sincronizar se estiver pendente.
- **Tela do mapa:** **apenas** veículos com `traccarSyncStatus: 'SYNCED` devem aparecer no mapa.
- **Após sync bem-sucedido:** o veículo passa a aparecer nos endpoints de proxy do Traccar (`/v1/traccar/devices`, `/v1/traccar/positions`) e começa a emitir eventos em tempo real via Socket.IO.

**Exemplo de implementação React:**
```tsx
function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    await fetch(`/v1/vehicles/${vehicle.id}/sync-traccar`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });
    setSyncing(false);
    // recarregar lista
  }

  const badge = {
    SYNCED:  <span className="badge badge-success">🟢 Sincronizado</span>,
    PENDING: <span className="badge badge-warning">🟡 Pendente</span>,
    FAILED:  <span className="badge badge-error">🔴 Falhou</span>,
  };

  return (
    <tr>
      <td>{vehicle.plate}</td>
      <td>{badge[vehicle.traccarSyncStatus]}</td>
      <td>{vehicle.traccarDeviceId ?? '—'}</td>
      <td>
        {vehicle.traccarSyncStatus !== 'SYNCED' && (
          <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizando...' : '🔄 Sincronizar'}
          </button>
        )}
      </td>
    </tr>
  );
}
```

### Integração frontend — Tempo real no mapa

1. Conectar no Socket.IO (`/realtime`) após o login
2. Escutar evento `position` → atualizar marcador no mapa
3. Escutar evento `device:status` → atualizar badge online/offline
4. **Veículos com `traccarSyncStatus: 'PENDING'` ou `'FAILED'` não recebem posições** — o mapa só deve exibir veículos `SYNCED`

```tsx
// Hook React para tempo real
function useRealtimePositions() {
  const [positions, setPositions] = useState<Map<number, Position>>(new Map());

  useEffect(() => {
    const socket = io('http://localhost:3000/realtime', {
      auth: { token: `Bearer ${jwt}` },
    });

    socket.on('position', (pos: Position) => {
      setPositions((prev) => new Map(prev).set(pos.deviceId, pos));
    });

    return () => { socket.disconnect(); };
  }, []);

  return positions;
}
```

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

## 🔌 Integração Traccar

### Proxy REST

O backend faz proxy autenticado para a API REST do Traccar. Os endpoints abaixo consomem a sessão do Traccar internamente — o frontend envia apenas o JWT da Genesis.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/v1/traccar/devices` | Listar dispositivos do Traccar |
| `GET` | `/v1/traccar/devices/:id` | Detalhes de um dispositivo |
| `GET` | `/v1/traccar/positions` | Últimas posições conhecidas |
| `GET` | `/v1/traccar/events` | Eventos (requer `from` e `to`) |

**Query params — `/v1/traccar/positions`:**
| Parâmetro | Tipo | Descrição |
|---|---|---|
| `deviceId` | `number[]` | Filtrar por dispositivo (ex: `?deviceId=1&deviceId=2`) |

**Query params — `/v1/traccar/events`:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `deviceId` | `number` | não | Filtrar por dispositivo |
| `from` | `string` (ISO 8601) | não | Início do período (default: 2026-01-01) |
| `to` | `string` (ISO 8601) | não | Fim do período (default: agora) |

**Exemplos:**
```bash
# Listar dispositivos
GET /v1/traccar/devices
Authorization: Bearer <jwt>

# Últimas posições dos dispositivos 1 e 2
GET /v1/traccar/positions?deviceId=1&deviceId=2

# Eventos dos últimos 7 dias
GET /v1/traccar/events?from=2026-05-18T00:00:00Z&to=2026-05-25T23:59:59Z
Authorization: Bearer <jwt>
```

> A sessão com o Traccar é mantida automaticamente pelo backend (cookie `JSESSIONID`). Em caso de 401, o backend re-autentica e tenta novamente.

### Webhook (ingestão)

O próprio Traccar envia eventos e posições para o backend via webhook configurado no `traccar.xml`:

| Método | Rota | Origem |
|---|---|---|
| `POST` | `/v1/telemetry/traccar/positions` | Traccar → NestJS (positions.forward) |
| `POST` | `/v1/telemetry/traccar/events` | Traccar → NestJS (event.forward) |

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

## 📡 Tempo Real (WebSocket + Socket.IO)

### Arquitetura

```
Dispositivo GPS → Traccar (WS) → NestJS → Socket.IO → Frontend
                    (nativo)     (ws + cookie)  (/realtime)
```

O backend se conecta ao WebSocket nativo do Traccar (`ws://traccar:8082/api/socket`) usando o cookie de sessão, e retransmite as mensagens para o frontend via Socket.IO no namespace `/realtime`.

### Socket.IO — Conectar

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/realtime', {
  auth: { token: 'Bearer <jwt_da_genesis>' },
});
```

### Eventos recebidos

#### `position`
```json
{
  "id": 12345,
  "deviceId": 1,
  "latitude": -23.5505,
  "longitude": -46.6333,
  "speed": 45.2,
  "course": 180.0,
  "altitude": 760,
  "fixTime": "2026-05-25T12:00:00Z",
  "ignition": true
}
```

#### `event`
```json
{
  "id": 67890,
  "deviceId": 1,
  "type": "deviceOnline",
  "positionId": 12345,
  "geofenceId": null,
  "attributes": { "battery": 95 },
  "serverTime": "2026-05-25T12:00:00Z"
}
```

#### `device:status`
```json
{
  "id": 1,
  "name": "Ônibus 101",
  "uniqueId": "1234567890",
  "status": "online",
  "lastUpdate": "2026-05-25T12:00:00Z"
}
```

### Exemplo frontend

```js
socket.on('position', (pos) => {
  // atualizar marcador no mapa
  map.flyTo({ center: [pos.longitude, pos.latitude] });
});

socket.on('event', (evt) => {
  // mostrar notificação
  notify({ title: evt.type, body: `Dispositivo ${evt.deviceId}` });
});

socket.on('device:status', (dev) => {
  // atualizar indicador online/offline
  updateDeviceStatus(dev.id, dev.status);
});
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
- [ ] Histórico de posições (TimescaleDB)
- [ ] Geofences / alertas
- [ ] Relatórios
- [ ] Endpoints específicos FastTracking (entregas)
