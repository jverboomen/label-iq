# Label iQ - Development Process Documentation

## End-to-End Workflow

This document describes the complete process used to build Label iQ, from initial concept to final deployment.

---

## Phase 1: Requirements Analysis

### 1.1 Problem Definition
- Identified that FDA drug labels are difficult for patients to understand
- Recognized the need for role-based access (patients vs. physicians)
- Determined that natural language queries would improve accessibility

### 1.2 Use Case Development
| User Role | Primary Need | Solution |
|-----------|--------------|----------|
| Patient | Simple drug information | Filtered views, plain language responses |
| Physician | Complete clinical details | Full access to all 9 database views |
| Judge | Evaluate implementation | SQL query visibility, metadata display |

### 1.3 Technology Selection
- **Frontend:** React + TypeScript for type-safe, component-based UI
- **Backend:** Express.js for lightweight API layer
- **AI:** Denodo AI SDK with AWS Bedrock (Claude 3.5 Sonnet)
- **Data:** Denodo Agora for data virtualization

---

## Phase 2: Data Modeling

### 2.1 Source Data Analysis
Analyzed FDA Structured Product Labeling (SPL) documents to identify:
- Drug identification fields
- Clinical pharmacology sections
- Dosing and administration guidelines
- Drug interaction information
- Safety and risk data

### 2.2 Denodo View Design
Created 9 specialized views in Denodo Agora to organize drug label information:

| View | Purpose | Fields |
|------|---------|--------|
| drug_purpose_and_identity | Basic drug info | drug_name, indications, description |
| clinical_pharmacology | Mechanism of action | pharmacodynamics, pharmacokinetics |
| dosing_and_administration | Dosage info | recommended_dose, route, frequency |
| interactions | Drug interactions | interacting_drugs, severity, mechanism |
| overdose_emergency | Emergency info | symptoms, treatment, antidote |
| product_and_label_index | Metadata | ndc_code, manufacturer, revision_date |
| specific_population | Special populations | pediatric, geriatric, pregnancy |
| storage_and_handling | Storage requirements | temperature, light, disposal |
| master_safety_risk | Risk assessments | black_box_warnings, contraindications |

### 2.3 Data Loading Process
1. Collected FDA drug labels for 14 major medications
2. Parsed SPL XML documents into structured fields
3. Loaded data into source database
4. Created Denodo views to virtualize the data
5. Published views to Denodo Agora

---

## Phase 3: Security Design

### 3.1 Role-Based Access Control (RBAC)
Designed three-tier access model:

```
┌─────────────────────────────────────────────────────────────┐
│                    RBAC Permission Matrix                    │
├─────────────┬─────────────────────────┬─────────────────────┤
│ Role        │ Database Views          │ SQL Visibility      │
├─────────────┼─────────────────────────┼─────────────────────┤
│ Patient     │ 8 of 9 views            │ Hidden              │
│             │ (excludes safety_risk)  │                     │
├─────────────┼─────────────────────────┼─────────────────────┤
│ Physician   │ All 9 views             │ Hidden              │
├─────────────┼─────────────────────────┼─────────────────────┤
│ Judge       │ All 9 views             │ Visible             │
└─────────────┴─────────────────────────┴─────────────────────┘
```

### 3.2 Security Implementation
- **Authentication:** Password-based role selection (demo mode)
- **Authorization:** Server-side view filtering before AI SDK queries
- **Validation:** Post-response checking of `tables_used` metadata
- **Disclaimer:** Automatic disclaimers when restricted data accessed

### 3.3 Design Decision: Application-Level RBAC
**Why not database-level RBAC?**
- Denodo Agora (managed service) doesn't support VQL CREATE USER
- Application-level RBAC is standard practice in healthcare applications
- Allows flexible, fine-grained permission management
- Enables post-response validation for additional security

---

## Phase 4: AI Integration

### 4.1 Denodo AI SDK Configuration
Selected external microservice architecture:

```
Label iQ App → Denodo AI SDK → AWS Bedrock → Denodo Agora
   (Replit)      (EC2)         (Claude 3.5)    (Database)
```

**Rationale:**
- Production-ready pattern recommended by Denodo
- Isolates 200+ Python dependencies
- Separates AWS credentials from main application
- Enables AI SDK reuse across multiple applications

### 4.2 RAG Pipeline Setup
1. **Metadata Ingestion:** AI SDK loaded Denodo view metadata into ChromaDB
2. **Vector Embeddings:** Used Amazon Titan for semantic search
3. **Query Processing:** AI SDK decomposes questions into sub-queries
4. **SQL Generation:** Automatic SQL generation from natural language
5. **Response Synthesis:** Claude 3.5 Sonnet generates final answers

### 4.3 Multi-Turn Conversation Support
Implemented context preservation for follow-up questions:
- Backend extracts drug names from conversation history
- Appends context to follow-up queries
- Maintains coherent conversation flow

---

## Phase 5: Frontend Development

### 5.1 UI/UX Design Principles
- **FDA Branding:** Official FDA logo and color scheme for trust
- **Medical-Grade Readability:** Large fonts, high contrast, clear hierarchy
- **Accessibility:** ARIA labels, keyboard navigation, screen reader support
- **Responsive Design:** Works on desktop, tablet, and mobile

### 5.2 Component Architecture
```
App
├── LoginPage
│   ├── RoleSelector
│   └── PasswordInput
├── ChatInterface
│   ├── MessageList
│   │   ├── UserMessage
│   │   └── AIResponse
│   ├── DrugLogoGrid
│   └── ChatInput
├── QueryHistory (Judge only)
└── MetadataPanel
    ├── ModelInfo
    ├── ResponseTime
    ├── TablesUsed
    └── SQLQuery (Judge only)
```

