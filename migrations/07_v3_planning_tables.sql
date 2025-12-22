-- 07_v3_planning_tables.sql

-- 1. Asset Hierarchy (Deep Package Inspection support)
ALTER TABLE asset ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES asset(asset_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_asset_parent ON asset(parent_asset_id);

-- 2. Job Plan (The Master Plan)
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

-- 3. Job Plan Areas (Grouping: Foundation, Packages, Aux)
CREATE TABLE IF NOT EXISTS job_plan_area (
    area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES job_plan(plan_id) ON DELETE CASCADE,
    area_key TEXT NOT NULL, -- FOUNDATION, PACKAGES, AUX
    title TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    default_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Job Plan Items (The Files/Tasks)
CREATE TABLE IF NOT EXISTS job_plan_item (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES job_plan(plan_id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES job_plan_area(area_id) ON DELETE CASCADE,
    
    -- File Info
    path TEXT NOT NULL,
    file_hash TEXT,
    size_bytes BIGINT,
    file_type TEXT, -- SQL, DTSX, PY, etc.
    
    -- Classification
    classifier JSONB DEFAULT '{}', -- features used for classification
    strategy TEXT, -- PARSER_ONLY, PARSER_PLUS_LLM, LLM_ONLY, SKIP
    recommended_action TEXT, -- PROCESS, SKIP, REVIEW
    
    -- User Control
    enabled BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    
    -- Scoring & Estimation
    risk_score INT DEFAULT 0,
    value_score INT DEFAULT 0,
    estimate JSONB DEFAULT '{}', -- { tokens: 100, cost: 0.001, time_sec: 2 }
    
    planning_notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, skipped
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_plan_job ON job_plan(job_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_plan ON job_plan_item(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_item_area ON job_plan_item(area_id);

-- 5. Update Job Run (Link to Plan)
ALTER TABLE job_run ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES job_plan(plan_id);
ALTER TABLE job_run ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT TRUE;
ALTER TABLE job_run ADD COLUMN IF NOT EXISTS current_item_id UUID REFERENCES job_plan_item(item_id);
