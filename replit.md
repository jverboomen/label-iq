# Label iQ - FDA Drug Label AI Assistant

## Overview

Label iQ is a healthcare-focused hackathon prototype that demonstrates integration with Denodo AI SDK for querying FDA drug labels using natural language. The application features a conversational AI chatbot powered by AWS Bedrock (Claude 3.5 Sonnet) that retrieves information from Denodo Agora database. Built with a modern full-stack TypeScript architecture, emphasizing FDA branding, medical-grade UI design, and real-time AI model metadata display.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for component-based UI development
- Vite as the build tool and development server
- TanStack Query (React Query) for server state management and data fetching
- Wouter for lightweight client-side routing
- Tailwind CSS with custom design system for styling

**Design Philosophy:**
The frontend follows FDA.gov's official government website design, featuring authentic FDA branding (official logo in blue header) to establish trust and authority. The design prioritizes medical-grade readability and professional restraint following `design_guidelines.md`, with custom Tailwind configuration using healthcare-specific spacing, typography, and FDA color tokens.

**Component Architecture:**
- Shadcn UI component library (New York style variant) provides accessible, customizable primitives
- Path aliases (`@/`, `@shared/`) for clean imports and separation of concerns
- Simple chatbot interface with message history
- Real-time display of AI model metadata and response times
- Eye-catching animations for hackathon demo (gradient backgrounds, floating icons, pulsing glows)

**User Interface:**
- **Simplified Single-Page Chatbot:** Users interact ONLY through the Denodo AI chatbot
- **No Custom RAG:** Removed drug selector, question forms, and custom evidence display
- **Denodo AI SDK Integration:** All information comes from Denodo AI SDK external service
- **Interactive Drug Logo Grid:** Welcome screen displays all 14 drug logos in a responsive grid (3 columns mobile, 5 columns desktop). Clicking a logo pre-fills a drug-specific query in the chat input. Logos served from `public/drug-logos/` directory.
  - **Custom Questions:** 9 drugs use targeted "What is X used for?" questions for better AI responses: ENTRESTO, FARXIGA, JARDIANCE, JANUVIA, JAKAFI, HUMIRA, IBRANCE, ELIQUIS, Linzess
  - **Generic Questions:** 5 drugs use "Tell me about X": Biktarvy, ELIQUIS 30-DAY STARTER PACK, ENBREL, Imbruvica, Lantus
  - **Drug Name Case Sensitivity:** Mixed case for Biktarvy, Imbruvica, Lantus, Linzess; UPPERCASE for all other 10 drugs
- **Role-Based Access Control (RBAC) - Demo Mode:** Three account types with application-level view filtering
  - **Judge:** Full access to all 9 database views + SQL query visibility (password-protected with "denodo")
  - **Physician:** Full access to all 9 database views, SQL queries hidden
  - **Patient:** Intended access to 8 of 9 views (excludes `master_safety_risk` - technical risk assessments), SQL queries hidden, UI shows "Patient View" badge
  - **Rationale:** Patients can access basic drug information including dosing/administration instructions, but complex safety risk assessments should be reviewed with a healthcare provider
  - **Demo Limitation:** Role selection uses honor system (user selects role) - not authenticated
  - **Implementation:** Server-side RBAC validation with disclaimer system. Since Denodo AI SDK treats table restrictions as suggestions (not hard constraints), the backend validates `tables_used` metadata after response. When restricted tables are accessed, the response is shown with a clear disclaimer advising patients to consult their healthcare provider. This balances security with usability - patients get helpful information while being informed when technical data was included. All roles use same Denodo credentials (`DENODO_USERNAME`/`DENODO_PASSWORD`) due to Denodo Agora managed service limitations (custom role creation not supported). Production would add authenticated session layer. Defaults to "patient" role for safer demo security posture.

**State Management Strategy:**
- React Query handles chatbot API requests
- Local component state for chat messages and input
- Functional state updaters to prevent race conditions in multi-turn conversations

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- TypeScript throughout for type safety
- Custom middleware for request logging and JSON body parsing with raw body preservation

**API Design:**
Primary endpoint for chatbot integration:
- `/api/chat` - Accepts conversation history, queries Denodo AI SDK, returns AI response with metadata

