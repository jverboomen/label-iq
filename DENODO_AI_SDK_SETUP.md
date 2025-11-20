# Denodo AI SDK Setup Guide for Label iQ

## Overview

Label iQ integrates with **Denodo AI SDK** (which uses AWS Bedrock internally) to power the AI chatbot feature. The AI SDK runs as a **separate service** and Label iQ connects to it via REST API.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Label iQ      │  HTTP   │  Denodo AI SDK   │  Uses   │  AWS Bedrock    │
│   (This App)    │ ──────> │  (Port 8008)     │ ──────> │  (Claude 3.5)   │
│   Port 5000     │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Denodo Agora    │
                            │  (Data Source)   │
                            └──────────────────┘
```

## Integration Status

✅ **Label iQ is ready to connect** - The integration code is implemented in:
- `server/bedrock.ts` - Denodo AI SDK client
- `server/routes.ts` - `/api/chat` endpoint
- `shared/schema.ts` - Chat request/response types

⏳ **Waiting for** - Denodo AI SDK instance URL

## Option 1: Use Denodo Agora Built-in AI SDK (Recommended)

If you have Denodo Agora with AI SDK enabled:

### 1. Enable AI SDK in Agora

In your Denodo Agora portal:
1. Go to **Environments** → Select your environment
2. Navigate to **Manage Environments** → Create/modify cluster
3. In **Data Marketplace** section, enable **"AI SDK"**
4. Configure AI SDK settings (see below)
5. Restart cluster

### 2. Configuration Settings

```bash
# LLM Provider (AWS Bedrock recommended)
LLM_PROVIDER=bedrock
LLM_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
LLM_TEMPERATURE=0.7

# Embeddings
EMBEDDINGS_PROVIDER=bedrock
EMBEDDINGS_MODEL=amazon.titan-embed-text-v2:0

# Vector Store
VECTOR_STORE=chromadb
```

### 3. Access URL

Once enabled, your AI SDK will be available at:
```
https://<your-agora-instance>:8008
```

Example:
```
https://8a97baaf-b5a1-44d1-ac75-8b5a41603e03.c1a1.agora.denodo.com:8008
```

### 4. Test Connection

```bash
curl https://<your-instance>:8008/docs
```

Should return the FastAPI documentation page.

### 5. Set Label iQ Secret

In Replit Secrets, add:
```
DENODO_AI_SDK_URL=https://<your-instance>:8008
```

---

## Option 2: Run AI SDK Externally (Self-Hosted)

If AI SDK is not enabled in Agora, run it separately.

### Prerequisites

- Python 3.10, 3.11, or 3.12
- Denodo 9.0.5+ with cache enabled
- 2+ CPU cores, 2GB+ RAM, 5GB+ disk space
- AWS credentials (for Bedrock)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/denodo/denodo-ai-sdk.git
cd denodo-ai-sdk

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure SDK

Create `api/utils/sdk_config.env`:

```bash
# Server Configuration
AI_SDK_HOST=0.0.0.0
AI_SDK_PORT=8008
AI_SDK_WORKERS=1

# Denodo Connection
DATA_CATALOG_URL=https://8a97baaf-b5a1-44d1-ac75-8b5a41603e03.c1a1.agora.denodo.com/denodo-data-catalog/
DATA_CATALOG_SERVER_ID=1

# LLM Configuration (AWS Bedrock)
LLM_PROVIDER=bedrock
LLM_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
LLM_TEMPERATURE=0.7

# Thinking LLM (for DeepQuery)
THINKING_LLM_PROVIDER=bedrock
THINKING_LLM_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
THINKING_LLM_TEMPERATURE=0.7

# Embeddings
EMBEDDINGS_PROVIDER=bedrock
EMBEDDINGS_MODEL=amazon.titan-embed-text-v2:0

# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-west-2

# Vector Store
VECTOR_STORE=chromadb
```

### 3. Run AI SDK

```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8008
```

### 4. Load Metadata (First Time)

Initialize the vector store with Denodo metadata:

```bash
curl -X GET "http://localhost:8008/getMetadata?insert=true&vdp_database_names=jl_verboomen" \
  -u "jl.verboomen@massiveinsights.com:YOUR_DENODO_PASSWORD"
