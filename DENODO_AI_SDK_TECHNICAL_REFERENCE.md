# Denodo AI SDK Technical Reference

## Document Information

| Field | Value |
|-------|-------|
| Project | Label iQ - FDA Drug Label AI Assistant |
| Author | Massive Insights |
| Date | December 2024 |
| Version | 1.0 |

---

## 1. Executive Summary

The Denodo AI SDK translates natural language questions into Virtual Query Language (VQL) queries, enabling conversational access to virtualized data sources. This document provides a technical reference for the prompt engineering and query generation rules used by the SDK.

---

## 2. Architecture Overview

The Denodo AI SDK operates as a middleware service between the user interface and the Denodo data virtualization platform:

```
User Question → AI SDK → VQL Query → Denodo Agora → Query Results → LLM Response
```

**Components:**
- **Natural Language Parser**: Interprets user questions
- **Schema Analyzer**: Maps questions to database views
- **VQL Generator**: Creates syntactically correct queries
- **Query Executor**: Runs queries against Denodo
- **Response Synthesizer**: Formats results using Claude 3.5 Sonnet

---

## 3. VQL Generation Rules

The SDK enforces strict VQL syntax rules to ensure query validity.

### 3.1 Table and Column Naming

All table and column names must be wrapped in double quotes using the format `"database_name"."table_name"`.

**Correct:**
```sql
SELECT "CustomerID" FROM "labeliq"."dv_drug_purpose_and_identity"
```

**Incorrect:**
```sql
SELECT CustomerID FROM labeliq.dv_drug_purpose_and_identity
```

For JOIN operations, table aliases must also be quoted:

```sql
SELECT 
    "c"."CustomerID", 
    "o"."OrderID"
FROM 
    "labeliq"."Clients" c
JOIN 
    "labeliq"."Orders" o
ON 
    "c"."CustomerID" = "o"."CustomerID"
```

### 3.2 Data Type Casting

Supported CAST types in VQL:
- BOOL
- CHAR
- DECIMAL
- FLOAT, FLOAT4, FLOAT8
- INT2, INT4, INT8, INTEGER
- REAL
- TEXT
- VARCHAR

**Example:**
```sql
SELECT CAST("quantity" AS INT2) FROM "organization"."hardware_bv"
```

### 3.3 String Operations

| Function | Description | Example |
|----------|-------------|---------|
| Single quotes for literals | String values | `WHERE name = 'Joseph'` |
| Escape quotes | Double the quote | `'D''angelo'` matches "D'angelo" |
| SUBSTR(string, start, length) | Extract substring (1-indexed) | `SUBSTR('Artificial', 2, 5)` → 'rtifi' |
| CONCAT(str1, str2, ...) | Join strings | `CONCAT(GETYEAR(date), '-', GETMONTH(date))` |
| LEN(string) | String length | `LEN('Denodo')` → 6 |
| POSITION(needle IN haystack) | Find substring | `POSITION('no' IN 'Denodo')` → 3 |

### 3.4 Query Restrictions

| Restriction | Description |
|-------------|-------------|
| LIMIT/FETCH | Only allowed in main query, not subqueries or CTEs |
| HAVING clauses | No subqueries allowed within HAVING |
| ORDER BY | NULLS LAST is invalid; aggregate functions must use aliases |
| Reserved words | Cannot use BASE, DF, NOS, OBL, WS as aliases |

---

## 4. Date and Time Functions

### 4.1 Date Conversion

Use `TO_TIMESTAMPTZ` to convert text to date (TO_DATE is deprecated):

```sql
TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-01-01')
```

### 4.2 Date Filtering Examples

**Filter by date range:**
```sql
WHERE "payment_date" BETWEEN 
    TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-01-01') AND 
    TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-12-31')
```

**Filter last 3 months:**
```sql
WHERE "payment_date" BETWEEN ADDMONTH(NOW(), -3) AND NOW()
```

### 4.3 Date Modification Functions

| Function | Description |
|----------|-------------|
| ADDDAY(date, days) | Add/subtract days |
| ADDWEEK(date, weeks) | Add/subtract weeks |
| ADDMONTH(date, months) | Add/subtract months |
| ADDYEAR(date, years) | Add/subtract years |
| ADDHOUR(date, hours) | Add/subtract hours |
| ADDMINUTE(date, minutes) | Add/subtract minutes |
| ADDSECOND(date, seconds) | Add/subtract seconds |

### 4.4 Date Extraction Functions

| Function | Returns |
|----------|---------|
| GETDAY(date) | Day of month (1-31) |
| GETMONTH(date) | Month (1-12) |
| GETYEAR(date) | Year |
| GETDAYOFWEEK(date) | Day of week |
| GETDAYOFYEAR(date) | Day of year (1-366) |
| GETHOUR(date) | Hour (0-23) |
| GETMINUTE(date) | Minute (0-59) |
| GETSECOND(date) | Second (0-59) |
| GETQUARTER(date) | Quarter (1-4) |
| GETWEEK(date) | Week of year |
| GETDAYSBETWEEN(date1, date2) | Days between dates |
| GETMONTHSBETWEEN(date1, date2) | Months between dates |

---

## 5. Arithmetic Operations

### 5.1 Basic Functions

