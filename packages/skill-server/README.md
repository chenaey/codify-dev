# @tempad-dev/skill-server

HTTP API server for TemPad Dev browser extension.

## Usage

```bash
# Using npx
npx @tempad-dev/skill-server

# Or install globally
npm install -g @tempad-dev/skill-server
skill-server
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SKILL_PORT` | `13580` | HTTP API port |
| `SKILL_WS_PORT` | `13581` | WebSocket port |

## API

### `GET /` — Status

```bash
curl http://127.0.0.1:13580/
```

```json
{ "ready": true, "platform": "figma" }
```

### `POST /get_design` — Get Design Data

```bash
curl -X POST http://127.0.0.1:13580/get_design \
  -H "Content-Type: application/json" \
  -d '{ "nodeId": "123:456" }'
```

### `POST /get_screenshot` — Get Screenshot

```bash
curl -X POST http://127.0.0.1:13580/get_screenshot \
  -H "Content-Type: application/json" \
  -d '{ "nodeId": "123:456" }'
```

### `POST /get_assets` — Export Assets

```bash
curl -X POST http://127.0.0.1:13580/get_assets \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      { "nodeId": "123:500", "format": "png", "scale": 2 },
      { "nodeId": "123:501", "format": "svg" }
    ]
  }'
```

## Architecture

```
Agent ──HTTP──► Skill Server ◄──WebSocket── Browser Extension
```

## Requirements

- Node.js 18+
- TemPad Dev browser extension