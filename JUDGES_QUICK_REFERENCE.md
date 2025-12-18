# Label iQ - Quick Reference Guide for Judges

## Login Credentials

| Role | Password | Access Level |
|------|----------|--------------|
| Patient | `patient` | 8 of 9 database views |
| Physician | `physician` | All 9 database views |
| **Judge** | `judge` | All 9 views + SQL query visibility |

**Username:** Any value (e.g., "judge1")

**Note:** Passwords are case-sensitive (use lowercase)

---

## Recommended Test Flow

### 1. Login as Judge
- Username: `judge1`
- Password: `judge`
- Role: Select "Judge"

### 2. Try These Sample Questions

**Basic Drug Info:**
> "What is ENTRESTO used for?"

**Dosing Question:**
> "What is the recommended dose for JARDIANCE?"

**Safety Question:**
> "What are the side effects of HUMIRA?"

**Interaction Question:**
> "Does ELIQUIS interact with aspirin?"

### 3. Features to Notice

- **Drug Logo Grid:** Click any logo to auto-populate a question
- **SQL Query Panel:** Judges can view the generated SQL (click to reveal)
- **Response Metadata:** Shows model name, response time, tables used
- **Query History Sidebar:** Only visible to Judge role

---

## Architecture Diagram

View the technical architecture at:
```
/architecture-diagram.html
```

---

## Key Technical Highlights

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Backend | Express.js + Node.js 20 |
| AI | Denodo AI SDK + Claude 3.5 Sonnet |
| Data | Denodo Agora (9 virtualized views) |
| LLM | AWS Bedrock (us-east-1) |

---

## RBAC Demo

Try logging in as different roles to see access control in action:

1. **As Patient:** Notice `master_safety_risk` view is excluded
2. **As Physician:** Full access but SQL queries hidden
3. **As Judge:** Full access + SQL query visibility

---

## Available Drug Labels (14 Total)

Biktarvy, ELIQUIS, ENBREL, ENTRESTO, FARXIGA, HUMIRA, IBRANCE, Imbruvica, JAKAFI, JANUVIA, JARDIANCE, Lantus, Linzess

---

## Team

**Massive Insights** - Denodo Hackathon 2025
