# Bot de Fila de Testes (MCTiers Style)

Bot Discord para gerenciar fila de testes com sistema de tiers.

## Setup

### 1. Criar Bot no Discord

1. Acesse https://discord.com/developers/applications
2. Clique em "New Application"
3. Vá em "Bot" → "Reset Token" → copie o token
4. Vá em "OAuth2" → "URL Generator"
5. Selecione scopes: `bot`, `applications.commands`
6. Selecione permissões: `Send Messages`, `Use Slash Commands`, `Manage Messages`, `Move Members`
7. Copie a URL e adicione o bot ao servidor

### 2. Configurar .env

Edite o arquivo `.env` com os IDs do seu servidor:

```
DISCORD_TOKEN=seu_token
CLIENT_ID=id_do_bot
GUILD_ID=id_do_servidor
TESTER_ROLE_ID=id_do_cargo_tester
FILA_CHANNEL_ID=id_do_canal_fila
RESULTS_CHANNEL_ID=id_do_canal_results
REQUEST_CHANNEL_ID=id_do_canal_request
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Registrar Comandos

```bash
npm run deploy
```

### 5. Iniciar Bot

```bash
npm start
```

## Comandos

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/fila abrir` | Abre a fila | Tester |
| `/fila fechar` | Fecha a fila | Tester |
| `/fila finalizar <tier>` | Finaliza teste com tier | Tester |
| `/fila proximo` | Puxa próximo da fila | Tester |
| `/fila skipar` | Pula teste atual | Tester |
| `/fila force <user> <pos>` | Força posição na fila | Tester |
| `/fila` | Mostra status | Todos |

## Tiers

- **HT1** > HT2 > HT3 > HT4 > HT5 (High)
- **LT1** > LT2 > LT3 > LT4 > LT5 (Low)
- Menor número = melhor

## Estrutura de Canais

```
📁 TESTE
├── #results      (resultados)
├── #request-test (botão de registro)
└── #fila         (embed dinâmico)
```