| Function | Description |
|----------|-------------|
| MULT(x, y) | Multiplication |
| DIV(dividend, divisor) | Division |
| STDEV(column) | Standard deviation |

### 5.2 Type Precision

Integer operations return integers, losing decimal precision. Cast to FLOAT for percentages:

```sql
-- Returns 0 (integer division)
SELECT DIV(4, 100)

-- Returns 0.04 (float division)
SELECT DIV(CAST(4 AS FLOAT), CAST(100 AS FLOAT))
```

### 5.3 Division by Zero Protection

Always include zero-check conditions:

```sql
CASE 
    WHEN "units_sold" IS NOT NULL AND "units_sold" != 0 
    THEN "revenue" / "units_sold"
    ELSE NULL 
END AS "price_per_unit"
```

---

## 6. Query Generation Process

The SDK uses a multi-step process to generate VQL queries:

### Step 1: Question Analysis
The system analyzes the user's natural language question to identify:
- Target entities (e.g., drug names)
- Requested information type (e.g., indications, dosing)
- Any filtering criteria

### Step 2: Schema Mapping
The relevant database views are identified based on the question type:

| Question Type | Primary View |
|--------------|--------------|
| Drug purpose/indications | dv_drug_purpose_and_identity |
| How drug works | dv_clinical_pharmacology |
| Dosing instructions | dv_dosing_and_administration |
| Drug interactions | dv_interactions |
| Safety risks | dv_master_safety_risk |
| Overdose treatment | dv_overdose_emergency |
| Label metadata | dv_product_and_label_index |
| Special populations | dv_specific_population |
| Storage requirements | dv_storage_and_handling |

### Step 3: VQL Generation
The system generates VQL using this structured approach:

1. **Thoughts**: Break down query requirements
2. **Conditions**: Identify filter and JOIN conditions
3. **VQL**: Generate the final query

### Step 4: Query Execution
The VQL query is executed against Denodo Agora via JDBC.

### Step 5: Response Synthesis
Query results are passed to Claude 3.5 Sonnet to generate a natural language response.

---

## 7. Error Handling

### 7.1 Query Fixer

When a query fails, the SDK analyzes the error and attempts automatic correction:

**Input:**
- Failed VQL query
- Error message
- Original reasoning
- Schema information

**Output:**
- Analysis of failure cause
- Corrected VQL query

### 7.2 Common Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| Syntax error | Missing quotes | Add double quotes to table/column names |
| Invalid LIMIT | LIMIT in subquery | Move LIMIT to main query |
| Division by zero | No zero check | Add CASE WHEN condition |
| Type mismatch | Wrong data type | Use CAST function |

---

## 8. Label iQ Database Schema

The Label iQ application queries 9 virtualized views in Denodo Agora:

| View | Description | Patient Access |
|------|-------------|----------------|
| dv_drug_purpose_and_identity | Drug indications and basic info | Yes |
| dv_clinical_pharmacology | Mechanism of action | Yes |
| dv_dosing_and_administration | Dosage instructions | Yes |
| dv_interactions | Drug-drug/drug-food interactions | Yes |
| dv_overdose_emergency | Emergency treatment | Yes |
| dv_product_and_label_index | Label metadata | Yes |
| dv_specific_population | Pediatric/geriatric/pregnancy | Yes |
| dv_storage_and_handling | Storage requirements | Yes |
| dv_master_safety_risk | Technical risk assessments | No (Restricted) |

---

## 9. Example Query Flow

**User Question:** "What is ENTRESTO used for?"

**Step 1 - Schema Analysis:**
```
Target: ENTRESTO
Information needed: Drug purpose/indications
Relevant view: dv_drug_purpose_and_identity
```

**Step 2 - Generated VQL:**
```sql
SELECT DISTINCT "indication_description"
FROM "labeliq"."dv_drug_purpose_and_identity"
WHERE UPPER("product_description") LIKE '%ENTRESTO%';
```

**Step 3 - Query Results:**
```
indication_description: "ENTRESTO is indicated to reduce the risk of 
cardiovascular death and hospitalization for heart failure in patients 
with chronic heart failure..."
```

**Step 4 - Natural Language Response:**
```
ENTRESTO is used to treat chronic heart failure in adults. It helps:
• Reduce the risk of cardiovascular death
• Lower hospitalization rates for heart failure
• Improve heart function in patients with reduced ejection fraction
...
```

---

## 10. Security Considerations

| Security Feature | Implementation |
|-----------------|----------------|
| Query Parameterization | Prevents SQL injection |
| Table Restrictions | Limits accessible views via API parameter |
| Credential Isolation | Separate credentials for app and AI SDK |
| TLS Encryption | All connections use TLS 1.3 |
| Response Validation | Post-query validation of accessed tables |

---

## 11. Glossary

| Term | Definition |
|------|------------|
| VQL | Virtual Query Language - Denodo's SQL-like query language |
| CTE | Common Table Expression - WITH clause subquery |
| Denodo Agora | Denodo's cloud-based data virtualization platform |
| AI SDK | Denodo's AI Software Development Kit for natural language querying |
| ChromaDB | Vector database used for semantic search |
| RAG | Retrieval-Augmented Generation - AI technique combining search with LLM |

---

*Document prepared for Denodo Data Virtualization Hackathon 2025*
