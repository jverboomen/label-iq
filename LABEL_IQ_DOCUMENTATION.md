# Label iQ
## FDA Drug Label AI Assistant

### Denodo Data Virtualization Hackathon 2025
**Team: Massive Insights**

---

## Executive Summary

Label iQ is an AI-powered healthcare application that enables patients, physicians, and judges to query FDA drug label information using natural language. Built for the Denodo Data Virtualization Hackathon 2025, the application demonstrates the power of combining Denodo's data virtualization platform with generative AI to make complex medical information accessible to everyone.

The system integrates Denodo AI SDK with AWS Bedrock (Claude 3.5 Sonnet) to retrieve and synthesize information from FDA drug labels stored in Denodo Agora, a cloud-based data virtualization service.

---

## Problem Statement

FDA drug labels contain critical prescribing information, but they are:

- **Dense and Technical:** Written for healthcare professionals, not patients
- **Scattered Across Multiple Sections:** Information about dosing, interactions, and warnings is spread across lengthy documents
- **Difficult to Query:** Traditional search requires knowing exact terminology
- **Not Personalized:** Same information presented to everyone regardless of their role or needs

Patients often struggle to understand their medications, while healthcare providers spend valuable time searching through documentation.

---

## Solution

Label iQ solves these problems by providing:

1. **Natural Language Interface:** Users ask questions in plain English, like "What is ENTRESTO used for?" or "Does ELIQUIS interact with aspirin?"

2. **AI-Powered Responses:** Claude 3.5 Sonnet generates clear, accurate answers based on official FDA label data

3. **Role-Based Access Control (RBAC):** Different users see different levels of information:
   - Patients receive simplified, safe information
   - Physicians get full clinical details
   - Judges can view the underlying SQL queries

4. **Data Virtualization:** Denodo Agora provides unified access to drug label data without moving or copying the source data

---

## Key Features

### Conversational AI Chatbot
- Natural language question answering
- Multi-turn conversation support
- Real-time streaming responses
- Patient-friendly language transformation

### Interactive Drug Selection
- Visual grid of 14 drug logos
- Click-to-query functionality
- Automatic question generation

### Role-Based Access Control
| Role | Database Views | SQL Visibility | Use Case |
|------|----------------|----------------|----------|
| Patient | 8 of 9 views | Hidden | General public seeking drug information |
| Physician | 9 of 9 views | Hidden | Healthcare providers needing clinical details |
| Judge | 9 of 9 views | Visible | Hackathon judges evaluating the solution |

### Response Metadata
- AI model identification
- Response time tracking
- Tables/views used
- Confidence scoring
- SQL query display (for judges)

### Query History
- Session-based query tracking
- Quick access to previous questions
- Available for judge role

---

## System Architecture

Label iQ uses a five-layer microservice architecture:

### Layer 1: Presentation Layer (Frontend)
- **Technology:** React 18, TypeScript, Vite 5
- **UI Library:** Shadcn/UI with Radix primitives
- **State Management:** TanStack Query v5
- **Styling:** Tailwind CSS with custom FDA-inspired design

### Layer 2: API Layer (Backend)
- **Technology:** Express.js, Node.js 20
- **Validation:** Zod schema validation
- **Security:** RBAC enforcement, input sanitization
- **Communication:** RESTful JSON API over HTTPS

### Layer 3: AI Orchestration Layer
- **Technology:** Denodo AI SDK (Python, FastAPI)
- **Deployment:** AWS EC2 instance
- **Pipeline:** Retrieval Augmented Generation (RAG)
- **Vector Store:** ChromaDB for semantic search

### Layer 4: Large Language Model
- **Model:** Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)
- **Provider:** AWS Bedrock
- **Region:** us-east-1
- **Context Window:** 200,000 tokens

### Layer 5: Data Virtualization Layer
- **Platform:** Denodo Agora (managed cloud service)
- **Database:** labeliq
- **Views:** 9 specialized views for different aspects of drug labels
- **Protocol:** SQL via JDBC with Basic Authentication

---

## Data Model

The application accesses 9 virtualized database views in Denodo Agora:

| View Name | Description | Patient Access |
|-----------|-------------|----------------|
| drug_purpose_and_identity | Basic drug information and indications | Yes |
| clinical_pharmacology | Mechanism of action and pharmacokinetics | Yes |
| dosing_and_administration | Dosage instructions and routes | Yes |
| interactions | Drug-drug and drug-food interactions | Yes |
| overdose_emergency | Overdose symptoms and treatment | Yes |
| product_and_label_index | Label metadata and indexing | Yes |
| specific_population | Pediatric, geriatric, pregnancy information | Yes |
| storage_and_handling | Storage requirements and disposal | Yes |
| master_safety_risk | Technical risk assessments | No (Physician/Judge only) |

---

## Available Drug Labels

The system contains FDA label information for 14 drugs:

1. Biktarvy
2. ELIQUIS
3. ELIQUIS 30-DAY STARTER PACK
4. ENBREL
5. ENTRESTO
6. FARXIGA
7. HUMIRA
8. IBRANCE
9. Imbruvica
10. JAKAFI
11. JANUVIA
12. JARDIANCE
13. Lantus
14. Linzess

