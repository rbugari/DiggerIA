-- DIGGERAI PLATFORM v3.1 - FULL DATABASE SCHEMA INITIALIZATION
-- Consolidated Migration Script
-- Date: 2026-01-07

BEGIN;

-- 1. Organizations (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tier TEXT DEFAULT 'FREE', -- FREE, PRO, ENTERPRISE
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Solutions (Projects)
CREATE TABLE IF NOT EXISTS solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path to the ZIP file in Supabase Storage
    status TEXT DEFAULT 'DRAFT', -- DRAFT, QUEUED, PROCESSING, READY, ERROR
    config JSONB DEFAULT '{}', -- Additional config (e.g., ignore patterns)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jobs & Queue System
CREATE TABLE IF NOT EXISTS job_run (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    artifact_id UUID,
    artifact_hash TEXT,
    prompt_version TEXT,
    routing_version TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, running, completed, failed, canceled
    progress_pct INT DEFAULT 0,
    current_stage TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    llm_provider TEXT,
    llm_model TEXT,
    llm_default_model TEXT,
    error_message TEXT,
    error_details JSONB,
    requires_approval BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS job_stage_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_run(job_id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms BIGINT,
    metrics JSONB,
    error JSONB,
    action_name TEXT,
    model_used TEXT,
    fallback_used BOOLEAN DEFAULT FALSE,
    tokens_in INT,
    tokens_out INT,
    total_tokens INT,
    cost_estimate_usd NUMERIC(10,6)
);

CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_run(job_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, processing, failed, completed
    attempts INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ -- For simple locking mechanism
);

-- 4. Evidence & Trust
CREATE TABLE IF NOT EXISTS evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    artifact_id UUID,
    file_path TEXT,
    kind TEXT, -- code, xml, log, config, regex_match
    locator JSONB, -- { line_start, line_end, xpath, ... }
    snippet TEXT,
    hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Operational Catalog
CREATE TABLE IF NOT EXISTS asset (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    project_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    parent_asset_id UUID REFERENCES asset(asset_id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- table, view, file, process, etc.
    name_display TEXT NOT NULL,
    canonical_name TEXT,
    system TEXT,
    tags JSONB,
    owner TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_version (
    asset_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES asset(asset_id) ON DELETE CASCADE,
    artifact_id UUID,
    source_file TEXT,
    hash TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_index (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    from_asset_id UUID NOT NULL REFERENCES asset(asset_id) ON DELETE CASCADE,
    to_asset_id UUID NOT NULL REFERENCES asset(asset_id) ON DELETE CASCADE,
    edge_type TEXT NOT NULL,
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    extractor_id TEXT,
    is_hypothesis BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edge_evidence (
    edge_id UUID NOT NULL REFERENCES edge_index(edge_id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(evidence_id) ON DELETE CASCADE,
    PRIMARY KEY (edge_id, evidence_id)
);

-- 6. v3 Planning Tables
CREATE TABLE IF NOT EXISTS job_plan (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_run(job_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, approved, rejected, superseded
    mode TEXT DEFAULT 'standard', -- low_cost, deep_scan, standard
    summary JSONB DEFAULT '{}', -- { total_files: 10, total_cost: 0.5, ... }
    user_overrides JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_plan_area (
    area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES job_plan(plan_id) ON DELETE CASCADE,
    area_key TEXT NOT NULL, -- FOUNDATION, PACKAGES, AUX
    title TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    default_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_plan_item (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES job_plan(plan_id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES job_plan_area(area_id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    file_hash TEXT,
    size_bytes BIGINT,
    file_type TEXT, -- SQL, DTSX, PY, etc.
    classifier JSONB DEFAULT '{}',
    strategy TEXT,
    recommended_action TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    risk_score INT DEFAULT 0,
    value_score INT DEFAULT 0,
    estimate JSONB DEFAULT '{}',
    planning_notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, skipped
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Job Run to Planning
ALTER TABLE job_run ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES job_plan(plan_id);
ALTER TABLE job_run ADD COLUMN IF NOT EXISTS current_item_id UUID REFERENCES job_plan_item(item_id);

-- 7. Auditing System
CREATE TABLE IF NOT EXISTS file_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_run(job_id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_hash TEXT,
    action_name TEXT NOT NULL, 
    strategy_used TEXT, 
    model_provider TEXT, 
    model_used TEXT, 
    fallback_used BOOLEAN DEFAULT FALSE,
    fallback_chain TEXT[], 
    status TEXT NOT NULL, 
    input_tokens INT,
    output_tokens INT,
    total_tokens INT,
    latency_ms BIGINT,
    cost_estimate_usd NUMERIC(10,6),
    error_type TEXT, 
    error_message TEXT,
    retry_count INT DEFAULT 0,
    nodes_extracted INT DEFAULT 0,
    edges_extracted INT DEFAULT 0,
    evidences_extracted INT DEFAULT 0,
    result_hash TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'success', 'failed', 'fallback_exhausted')),
    CONSTRAINT chk_action_name CHECK (action_name IN (
        'triage_fast', 'extract_strict', 'extract_loose', 'extract_sql', 
        'extract_python', 'extract_lineage_package', 'extract_schema', 'summarize'
    )),
    CONSTRAINT chk_strategy CHECK (strategy_used IN ('native_parser', 'structural', 'llm_heavy'))
);

-- 8. API Vault (Secrets)
CREATE TABLE IF NOT EXISTS api_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL, -- 'OPENROUTER', 'AZURE_OPENAI', 'DATABRICKS'
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_solutions_org ON solutions(org_id);
CREATE INDEX IF NOT EXISTS idx_job_run_project ON job_run(project_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_asset_project ON asset(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_parent ON asset(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_edge_index_from ON edge_index(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_edge_index_to ON edge_index(to_asset_id);
CREATE INDEX IF NOT EXISTS idx_job_plan_job ON job_plan(job_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_plan ON job_plan_item(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_area ON job_plan_item(area_id);
CREATE INDEX IF NOT EXISTS idx_file_log_job ON file_processing_log(job_id);
CREATE INDEX IF NOT EXISTS idx_file_log_path ON file_processing_log(file_path);

-- 10. RLS & Permissions (Permissive for Dev)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_stage_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_plan_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_plan_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_vault ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'organizations', 'solutions', 'job_run', 'job_stage_run', 'job_queue', 
        'evidence', 'asset', 'asset_version', 'edge_index', 'edge_evidence', 
        'job_plan', 'job_plan_area', 'job_plan_item', 'file_processing_log', 'api_vault'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', t);
        EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 11. Views
CREATE OR REPLACE VIEW file_processing_summary AS
SELECT 
    job_id,
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE status = 'success') as successful_files,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_files,
    SUM(total_tokens) as total_tokens_used,
    SUM(cost_estimate_usd) as total_cost,
    AVG(latency_ms) as avg_latency_ms,
    MIN(created_at) as started_at,
    MAX(created_at) as finished_at
FROM file_processing_log
GROUP BY job_id;

COMMIT;
