# Label iQ - Medical Information Query System

## Overview

Label iQ is a healthcare-focused web application that enables users to query FDA drug labels using natural language questions. The system retrieves verbatim evidence from official drug labels and generates plain-language summaries, maintaining medical-grade accuracy and trustworthiness. The application is built with a modern full-stack TypeScript architecture, emphasizing clarity, professional restraint, and evidence-based information delivery.

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
- Form management with React Hook Form and Zod validation
- Toast notifications for user feedback
- Single-page application with focused user flow: drug selection → question input → evidence display

**State Management Strategy:**
- React Query handles all server state with configured stale-time and refetch policies
- Local component state for form inputs and UI interactions
- No global client-side state management needed due to simple data flow

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- TypeScript throughout for type safety
- Custom middleware for request logging and JSON body parsing with raw body preservation

**API Design:**
RESTful endpoints structured around three core operations:
1. `/api/drugs` - Returns drug index for dropdown population
2. `/api/readability` - Provides pre-calculated readability metrics for all labels
3. `/api/query` - Accepts drug selection and question, returns evidence and summary

**RAG (Retrieval-Augmented Generation) Implementation:**
The system implements a custom RAG pipeline in `server/rag.ts`:
- Text chunking with configurable chunk size (1500 characters) and overlap (200 characters)
- Keyword-based relevance scoring for chunk retrieval
- Integration with OpenAI API for natural language processing
- Verbatim quote extraction from FDA labels
- Plain-language summary generation (120-160 words)
- Source attribution and medical disclaimers

**Readability Analysis:**
Implemented in `server/readability.ts` to provide transparency about label complexity:
- Flesch Reading Ease score calculation
- Flesch-Kincaid Grade Level assessment
- SMOG (Simple Measure of Gobbledygook) index
- Composite readability score (0-100 scale)
- Pre-calculated metrics cached in memory

**Data Storage Strategy:**
- **Primary**: Denodo Agora data virtualization platform (when configured)
  - REST API integration via `server/denodo.ts`
  - Queries `jl_verboomen` database for FDA drug labels
  - HTTP Basic authentication with secure credential management
  - Real-time data access to centralized healthcare data sources
- **Fallback**: File-based storage for FDA drug labels (`data/labels/*.txt`)
  - JSON index file (`data/drug-index.json`) for drug metadata
  - Automatic fallback when Denodo credentials not configured
  - In-memory caching of drug index and readability scores
- Label loading on-demand per query

**Rationale:** Denodo Agora integration enables Label iQ to query live FDA label data from a centralized data virtualization platform, supporting the hackathon goal of demonstrating integration with Denodo's data federation capabilities. The system gracefully falls back to local files for development and demos without Denodo access.

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