---

## How It Works

### Step 1: User Authentication
User selects their role (Patient, Physician, or Judge) and enters the corresponding password. The system assigns appropriate access permissions.

### Step 2: Question Input
User types a natural language question about a drug, or clicks a drug logo to auto-populate a question.

### Step 3: API Request
The frontend sends the question to the Express.js backend along with the user's role information.

### Step 4: RBAC Enforcement
The backend determines which database views the user can access based on their role and prepares the allowed views list.

### Step 5: AI SDK Query
The backend forwards the question to the Denodo AI SDK running on AWS EC2, including the user's credentials and allowed views.

### Step 6: RAG Pipeline
The Denodo AI SDK:
- Decomposes the question into sub-queries
- Searches the ChromaDB vector store for relevant data
- Generates SQL queries against Denodo Agora
- Retrieves matching data from the virtualized views
- Sends the data and question to Claude 3.5 Sonnet

### Step 7: LLM Response
Claude 3.5 Sonnet synthesizes the retrieved data into a natural language response tailored to the user's needs.

### Step 8: Post-Processing
The backend:
- Validates that only allowed views were accessed
- Transforms technical language for patient users
- Adds disclaimers if restricted data was included
- Formats the response with metadata

### Step 9: Display
The frontend displays the response with:
- The AI-generated answer
- Detected drug logos
- Response time
- Tables used (if physician/judge)
- SQL query (if judge)

---

## Security Features

### Transport Security
- TLS 1.3 encryption on all connections
- HTTPS for frontend-to-backend communication
- Secure WebSocket for real-time updates

### Input Validation
- Zod schema validation on all API endpoints
- SQL injection prevention through parameterized queries
- XSS protection through React's built-in escaping

### Access Control
- Role-based view filtering at application level
- Post-response validation of accessed tables
- Credential isolation between application and AI SDK

### Secret Management
- Environment variables for sensitive configuration
- No hardcoded credentials in source code
- Separate credentials for different services

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | Component-based UI framework |
| TypeScript | Type-safe JavaScript |
| Vite 5 | Build tool and dev server |
| TanStack Query v5 | Server state management |
| Shadcn/UI | Accessible component library |
| Tailwind CSS | Utility-first styling |
| Wouter | Lightweight routing |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | JavaScript runtime |
| Express.js | Web framework |
| TypeScript | Type-safe JavaScript |
| Zod | Schema validation |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Denodo AI SDK | RAG pipeline orchestration |
| AWS Bedrock | LLM hosting |
| Claude 3.5 Sonnet | Large language model |
| ChromaDB | Vector embeddings store |

### Data
| Technology | Purpose |
|------------|---------|
| Denodo Agora | Data virtualization platform |
| PostgreSQL | Session storage (configured) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| AWS EC2 | AI SDK hosting |
| Replit | Application hosting |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Average Response Time | ~45-60 seconds |
| LLM Context Window | 200,000 tokens |
| Number of Drug Labels | 14 |
| Number of Database Views | 9 |
| User Roles | 3 |

Note: Response time reflects the comprehensive RAG pipeline processing, including query decomposition, vector search, SQL generation, data retrieval from Denodo Agora, and LLM response synthesis.

---

## Architecture Decisions

### Why Denodo AI SDK as a Separate Microservice?
- **Production Pattern:** Follows best practices for scalable AI applications
- **Dependency Isolation:** Manages 200+ Python packages independently
- **Credential Separation:** AWS Bedrock credentials stay with AI SDK
- **Reusability:** AI SDK can serve multiple applications

### Why Application-Level RBAC?
- **Agora Limitation:** Managed service doesn't support VQL CREATE USER
- **Common Pattern:** Standard approach in production healthcare applications
- **Flexibility:** Allows fine-grained control over view access
- **Validation:** Post-response checking of tables_used metadata

### Why Claude 3.5 Sonnet?
- **Medical Accuracy:** Strong performance on healthcare content
- **Large Context:** 200K tokens handles complex drug labels
- **Speed:** Fast inference for real-time chat experience
- **Safety:** Built-in content filtering for medical information

---

## Future Enhancements

1. **User Authentication:** Replace demo passwords with secure authentication
2. **Conversation History:** Persist chat sessions across logins
3. **Drug Comparisons:** Compare multiple drugs side-by-side
4. **Personalization:** Tailor responses based on user medical history
5. **Multi-language:** Support for Spanish and other languages
6. **Voice Interface:** Speech-to-text input for accessibility
7. **Mobile App:** Native iOS and Android applications

---

## Conclusion

Label iQ demonstrates how Denodo's data virtualization technology, combined with modern AI capabilities, can transform access to critical healthcare information. By providing a natural language interface to FDA drug labels with role-based access control, the application makes complex medical information accessible to patients while maintaining the detailed clinical data that healthcare providers need.

The microservice architecture ensures scalability and maintainability, while the security features protect sensitive medical information. This prototype serves as a foundation for production healthcare applications that leverage data virtualization and generative AI.

---

## Contact

**Team:** Massive Insights
**Event:** Denodo Data Virtualization Hackathon 2025

---

*Document Version: 1.0*
*Last Updated: December 2024*
