# Label iQ Architecture - Speaker Notes

## Opening (Header)
> "This is Label iQ - an AI-powered FDA drug label assistant built for the Denodo Hackathon 2025. Let me walk you through our five-layer architecture."

---

## 1. User Roles Section
> "We support three distinct user roles with different access levels:
> - **Patients** get simplified, safe information - they can access 8 of our 9 database views
> - **Physicians** get full clinical access to all 9 views
> - **Judges** - that's you - get everything plus visibility into the actual SQL queries being generated
>
> This demonstrates real-world healthcare RBAC - Role-Based Access Control."

---

## 2. Presentation Layer (Frontend)
> "Our frontend is a React single-page application built with TypeScript. 
> 
> Key highlights:
> - **TanStack Query** manages all our server state and caching
> - **Shadcn/UI** gives us accessible, production-ready components
> - The **chat interface** streams responses in real-time
> - **RBAC filtering** hides sensitive UI elements based on your role
>
> The code snippet shows our actual API integration pattern."

---

## 3. Data Flow - Frontend to Backend
> "All communication happens over HTTPS with TLS 1.3 encryption. We POST JSON payloads to our chat endpoint."

---

## 4. API Layer (Express.js)
> "Our Node.js backend handles three critical functions:
> - **Zod validation** sanitizes all input to prevent injection attacks
> - **Session management** tracks user roles
> - **Response filtering** transforms technical content into patient-friendly language
>
> The RBAC matrix shows exactly what each role can access. Notice patients cannot see the `master_safety_risk` view - that contains technical risk assessments meant for healthcare providers."

---

## 5. Data Flow - Backend to Denodo
> "We use Basic Authentication to connect to Denodo, passing an allowed views list that enforces our RBAC policy. The AI SDK translates natural language into SQL."

---

## 6. AI Orchestration Layer (Denodo AI SDK)
> "This is where the magic happens. The Denodo AI SDK runs as a microservice on AWS EC2.
>
> Key capabilities:
> - **RAG** - Retrieval Augmented Generation pipeline
> - **200K token context window** - can handle complex medical documents
> - **Comprehensive processing** - queries take 45-60 seconds due to the thorough RAG pipeline
>
> The SDK uses **query decomposition** to break complex questions into sub-queries, **ChromaDB** for semantic vector search, and **custom prompt engineering** for FDA-specific responses.
>
> Under the hood, it's calling **Claude 3.5 Sonnet** on AWS Bedrock. The response time reflects the quality of the answer - the AI thoroughly searches the database and synthesizes accurate medical information."

---

## 7. Data Virtualization Layer (Denodo Agora)
> "Finally, our data layer - Denodo Agora with our labeliq database.
>
> We have **9 specialized views** covering different aspects of drug labels:
> - Drug identity and purpose
> - Clinical pharmacology  
> - Dosing instructions
> - Drug interactions
> - Safety risks (restricted for patients)
> - Overdose emergencies
> - Product indexing
> - Special populations
> - Storage handling
>
> The yellow note highlights an important architectural decision: since Agora is a managed service, we couldn't create custom database users. So we implemented **app-level RBAC** that validates the `tables_used` metadata after each response. This is actually a common pattern in production healthcare applications."

---

## 8. Architecture Decision Records (Green Panel)
> "We documented our key decisions:
> - **Why Denodo AI SDK?** - Production microservice pattern, manages 200+ Python dependencies, isolates AWS credentials
> - **Why App-Level RBAC?** - Agora's managed service limitations, plus post-response validation
> - **Security** - TLS everywhere, input validation, environment variable secrets"

---

## Closing (Footer Stats)
> "In summary: 14 drug labels, 9 database views, 3 user roles, 5 architectural layers - all working together to make FDA drug information accessible through natural language."

---

## Quick Reference

| Layer | Technology | Key Feature |
|-------|------------|-------------|
| Frontend | React 18 + TypeScript | Real-time chat UI |
| API | Express.js + Zod | RBAC enforcement |
| AI | Denodo AI SDK | RAG pipeline |
| LLM | Claude 3.5 Sonnet | 200K context |
| Data | Denodo Agora | 9 virtualized views |
