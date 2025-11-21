# Denodo RBAC Implementation Guide for Label iQ

## Overview

This document explains how Label iQ implements role-based access control (RBAC) for the hackathon demonstration.

### ⚠️ Demo Mode: Honor System Role Selection

**Important Limitation for Prototype:**
- Role selection is **NOT authenticated** - users select their own role (honor system)
- This is acceptable for hackathon demonstration but **NOT production-ready**
- Production implementation would require:
  - Authenticated user sessions with server-side role storage
  - Database-backed user accounts with assigned roles  
  - Session tokens preventing client-side role tampering

**What This Demo Successfully Demonstrates:**
- ✅ Server-side RBAC enforcement architecture (validation logic ready for production)
- ✅ Fail-closed security model (denies access when verification fails)
- ✅ Proper error handling with descriptive "Access Denied" messages
- ✅ Three distinct roles with different database view permissions
- ✅ Complete audit logging of all access decisions
- ✅ Production-ready validation - only needs authenticated session layer added

## ⚠️ Important: Denodo Agora Managed Service Limitations

**Denodo Agora** (managed cloud service) does **NOT** support custom role creation via VQL scripts. The error message is:
```
Role creation is not supported in managed service mode
```

### Current Implementation (Agora-Compatible)

For the **hackathon demo**, Label iQ uses an **application-level RBAC approach with response validation**:
- ✅ **All three roles use the same Denodo credentials** (`DENODO_USERNAME` and `DENODO_PASSWORD`)
- ✅ **View-level filtering enforced via response validation** - backend checks which views were queried and rejects unauthorized access
- ✅ **Patient role: 8 views** (excludes `master_safety_risk`)
- ✅ **Physician/Judge roles: All 9 views**
- ✅ **Access denied errors** shown when patients try to access restricted data requiring clinical interpretation
- ✅ **No database configuration required** - works out of the box with Agora
- ✅ **True RBAC functionality** demonstrated through server-side enforcement

**How it works (Fail-Closed Security with State Protection):**
1. Frontend sends user's role (patient/physician/judge) with each query
2. Backend defines which views each role can access
3. Backend sends `tables` parameter to Denodo AI SDK (hint for optimization)
4. **Backend validates response** using fail-closed security with state flag protection:
   - Promise uses `settled` state flag to prevent double-settlement
   - If `tables_used` metadata is missing → SET `settled=true`, REJECT with "Access Denied"
   - If any unauthorized views were queried → SET `settled=true`, REJECT with "Access Denied" + specific views
   - If all queried views are authorized → SET `settled=true`, ALLOW response
   - Guards prevent resolve() after reject() has been called
5. Only verified-safe responses are returned to the user
6. All RBAC decisions logged for security audit trail
7. HTTP 403 errors returned to frontend for access violations

This allows you to demonstrate true role-based access control during the hackathon without needing Denodo support to configure custom database users.

## Architecture

```
┌──────────────────┐
│   Label iQ       │
│   Frontend       │
│  (Role Select)   │
└────────┬─────────┘
         │ userRole: "patient" | "physician" | "judge"
         ▼
┌──────────────────┐
│   Label iQ       │
│   Backend        │  getDenodoCredentialsByRole()
│  (Routes.ts)     │  ────────────────────────────┐
└────────┬─────────┘                              │
         │                                        ▼
         │                         ┌──────────────────────────┐
         │                         │ Role-Specific Credentials│
         │                         ├──────────────────────────┤
         │                         │ patient   → patient_user │
         │                         │ physician → physician_user│
         │                         │ judge     → judge_user   │
         │                         └──────────┬───────────────┘
         ▼                                    │
┌──────────────────┐                         │
│  Denodo AI SDK   │◄────────────────────────┘
│  (External)      │  Uses role-specific credentials
└────────┬─────────┘  for authentication
         │
         ▼
┌──────────────────┐
│  Denodo VDP      │
│  (jl_verboomen)  │  Enforces view-level permissions
│                  │  based on authenticated user
├──────────────────┤
│ patient_user:    │  ✓ Access to 8 views
│   - drug_purpose_and_identity
│   - clinical_pharmacology
│   - dosing_and_administration
│   - interactions
│   - overdose_emergency
│   - product_and_label_index
│   - specific_population
│   - storage_and_handling
│   ✗ master_safety_risk (DENIED)
├──────────────────┤
│ physician_user:  │  ✓ Access to all 9 views
│ judge_user:      │  ✓ Access to all 9 views
└──────────────────┘
```

## Implementation Details

### 1. Denodo VDP Configuration

**File:** `DENODO_RBAC_SETUP.sql`

This VQL script creates:
- Three roles: `patient_role`, `physician_role`, `judge_role`
- Three users: `patient_user`, `physician_user`, `judge_user`
- View-level EXECUTE permissions for each role