### 5.3 Interactive Features
- **Drug Logo Grid:** 14 clickable logos auto-populate queries
- **Real-time Streaming:** Responses stream as they're generated
- **Markdown Rendering:** AI responses with proper formatting
- **Loading States:** Skeleton loaders during API calls

---

## Phase 6: Backend Development

### 6.1 API Design
Single endpoint for chat functionality:

```
POST /api/chat
Request:
{
  "messages": [
    {"role": "user", "content": "What is ENTRESTO used for?"}
  ],
  "role": "patient"
}

Response:
{
  "message": "ENTRESTO is used to treat...",
  "model": "claude-3-5-sonnet-20241022",
  "responseTime": 2.3,
  "tablesUsed": ["drug_purpose_and_identity"],
  "sqlQuery": "SELECT * FROM..."
}
```

### 6.2 Request Processing Flow
1. Receive chat request with role information
2. Validate request using Zod schema
3. Determine allowed views based on role
4. Forward query to Denodo AI SDK
5. Validate response tables against allowed views
6. Transform response for patient-friendly language
7. Add disclaimers if needed
8. Return formatted response with metadata

### 6.3 Error Handling
- Connection timeouts with retry logic
- Graceful degradation for AI SDK unavailability
- User-friendly error messages (no technical jargon)
- Comprehensive logging for debugging

---

## Phase 7: Testing

### 7.1 Functional Testing
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Patient login | Access 8 views | ✅ Pass |
| Physician login | Access 9 views | ✅ Pass |
| Judge login | Access 9 views + SQL | ✅ Pass |
| Drug query | Accurate response | ✅ Pass |
| Follow-up query | Context preserved | ✅ Pass |
| Logo click | Query auto-populated | ✅ Pass |

### 7.2 Security Testing
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Patient accessing master_safety_risk | Blocked or disclaimed | ✅ Pass |
| Invalid password | Login rejected | ✅ Pass |
| SQL injection attempt | Sanitized | ✅ Pass |

### 7.3 Performance Testing
| Metric | Target | Actual |
|--------|--------|--------|
| Response time | < 5s | ~2-3s |
| UI load time | < 2s | < 1s |
| Memory usage | < 512MB | ~256MB |

---

## Phase 8: Deployment

### 8.1 Infrastructure Setup
- **Application Hosting:** Replit (auto-scaling, managed)
- **AI SDK Hosting:** AWS EC2 (dedicated instance)
- **Database:** Denodo Agora (managed cloud service)
- **LLM:** AWS Bedrock (serverless)

### 8.2 Environment Configuration
```
# Replit Secrets
DENODO_AI_SDK_URL=https://[ec2-instance]:8008
DENODO_BASE_URL=https://[agora-instance]
DENODO_USERNAME=[service-account]
DENODO_PASSWORD=[encrypted]
DENODO_DATABASE=labeliq
SESSION_SECRET=[generated]
```

### 8.3 Deployment Process
1. Push code to Replit repository
2. Replit automatically builds and deploys
3. Verify AI SDK connectivity
4. Run smoke tests
5. Publish to production URL

---

## Phase 9: Documentation

### 9.1 Documents Created
| Document | Purpose |
|----------|---------|
| LABEL_IQ_DOCUMENTATION.md | Comprehensive system documentation |
| JUDGES_QUICK_REFERENCE.md | Quick start guide for judges |
| SPEAKER_NOTES.md | Presentation talking points |
| ARCHITECTURE.md | Technical architecture details |
| DENODO_AI_SDK_SETUP.md | AI SDK configuration guide |
| architecture-diagram.html | Visual architecture diagram |

### 9.2 Code Documentation
- TypeScript interfaces for type safety
- JSDoc comments on key functions
- README.md for repository overview

---

## Lessons Learned

### What Worked Well
1. **Denodo AI SDK:** Simplified RAG pipeline implementation
2. **Microservice Architecture:** Clean separation of concerns
3. **Role-Based Access:** Flexible security without database changes
4. **TypeScript:** Caught many errors at compile time

### Challenges Overcome
1. **Agora RBAC Limitation:** Solved with application-level filtering
2. **Multi-turn Context:** Implemented drug name extraction
3. **Technical Response Filtering:** Added patient-friendly transformation
4. **TLS Certificate Issues:** Scoped bypass to Denodo agent only

### Future Improvements
1. Replace demo passwords with secure authentication
2. Add conversation history persistence
3. Implement drug comparison features
4. Add multi-language support
5. Create mobile applications

---

## Timeline Summary

| Week | Phase | Key Activities |
|------|-------|----------------|
| 1-2 | Requirements | Use case development, technology selection |
| 3-4 | Data Modeling | View design, data loading |
| 5-6 | Security | RBAC design, authentication |
| 7-8 | AI Integration | SDK setup, RAG pipeline |
| 9-10 | Frontend | UI development, components |
| 11-12 | Backend | API development, testing |
| 13 | Deployment | Final testing, documentation |

---

## Conclusion

Label iQ demonstrates a complete end-to-end workflow for building an AI-powered healthcare application using Denodo's data virtualization platform. The process emphasized:

- **Data-first approach:** Starting with proper data modeling
- **Security by design:** RBAC built in from the beginning
- **User-centric design:** Different experiences for different roles
- **Production-ready architecture:** Scalable microservice pattern

The documented process provides a replicable template for similar GenAI applications leveraging Denodo Agora.

---

**Team:** Massive Insights  
**Event:** Denodo Data Virtualization Hackathon 2025  
**Document Version:** 1.0  
**Last Updated:** December 2024
