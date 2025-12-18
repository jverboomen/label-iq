# Label iQ - System Architecture

## Architecture Diagram

```
                             ┌────────────────────────────────────┐
                             │            End Users               │
                             │  • Patient  • Physician  • Judge   │
                             └────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Frontend (React / Vite SPA)                                                  │
│ • Chatbot UI (Message history, patient-friendly responses)                   │
│ • Drug logo grid (14 FDA-approved medications)                               │
│ • Role selector (Patient / Physician / Judge)                                │
│ • TanStack Query fetches → /api/chat                                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                             │ POST /api/chat (messages, role)
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Backend (Express.js + TypeScript)                                            │
│ • Validates request via Zod                                                  │
│ • Enforces RBAC: getAllowedViewsForRole(role)                                │
│   ▸ Patient → 8 views (excludes master_safety_risk)                          │
│   ▸ Physician & Judge → all 9 views                                          │
│ • Injects allowed view list + credentials into Denodo AI payload             │
│ • Post-response filter: warns patients if restricted data accessed           │
└──────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Denodo AI SDK (AWS EC2: 3.233.215.121:8008)                                  │
│ • Receives question, role view list, credentials                             │
│ • Orchestrates Retrieval-Augmented Generation (RAG) workflow                 │
│ • Vector search for relevant FDA drug label views                            │
│ • Calls AWS Bedrock for LLM responses                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ AWS Bedrock – Claude 3.5 Sonnet                                              │
│ • Generates natural-language answer from FDA label data                      │
│ • Returns metadata (LLM time, tokens, tables_used, SQL query)                │
└──────────────────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Denodo Agora (labeliq database)                                              │
│ • Data virtualization platform                                               │
│ • Virtualizes FDA SPL (Structured Product Labeling) data                     │
│ • Exposes 9 semantic views:                                                  │
│   1) dv_drug_purpose_and_identity    2) dv_clinical_pharmacology             │
│   3) dv_dosing_and_administration    4) dv_interactions                      │
│   5) dv_master_safety_risk           6) dv_overdose_emergency                │
│   7) dv_product_and_label_index      8) dv_specific_population               │
│   9) dv_storage_and_handling                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

```

## Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RBAC View Access Matrix                              │
├─────────────────────────────────┬───────────┬─────────────┬─────────────────┤
│ View                            │  Patient  │  Physician  │     Judge       │
├─────────────────────────────────┼───────────┼─────────────┼─────────────────┤
│ drug_purpose_and_identity       │    ✅     │     ✅      │      ✅         │
│ clinical_pharmacology           │    ✅     │     ✅      │      ✅         │
│ dosing_and_administration       │    ✅     │     ✅      │      ✅         │
│ interactions                    │    ✅     │     ✅      │      ✅         │
│ master_safety_risk              │    ❌     │     ✅      │      ✅         │
│ overdose_emergency              │    ✅     │     ✅      │      ✅         │
│ product_and_label_index         │    ✅     │     ✅      │      ✅         │
│ specific_population             │    ✅     │     ✅      │      ✅         │
│ storage_and_handling            │    ✅     │     ✅      │      ✅         │
├─────────────────────────────────┼───────────┼─────────────┼─────────────────┤
│ SQL Query Visibility            │    ❌     │     ❌      │      ✅         │
└─────────────────────────────────┴───────────┴─────────────┴─────────────────┘
```

## Data Flow

1. **User selects role** (Patient/Physician/Judge) and asks a drug question
2. **Frontend** sends message to `/api/chat` with role information
3. **Backend** determines allowed views based on role (RBAC)
4. **Denodo AI SDK** receives filtered view list and queries the LLM
5. **AWS Bedrock (Claude 3.5)** generates natural language response
6. **Denodo Agora** provides virtualized FDA drug label data
7. **Response** includes answer, SQL query (judges only), tables used, confidence

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, TailwindCSS, Shadcn UI |
| Backend | Express.js, TypeScript, Zod |
| AI/LLM | AWS Bedrock (Claude 3.5 Sonnet) |
| AI Orchestration | Denodo AI SDK (RAG pipeline) |
| Data Platform | Denodo Agora (Data Virtualization) |
| Hosting | Replit (App), AWS EC2 (AI SDK) |

## Key Features

- **Natural Language Queries**: Ask questions about FDA drug labels in plain English
- **Role-Based Access Control**: Different access levels for patients, physicians, and judges
- **Patient-Friendly Responses**: Technical medical information translated to everyday language
- **Real-Time Metadata**: Shows response time, confidence, and data sources
- **Interactive Drug Grid**: Click on drug logos to start asking questions
