# Denodo AI SDK Prompt Configuration

This document details the internal prompts used by the Denodo AI SDK to translate natural language questions into VQL (Virtual Query Language) queries.

## Overview

The Denodo AI SDK uses a series of specialized prompts to:
1. Parse user questions
2. Generate valid VQL queries
3. Fix query errors
4. Review query correctness

## Core Prompts

### 1. VQL_RULES - Query Syntax Rules

The SDK enforces strict VQL syntax rules:

**Table/Column Naming:**
```sql
-- Tables must use format: "database_name"."table_name"
SELECT "CustomerID" FROM "labeliq"."dv_drug_purpose_and_identity"

-- Column names must be wrapped in double quotes
SELECT "product_name", "indication_description" FROM "labeliq"."dv_drug_purpose_and_identity"
```

**Supported CAST Types:**
- BOOL, CHAR, DECIMAL, FLOAT, FLOAT4, FLOAT8
- INT2, INT4, INT8, INTEGER, REAL, TEXT, VARCHAR

**String Functions:**
- `SUBSTR(string, start_index, length)` - Index starts at 1
- `CONCAT(str1, str2, ...)` - Joins strings
- `LEN(string)` - Returns length
- `POSITION(needle IN haystack)` - Finds substring position

**Important Restrictions:**
- LIMIT/FETCH only allowed in main query (not subqueries or CTEs)
- Subqueries not allowed in HAVING clauses
- NULLS LAST is invalid in ORDER BY
- Aggregate functions in ORDER BY must use aliases

### 2. DATES_VQL - Date Handling

**Converting Text to Date:**
```sql
-- Use TO_TIMESTAMPTZ (TO_DATE is deprecated)
TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-01-01')
```

**Date Filtering Examples:**
```sql
-- Filter by date range
WHERE "payment_date" BETWEEN 
    TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-01-01') AND 
    TO_TIMESTAMPTZ('yyyy-MM-dd', '2023-12-31')

-- Filter last 3 months
WHERE "payment_date" BETWEEN ADDMONTH(NOW(), -3) AND NOW()
```

**Date Modification Functions:**
- `ADDDAY(date, days)`
- `ADDMONTH(date, months)`
- `ADDYEAR(date, years)`
- `ADDWEEK(date, weeks)`
- `ADDHOUR(date, hours)`
- `ADDMINUTE(date, minutes)`
- `ADDSECOND(date, seconds)`

**Date Extraction Functions:**
- `GETDAY(date)`, `GETMONTH(date)`, `GETYEAR(date)`
- `GETDAYOFWEEK(date)`, `GETDAYOFYEAR(date)`
- `GETHOUR(date)`, `GETMINUTE(date)`, `GETSECOND(date)`
- `GETQUARTER(date)`, `GETWEEK(date)`
- `GETDAYSBETWEEN(date1, date2)`, `GETMONTHSBETWEEN(date1, date2)`

### 3. ARITHMETIC_VQL - Math Operations

**Arithmetic Functions:**
```sql
-- Multiplication
MULT(x, y)

-- Division
DIV(dividend, divisor)

-- Standard Deviation
STDEV(column)
```

**Type Casting for Precision:**
```sql
-- Integer division loses decimals
SELECT DIV(4, 100)  -- Returns 0

-- Cast to FLOAT for precision
SELECT DIV(CAST(4 AS FLOAT), CAST(100 AS FLOAT))  -- Returns 0.04
```

**Division by Zero Protection:**
```sql
-- Always check for zero before dividing
CASE 
    WHEN "units_sold" != 0 THEN "revenue" / "units_sold"
    ELSE NULL 
END AS "price_per_unit"
```

### 4. QUERY_TO_VQL - Query Generation Prompt

This is the main prompt that translates natural language to VQL:

**Process:**
1. Receives user question
2. Analyzes available schema
3. Breaks down query requirements in `<thoughts>` tags
4. Identifies filter/JOIN conditions in `<conditions>` tags
5. Generates VQL in `<vql>` tags

**Key Instructions:**
- Use exact table/database names from schema
- If schema lacks needed tables/columns, explain why
- Return `<vql>None</vql>` if query cannot be generated
- Use sample data to understand column formats
- Generate only a SINGLE VQL query per request

### 5. QUERY_FIXER - Error Correction Prompt

When a query fails, this prompt analyzes and fixes it:

**Input:**
- Failed VQL query
- Error message
- Original thought process
- Schema information

**Output:**
- Analysis of why the query failed (in `<thoughts>` tags)
- Fixed VQL query (in `<vql>` tags)

### 6. QUERY_REVIEWER - Query Validation Prompt

Reviews generated queries for correctness before execution.

## Label iQ Database Schema

The AI SDK queries these 9 views in the `labeliq` database:

| View Name | Description |
|-----------|-------------|
| `dv_drug_purpose_and_identity` | Drug indications and basic info |
| `dv_clinical_pharmacology` | How the drug works |
| `dv_dosing_and_administration` | Dosage instructions |
| `dv_interactions` | Drug-drug and drug-food interactions |
| `dv_master_safety_risk` | Technical risk assessments (restricted) |
| `dv_overdose_emergency` | Emergency treatment info |
| `dv_product_and_label_index` | Label metadata |
| `dv_specific_population` | Pediatric, geriatric, pregnancy info |
| `dv_storage_and_handling` | Storage requirements |

## Example Query Flow

**User Question:** "What is ENTRESTO used for?"

**SDK Process:**
1. Parse question → identify drug name "ENTRESTO"
2. Identify relevant view → `dv_drug_purpose_and_identity`
3. Generate VQL:
```sql
SELECT DISTINCT "indication_description"
FROM "labeliq"."dv_drug_purpose_and_identity"
WHERE UPPER("product_description") LIKE '%ENTRESTO%';
```
4. Execute query against Denodo Agora
5. Send results to Claude 3.5 Sonnet for natural language response

## Custom Instructions

The SDK supports `CUSTOM_INSTRUCTIONS` in the configuration, allowing:
- Additional VQL restrictions
- Domain-specific query patterns
- Custom response formatting rules

For Label iQ, custom instructions could include:
- Healthcare terminology handling
- Patient-friendly response requirements
- Medical disclaimer requirements

## Security Considerations

- All queries are parameterized to prevent SQL injection
- Table access can be restricted via the `tables` parameter
- Credentials are isolated in the AI SDK service
- TLS encryption on all connections