**Denodo AI SDK Integration:**
The application queries an external Denodo AI SDK microservice:
- **Architecture:** Label iQ → Denodo AI SDK (external) → AWS Bedrock Claude 3.5 Sonnet → ChromaDB → Denodo Agora
- **Communication:** HTTP REST API to external AI SDK service
- **Configuration:** External AI SDK URL via `DENODO_AI_SDK_URL` secret
- **Features:**
  - Multi-turn conversation support with smart drug name extraction
  - Backend extracts drug names from previous messages and appends to follow-ups for context
  - Patient-friendly response filtering: Detects and replaces technical database schema responses with helpful guidance
  - All error messages use everyday language (no technical jargon like "Denodo instance" or "SDK")
  - Comprehensive logging for debugging
  - Security: TLS certificate bypass scoped only to Denodo HTTPS agent (not global)
  - Response includes: answer text, model name (e.g., "claude-3-5-sonnet-20241022"), response time

**Rationale:** Using external Denodo AI SDK as a separate microservice follows production-ready architecture patterns recommended by Denodo documentation. The AI SDK manages its own dependencies (200+ Python packages), Bedrock credentials, and can serve multiple applications.

**Legacy Components (Not Used in Current UI):**
- `server/rag.ts` - Custom RAG pipeline (removed from UI per user request)
- `server/readability.ts` - Label readability analysis (not displayed)
- `server/denodo.ts` - Direct Denodo Agora REST API (view not published, falls back to local files)
- `/api/drugs` and `/api/readability` endpoints - Not used in simplified chatbot UI

### AI Chatbot Architecture

**Integration Pattern:** Denodo AI SDK (External Microservice)
- **Deployment:** AI SDK runs as separate service (recommended production pattern)
- **Communication:** Label iQ → Denodo AI SDK REST API → AWS Bedrock → Claude 3.5 Sonnet
- **Data Source:** AI SDK queries Denodo Agora for FDA label metadata
- **Configuration:** External AI SDK instance URL provided via `DENODO_AI_SDK_URL` secret

**Why External:**
- Production-ready architecture (microservices pattern)
- AI SDK manages its own dependencies (200+ Python packages)
- Bedrock credentials isolated to AI SDK service
- Scalable: AI SDK can serve multiple applications
- Recommended by Denodo documentation for Agora deployments

**Setup Guide:** See `DENODO_AI_SDK_SETUP.md` for complete instructions

**Denodo Integration Details:**
- Connection managed via environment secrets (DENODO_BASE_URL, DENODO_USERNAME, DENODO_PASSWORD, DENODO_DATABASE)
- Expected view schema: `fda_drug_labels` with fields: `label_id`, `drug_name`, `label_text`, `snapshot_date`, `logo_path`
- Flexible field name mapping supports alternative column names
- Automatic connection testing on server startup
- Comprehensive logging for debugging data source selection
- See `DENODO_SETUP.md` for detailed configuration guide

### Development and Build System

**Build Process:**
- Vite handles frontend bundling with React plugin
- esbuild compiles backend TypeScript to ESM format
- Separate build outputs: `dist/public` for frontend, `dist` for backend
- Development mode uses Vite middleware for HMR

**Development Tools:**
- Replit-specific plugins for error overlay, cartographer, and dev banner
- TypeScript strict mode enabled throughout
- Path resolution configured for consistent imports

### External Dependencies

**AI/ML Services:**
- OpenAI API via Replit AI Integrations service
  - No API key management required (billed to Replit credits)
  - Base URL and credentials injected via environment variables
  - Used for: Evidence extraction, natural language understanding, summary generation

**Database:**
- PostgreSQL (via Neon serverless) configured but not actively used
  - Drizzle ORM setup present in configuration
  - Schema defined in `shared/schema.ts`
  - Migration support via drizzle-kit
  - Future consideration: May be needed for user session storage, query history, or analytics

**Rationale:** Database infrastructure is provisioned but not utilized in current implementation. The decision allows for future expansion (user accounts, query history, feedback collection) without architectural changes.

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
  - Accordion, Dialog, Select, Toast, and 20+ other primitives
  - ARIA-compliant implementations
  - Keyboard navigation support

**Styling Framework:**
- Tailwind CSS v3 with custom configuration
  - Custom color system with HSL variables
  - Healthcare-specific design tokens
  - PostCSS for processing

**Type Safety:**
- Zod for runtime validation and type inference
  - Shared schemas between client and server (`shared/schema.ts`)
  - DrugLabel, QueryRequest, QueryResponse types
  - Form validation via @hookform/resolvers

**Data Sources:**
- FDA drug labels stored as text files
  - Manual snapshots dated 2024-11-19
  - Mix of major brand-name drugs (Lipitor, Symbicort, etc.) and generics
  - Plain text format preserving original prescribing information structure

**Session Management:**
- connect-pg-simple for PostgreSQL session store (configured but not actively used)
- Express session handling configured for future authentication