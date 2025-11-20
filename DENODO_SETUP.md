# Denodo Agora Integration Guide

## Overview

Label iQ can now query FDA drug label data directly from your Denodo Agora instance! This provides:

- ✅ **Live data access** - Query the latest drug information from Denodo's data virtualization platform
- ✅ **Automatic fallback** - Falls back to local files if Denodo is unavailable
- ✅ **Seamless integration** - No code changes needed, just add credentials

---

## Connection Details

Your Denodo Agora account:
- **Server**: `https://8a97baaf-b5a1-44d1-ac75-8b5a41603e03.c1a1.agora.denodo.com`
- **Database**: `jl_verboomen`
- **Username**: `jl.verboomen@massiveinsights.com`

---

## Setup Instructions

### 1. Add Secrets to Replit

Click the **🔒 Secrets** tab in Replit (lock icon in left sidebar), then add:

```
DENODO_BASE_URL=https://8a97baaf-b5a1-44d1-ac75-8b5a41603e03.c1a1.agora.denodo.com/denodo-restfulws
DENODO_USERNAME=jl.verboomen@massiveinsights.com
DENODO_PASSWORD=your_denodo_password
DENODO_DATABASE=jl_verboomen
```

### 2. Restart the Application

After adding secrets, restart the workflow to connect to Denodo.

---

## Denodo Data Schema

Label iQ expects a view/table in your `jl_verboomen` database with this structure:

### Default View Name: `fda_drug_labels`

**Required Fields:**

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `label_id` | String | Unique identifier | `"drug-001"` |
| `drug_name` | String | Drug name | `"HUMIRA (adalimumab)"` |
| `label_text` | Text/CLOB | Full FDA label text | `"HIGHLIGHTS OF PRESCRIBING..."` |
| `snapshot_date` | String/Date | Label snapshot date | `"2024-11-19"` |
| `logo_path` | String (optional) | Path to drug logo | `"/drug-logos/HUMIRA_LOGO.svg"` |

**Alternative Field Names** (automatically detected):
- `label_id` or `labelId`
- `drug_name` or `drugName` or `name`
- `label_text` or `labelText` or `prescribing_information`
- `snapshot_date` or `snapshotDate`
- `logo_path` or `logoPath`

### Custom View Name

If your view has a different name, update `server/denodo.ts`:

```typescript
// Change this line:
await denodoClient.getDrugIndex('your_custom_view_name');
```

---

## How It Works

1. **On Startup**: Label iQ tests connection to Denodo Agora
2. **Drug List**: Queries Denodo for available drugs (`GET /api/drugs`)
3. **Label Retrieval**: Fetches specific label when user asks question (`POST /api/query`)
4. **Automatic Fallback**: Uses local files if Denodo query fails

**Console Output:**
```
✅ Connected to Denodo Agora successfully
[Data Source] Fetching drug index from Denodo Agora...
[Data Source] ✅ Loaded 25 drugs from Denodo
```

---

## Testing the Connection

### Option 1: Check Server Logs

Look for:
```
✅ Connected to Denodo Agora successfully
[Data Source] ✅ Loaded 25 drugs from Denodo
```

### Option 2: Use Label iQ

1. Open Label iQ in browser
2. Select a drug from dropdown
3. Ask a question
4. Check console for: `[Data Source] ✅ Loaded {drug} from Denodo`

---

## Troubleshooting

### Connection Failed

**Error**: `Denodo connection test failed`

**Solutions**:
1. ✅ Verify `DENODO_BASE_URL` ends with `/denodo-restfulws`
2. ✅ Check username/password are correct
3. ✅ Confirm database name is `jl_verboomen`
4. ✅ Test Denodo login at Design Studio first

### View Not Found

**Error**: `View fda_drug_labels not found`

**Solutions**:
1. Open Denodo Design Studio
2. Check view name in `jl_verboomen` database
3. Update view name in `server/denodo.ts` if different

### Field Mapping Issues

**Error**: Drug names show as "Unknown Drug"

**Solutions**:
1. Verify field names match expected schema
2. Update field mapping in `server/denodo.ts`:

```typescript
// Adjust these lines to match your schema:
drugName: row.drug_name || row.drugName || row.name
labelText: row.label_text || row.labelText || row.prescribing_information
```

---

## REST API Reference

Denodo REST API endpoints used:

```bash
# List all drugs
GET https://{server}/denodo-restfulws/{database}/views/{view_name}

# Get specific drug
GET https://{server}/denodo-restfulws/{database}/views/{view_name}?$filter=label_id eq 'drug-001'
```

**Authentication**: HTTP Basic Auth (Base64 encoded username:password)

---

## Next Steps

Once connected to Denodo, you can:

1. **Query Multiple Data Sources**: Join FDA labels with clinical trials, pricing, real-world evidence
2. **Live Updates**: Labels automatically refresh when updated in Denodo
3. **Scale**: Handle thousands of drugs without local storage
4. **Enrich Answers**: Combine label data with other healthcare data sources

---

## Support

- **Denodo Docs**: https://community.denodo.com/docs/html/browse/9.1/en/agora/index
- **REST API Guide**: https://community.denodo.com/docs/html/accessible/9.1/vdp/data_catalog/appendix/rest_api/rest_api.html
- **Label iQ Issues**: Contact development team
