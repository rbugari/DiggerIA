-- ⚠️ DEV MODE: PERMISSIVE POLICIES
-- Run this script in Supabase SQL Editor to allow ALL operations (SELECT, INSERT, UPDATE, DELETE)
-- to anyone (Anon and Authenticated users) without restrictions.
-- DO NOT USE IN PRODUCTION.

-- 1. Solutions
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY; -- Ensure RLS is on so policies apply
DROP POLICY IF EXISTS "Enable all access for dev" ON solutions;
CREATE POLICY "Enable all access for dev" ON solutions FOR ALL USING (true) WITH CHECK (true);

-- 2. Assets
ALTER TABLE asset ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for dev" ON asset;
CREATE POLICY "Enable all access for dev" ON asset FOR ALL USING (true) WITH CHECK (true);

-- 3. Job Runs
ALTER TABLE job_run ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for dev" ON job_run;
CREATE POLICY "Enable all access for dev" ON job_run FOR ALL USING (true) WITH CHECK (true);

-- 4. Edges
ALTER TABLE edge_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for dev" ON edge_index;
CREATE POLICY "Enable all access for dev" ON edge_index FOR ALL USING (true) WITH CHECK (true);

-- 5. Edge Evidence
ALTER TABLE edge_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for dev" ON edge_evidence;
CREATE POLICY "Enable all access for dev" ON edge_evidence FOR ALL USING (true) WITH CHECK (true);

-- 6. Organizations (if used)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for dev" ON organizations;
CREATE POLICY "Enable all access for dev" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- 7. Add ON DELETE CASCADE to Foreign Keys to avoid "orphan" errors in the future
-- This allows deleting a Solution to automatically delete its Assets and Jobs.

-- Drop existing constraints if they don't have cascade (names might vary, checking standard naming)
-- Note: You might need to adjust constraint names based on your specific schema creation.
-- Below are standard attempts. If they fail, ignore or adjust names.

ALTER TABLE asset 
DROP CONSTRAINT IF EXISTS asset_project_id_fkey,
ADD CONSTRAINT asset_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES solutions(id) ON DELETE CASCADE;

ALTER TABLE job_run 
DROP CONSTRAINT IF EXISTS job_run_project_id_fkey,
ADD CONSTRAINT job_run_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES solutions(id) ON DELETE CASCADE;

ALTER TABLE edge_index 
DROP CONSTRAINT IF EXISTS edge_index_project_id_fkey,
ADD CONSTRAINT edge_index_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES solutions(id) ON DELETE CASCADE;
