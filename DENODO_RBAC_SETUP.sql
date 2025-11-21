-- ============================================================================
-- Denodo VDP Role-Based Access Control Setup for Label iQ
-- ============================================================================
-- This script creates three roles with different view-level permissions:
--   1. patient_role: Access to 8 of 9 views (excludes master_safety_risk)
--   2. physician_role: Access to all 9 views
--   3. judge_role: Access to all 9 views (same as physician for data access)
--
-- Run this script in Denodo VDP Administration Tool or via VQL shell
-- Requires: Admin privileges on the jl_verboomen database
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Create Roles
-- ----------------------------------------------------------------------------

CREATE ROLE patient_role;
CREATE ROLE physician_role;
CREATE ROLE judge_role;


-- ----------------------------------------------------------------------------
-- STEP 2: Grant Database Connection Privileges
-- ----------------------------------------------------------------------------
-- All roles need CONNECT and METADATA privileges on the database

GRANT CONNECT ON jl_verboomen TO patient_role;
GRANT METADATA ON jl_verboomen TO patient_role;

GRANT CONNECT ON jl_verboomen TO physician_role;
GRANT METADATA ON jl_verboomen TO physician_role;

GRANT CONNECT ON jl_verboomen TO judge_role;
GRANT METADATA ON jl_verboomen TO judge_role;


-- ----------------------------------------------------------------------------
-- STEP 3: Grant View-Level EXECUTE Privileges
-- ----------------------------------------------------------------------------

-- PATIENT ROLE: Access to 8 views only (excludes master_safety_risk)
-- These views are considered safe for patient self-service access
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.drug_purpose_and_identity;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.clinical_pharmacology;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.dosing_and_administration;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.interactions;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.overdose_emergency;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.product_and_label_index;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.specific_population;
ALTER ROLE patient_role GRANT EXECUTE ON jl_verboomen.storage_and_handling;
-- EXCLUDED: master_safety_risk (contains detailed safety data requiring clinical interpretation)

-- PHYSICIAN ROLE: Access to all 9 views
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.drug_purpose_and_identity;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.clinical_pharmacology;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.dosing_and_administration;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.interactions;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.master_safety_risk;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.overdose_emergency;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.product_and_label_index;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.specific_population;
ALTER ROLE physician_role GRANT EXECUTE ON jl_verboomen.storage_and_handling;

-- JUDGE ROLE: Access to all 9 views (same as physician for hackathon demo)
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.drug_purpose_and_identity;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.clinical_pharmacology;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.dosing_and_administration;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.interactions;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.master_safety_risk;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.overdose_emergency;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.product_and_label_index;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.specific_population;
ALTER ROLE judge_role GRANT EXECUTE ON jl_verboomen.storage_and_handling;


-- ----------------------------------------------------------------------------
-- STEP 4: Create Users and Assign Roles
-- ----------------------------------------------------------------------------
-- IMPORTANT: Change these passwords before running in production!
-- For hackathon demo, these are placeholder passwords.

CREATE USER patient_user 'patient_demo_2025' GRANT ROLE patient_role;
CREATE USER physician_user 'physician_demo_2025' GRANT ROLE physician_role;
CREATE USER judge_user 'judge_demo_2025' GRANT ROLE judge_role;


-- ----------------------------------------------------------------------------
-- STEP 5: Verification Queries (Optional)
-- ----------------------------------------------------------------------------
-- Run these as admin to verify the setup

-- View all roles and their privileges
-- CALL CATALOG_PERMISSIONS('patient_role', NULL);
-- CALL CATALOG_PERMISSIONS('physician_role', NULL);
-- CALL CATALOG_PERMISSIONS('judge_role', NULL);

-- List all users
-- SELECT * FROM GET_USERS();

-- List all views in database
-- SELECT * FROM GET_VIEWS() WHERE database_name = 'jl_verboomen';


-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- After running this script:
-- 1. Note the usernames and passwords created above
-- 2. Add them to Replit Secrets in Label iQ:
--      DENODO_PATIENT_USERNAME=patient_user
--      DENODO_PATIENT_PASSWORD=patient_demo_2025
--      DENODO_PHYSICIAN_USERNAME=physician_user
--      DENODO_PHYSICIAN_PASSWORD=physician_demo_2025
--      DENODO_JUDGE_USERNAME=judge_user
--      DENODO_JUDGE_PASSWORD=judge_demo_2025
-- 3. Label iQ backend will automatically use role-specific credentials
--
-- TEST ACCESS:
-- Log into Denodo VDP as each user and verify they can only query allowed views
-- ============================================================================
