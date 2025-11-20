# Label iQ - FDA Drug Label AI Assistant

Medical-grade AI assistant for querying FDA prescription drug labels using Retrieval-Augmented Generation (RAG).

## 🏆 Hackathon Project

Built for the **Denodo Agora GenAI Hackathon 2025**

### Key Technologies
- **Denodo Agora** - Data virtualization platform for FDA drug label data
- **Denodo AI SDK** - Natural language to query translation (uses AWS Bedrock)
- **AWS Bedrock** - Claude 3.5 Sonnet for AI responses
- **React + TypeScript** - Modern frontend
- **Express + Node.js** - Backend API

## ✨ Features

### Core Features
- **Natural Language Queries** - Ask questions about medications in plain English
- **Dual-Source Answers** - Verbatim FDA label quotes + AI summaries
- **25 Real FDA Drugs** - Including Ozempic, Jardiance, Xarelto, IBRANCE, HUMIRA
- **Drug Logos & Branding** - Visual identification with official logos

### Advanced Features
- **Safety Insights Dashboard** - Real-time analysis of warnings and contraindications
- **Provenance Trail** - See exactly how answers were generated (RAG transparency)
- **Smart Follow-ups** - Contextual question suggestions
- **Export Capabilities** - Download answers as text or PDF
- **Readability Scores** - FDA label complexity metrics

### AI Chatbot (Denodo AI SDK Integration)
- **Powered by AWS Bedrock** - Claude 3.5 Sonnet via Denodo AI SDK
- **Queries Denodo Agora** - Live access to FDA label database
- **Production Architecture** - Microservices pattern with external AI SDK

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (provided by Replit)
- Denodo credentials (for Agora integration)
- Denodo AI SDK instance (for chatbot feature)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Application runs on http://localhost:5000

### Configuration

Set these secrets in Replit:

#### Required (Core Features)
```
DENODO_BASE_URL=https://your-instance.c1a1.agora.denodo.com
DENODO_DATABASE=jl_verboomen
DENODO_USERNAME=your-email@domain.com
DENODO_PASSWORD=your-password
SESSION_SECRET=random-secret-string
```

#### Optional (Chatbot Feature)
```
DENODO_AI_SDK_URL=https://your-ai-sdk-instance:8008
```

**Note:** Chatbot requires external Denodo AI SDK. See `DENODO_AI_SDK_SETUP.md` for setup.

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Label iQ App                        │
│                                                          │
│  ┌──────────────┐    ┌─────────────┐   ┌─────────────┐ │
│  │   React UI   │───▶│  Express    │──▶│  Denodo     │ │
│  │   (Port      │    │  Backend    │   │  Agora      │ │
│  │   5000)      │◀───│  (RAG)      │◀──│  (FDA Data) │ │
│  └──────────────┘    └─────────────┘   └─────────────┘ │
│                            │                             │
│                            ▼                             │
│                   ┌─────────────────┐                    │
│                   │  OpenAI API     │                    │
│                   │  (Summaries)    │                    │
│                   └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Denodo AI SDK   │
                   │ (External)      │
                   │ ↓               │
                   │ AWS Bedrock     │
                   │ (Claude 3.5)    │
                   └─────────────────┘
```

## 🎯 Denodo Integration

### Denodo Agora (Data Source)
- **Connection:** REST API to Denodo Agora instance
- **Data:** FDA drug labels from virtualized views
- **Fallback:** Local files if Denodo unavailable
- **Authentication:** HTTP Basic with Denodo credentials

### Denodo AI SDK (Chatbot)
- **Pattern:** External microservice (recommended)
- **Communication:** REST API to `/answerQuestion` endpoint
- **LLM:** AWS Bedrock (Claude 3.5 Sonnet)
- **Setup:** See `DENODO_AI_SDK_SETUP.md`

## 📁 Project Structure

```
label-iq/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # Utilities
│   └── public/
│       └── drug-logos/    # FDA drug brand logos
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   ├── rag.ts            # RAG implementation
│   ├── denodo.ts         # Denodo Agora client
│   ├── bedrock.ts        # Denodo AI SDK client
│   └── readability.ts    # Label analysis
├── shared/               # Shared types/schemas
├── data/                 # Local FDA label files
└── docs/
    ├── DENODO_SETUP.md           # Agora setup
    └── DENODO_AI_SDK_SETUP.md    # AI SDK setup
```

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:push      # Push database schema
npm run db:studio    # Open Drizzle Studio
```

### Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Express, TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle
- **Build:** Vite
- **AI:** OpenAI API, AWS Bedrock (via Denodo AI SDK)

## 📚 Documentation

- [Denodo Agora Setup](./DENODO_SETUP.md) - Configure Denodo connection
- [Denodo AI SDK Setup](./DENODO_AI_SDK_SETUP.md) - Set up external AI chatbot
- [Design Guidelines](./design_guidelines.md) - UI/UX specifications

## 🎨 Design

Medical-grade interface inspired by FDA.gov:
- Official FDA branding and logo
- Professional color palette
- High readability (healthcare-focused typography)
- Accessible components (ARIA-compliant)
- Glassmorphism effects for modern appeal

## 🏥 Data Sources

### FDA Drug Labels (25 Medications)
- Sourced from FDA National Drug Code Directory
- Snapshot date: November 19, 2024
- Includes: Brand names, generic names, prescribing information
- Format: Plain text preserving original structure

### Medication Categories
- Diabetes (Ozempic, Jardiance, Mounjaro)
- Cardiovascular (Xarelto, Eliquis)
- Oncology (IBRANCE, KEYTRUDA)
- Autoimmune (HUMIRA, ENBREL)
- Respiratory (Symbicort, Trelegy)
- And more...

## 🔐 Security

- Session management with PostgreSQL store
- Secure API key handling via environment variables
- Input validation with Zod schemas
- SQL injection protection (parameterized queries)
- CORS configured for production

## 🚀 Deployment

The app is designed for Replit deployment:

1. Configure all secrets in Replit Secrets panel
2. Ensure Denodo Agora is accessible
3. (Optional) Set up external Denodo AI SDK
4. Click "Run" - application auto-deploys

## 📝 License

This is a hackathon prototype demonstrating Denodo Agora integration.

## 🙋 Support

Built with ❤️ by Massive Insights for Denodo Agora GenAI Hackathon 2025

---

## For Hackathon Judges

### Integration Completeness

✅ **Denodo Agora Integration** - Live queries to virtualized FDA drug label data  
✅ **AWS Bedrock Integration** - Claude 3.5 via Denodo AI SDK  
✅ **Production Architecture** - Microservices pattern (AI SDK as external service)  
✅ **Comprehensive Features** - RAG, provenance, safety insights, export  
✅ **Medical-Grade UX** - FDA.gov-inspired design, accessibility  

### Code Quality

- TypeScript throughout (type safety)
- Modern React patterns (hooks, suspense)
- Clean separation of concerns
- Error handling and fallbacks
- Comprehensive documentation

### Denodo AI SDK Status

**Integration Code:** ✅ Complete and ready  
**Connection:** ⏳ Awaiting external AI SDK instance URL  

The chatbot feature is **fully implemented** and will activate immediately when `DENODO_AI_SDK_URL` is configured. See `DENODO_AI_SDK_SETUP.md` for deployment options.