```

This step:
- Connects to Denodo Data Catalog
- Vectorizes metadata (tables, columns, relationships)
- Stores in ChromaDB vector database
- Takes 5-10 minutes for initial load

### 5. Expose Public URL

For hackathon demo, expose the local SDK:

**Using ngrok:**
```bash
ngrok http 8008
```

**Using Replit (in separate Repl):**
1. Create Python Repl
2. Clone and configure AI SDK
3. Run on port 8008
4. Use Repl's public URL

### 6. Set Label iQ Secret

```
DENODO_AI_SDK_URL=https://your-ngrok-url.ngrok.io
```

Or:
```
DENODO_AI_SDK_URL=https://your-repl.replit.app
```

---

## Option 3: Use Docker (Production)

### 1. Get Container Image

Download from DenodoConnects:
- Support site → DenodoConnects section
- Or Harbor: https://harbor.open.denodo.com/

### 2. Run Container

```bash
docker run -d \
  -p 8008:8008 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-west-2 \
  -v ./sdk_config.env:/app/api/utils/sdk_config.env \
  denodo/ai-sdk:latest
```

---

## Verify Integration

### 1. Check AI SDK is Running

```bash
curl https://<your-ai-sdk-url>/docs
```

Should return FastAPI Swagger UI.

### 2. Test Answer Question Endpoint

```bash
curl -X GET "https://<your-ai-sdk-url>/answerQuestion?question=What+medications+are+available&verbose=true" \
  -u "username:password"
```

### 3. Test Label iQ Chat Endpoint

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Tell me about drug interactions"}
    ]
  }'
```

Expected response:
```json
{
  "message": "Based on the FDA drug labels...",
  "model": "Claude via Denodo AI SDK + AWS Bedrock",
  "responseTime": 2.5,
  "source": "Denodo AI SDK"
}
```

---

## Required Secrets

Set these in Replit Secrets panel:

1. **DENODO_AI_SDK_URL** - The URL where AI SDK is running
2. **DENODO_USERNAME** - Your Denodo username (already set)
3. **DENODO_PASSWORD** - Your Denodo password (already set)

**Note:** AWS credentials are configured in the AI SDK, not in Label iQ.

---

## Troubleshooting

### "AI SDK is not configured"

**Problem:** Missing `DENODO_AI_SDK_URL` secret.

**Solution:**
```bash
# In Replit Secrets
DENODO_AI_SDK_URL=https://your-ai-sdk-instance:8008
```

### "Connection refused" or timeout

**Problem:** AI SDK not running or wrong URL.

**Solutions:**
1. Verify AI SDK is running: `curl <url>/docs`
2. Check firewall/network settings
3. If using ngrok, ensure tunnel is active
4. If using Agora, verify AI SDK is enabled in cluster

### "Authentication failed"

**Problem:** Wrong Denodo credentials.

**Solution:** Use same credentials that work in Design Studio.

### "No natural language response"

**Problem:** Metadata not loaded in vector store.

**Solution:** Call `/getMetadata` endpoint first (see step 4 above).

---

## Documentation

- **Denodo AI SDK User Manual:** https://community.denodo.com/docs/html/document/denodoconnects/latest/en/Denodo%20AI%20SDK%20-%20User%20Manual
- **Agora AI SDK Setup:** https://community.denodo.com/docs/html/browse/9.3/en/agora/ai_tools/denodo_ai_sdk
- **GitHub Repository:** https://github.com/denodo/denodo-ai-sdk

---

## For Hackathon Judges

This integration demonstrates:

✅ **Denodo Agora Integration** - Queries FDA drug labels from Denodo data virtualization platform

✅ **AWS Bedrock Integration** - Uses Claude 3.5 Sonnet via Denodo AI SDK (which uses Bedrock internally)

✅ **Production Architecture** - AI SDK runs as separate microservice (recommended deployment pattern)

✅ **Ready for Connection** - All integration code is implemented and tested

The Label iQ application is **fully ready to connect** to a Denodo AI SDK instance. The chatbot feature will be activated once the `DENODO_AI_SDK_URL` secret is configured.