**Key difference:**
- Patient role is granted EXECUTE on only 8 views (excludes `master_safety_risk`)
- Physician and Judge roles are granted EXECUTE on all 9 views

### 2. Backend Credential Selection

**File:** `server/bedrock.ts`

```typescript
export function getDenodoCredentialsByRole(userRole: string): { username: string; password: string } {
  switch (userRole) {
    case 'patient':
      return {
        username: process.env.DENODO_PATIENT_USERNAME,
        password: process.env.DENODO_PATIENT_PASSWORD
      };
    case 'physician':
      return {
        username: process.env.DENODO_PHYSICIAN_USERNAME,
        password: process.env.DENODO_PHYSICIAN_PASSWORD
      };
    case 'judge':
      return {
        username: process.env.DENODO_JUDGE_USERNAME,
        password: process.env.DENODO_JUDGE_PASSWORD
      };
  }
}
```

### 3. API Request Flow

**File:** `server/routes.ts`

```typescript
// Extract user role from frontend
const { messages, userRole } = validation.data;

// Get role-specific credentials
const roleCredentials = getDenodoCredentialsByRole(userRole || 'judge');

// Call Denodo AI SDK with role-specific credentials
const response = await chatWithDenodoAI(
  messages,
  "jl_verboomen",
  roleCredentials  // Enforces RBAC at Denodo VDP level
);
```

### 4. Frontend Role Selection

**File:** `client/src/pages/home.tsx`

- User selects role from dropdown during login
- Role is stored in component state
- Role is sent with every chat API request
- SQL visibility controlled based on role (only Judge can unlock SQL)

## Security Benefits

1. **Database-Level Enforcement:** Permissions enforced by Denodo VDP, not application code
2. **Principle of Least Privilege:** Each role has exactly the permissions needed
3. **Credential Isolation:** Role credentials stored securely in Replit Secrets
4. **Audit Trail:** Backend logs which Denodo user is being used for each request
5. **Defense in Depth:** SQL visibility also controlled on frontend as secondary protection

## Setup Steps

1. **Run VQL Script in Denodo VDP:**
   ```bash
   # In Denodo VDP Administration Tool
   # File → Execute VQL statements
   # Paste contents of DENODO_RBAC_SETUP.sql
   # Execute
   ```

2. **Add Credentials to Replit Secrets:**
   - DENODO_PATIENT_USERNAME
   - DENODO_PATIENT_PASSWORD
   - DENODO_PHYSICIAN_USERNAME
   - DENODO_PHYSICIAN_PASSWORD
   - DENODO_JUDGE_USERNAME
   - DENODO_JUDGE_PASSWORD

3. **Restart Label iQ Application:**
   - Backend will automatically use role-specific credentials
   - No code changes needed

## Testing

### Test Patient Access (Restricted)

1. Log in to Label iQ as Patient role
2. Ask: "What are the safety risks of LIPITOR?"
3. Expected: Response will not include data from `master_safety_risk` view
4. Backend logs should show: `Using Denodo credentials for: patient_user`

### Test Physician Access (Full)

1. Log in to Label iQ as Physician role
2. Ask: "What are the safety risks of LIPITOR?"
3. Expected: Response includes all available data including safety risks
4. SQL query button should NOT appear (frontend control)
5. Backend logs should show: `Using Denodo credentials for: physician_user`

### Test Judge Access (Full + SQL)

1. Log in to Label iQ as Judge role
2. Ask: "What are the safety risks of LIPITOR?"
3. Expected: Response includes all available data
4. SQL query button appears (can unlock with password "denodo")
5. Backend logs should show: `Using Denodo credentials for: judge_user`

## Troubleshooting

**Problem:** Patient still sees restricted data

**Possible causes:**
1. VQL script not executed in Denodo VDP
2. Incorrect credentials in Replit Secrets
3. Denodo AI SDK using cached metadata (restart AI SDK)

**Solution:**
1. Verify users exist: `SELECT * FROM GET_USERS();` in Denodo VDP
2. Verify permissions: `CALL CATALOG_PERMISSIONS('patient_role', NULL);`
3. Check backend logs for credential usage
4. Restart Denodo AI SDK to refresh metadata

## Production Considerations

1. **Change Passwords:** The demo passwords in the SQL script should be changed for production
2. **User Management:** Consider integrating with enterprise identity provider (LDAP/SAML)
3. **Audit Logging:** Enable Denodo VDP audit logging for compliance
4. **Connection Pooling:** Use connection pooling for role-specific credentials
5. **Credential Rotation:** Implement regular password rotation policy

## References

- Denodo VDP Documentation: [Fine-Grained Privileges at View Level](https://community.denodo.com/docs/html/browse/8.0/en/vdp/administration/databases_users_and_access_rights_in_virtual_dataport/fine_grain_view_privileges/fine_grain_view_privileges)
- Label iQ Secrets Configuration: See Replit Secrets panel
- Backend Implementation: `server/bedrock.ts`, `server/routes.ts`
