-- ☢️ NUCLEAR CLEANUP & SETUP SCRIPT ☢️
-- This script fixes RLS and Foreign Keys for good.

BEGIN;

-- 1. Helper Function to Drop All RLS Policies for a Table
CREATE OR REPLACE FUNCTION drop_all_policies(table_name text) RETURNS void AS $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = table_name LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply Permissive RLS (Drop all old policies first)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['solutions', 'asset', 'job_run', 'edge_index', 'evidence', 'job_queue', 'job_stage_run', 'edge_evidence', 'asset_version'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
        -- Drop old policies
        PERFORM drop_all_policies(t);
        -- Create new permissive policy
        EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 3. Fix Foreign Keys (Dynamic Cascade)
-- This block finds any FK pointing to 'solutions' and recreates it with ON DELETE CASCADE
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT tc.table_name, kcu.column_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'solutions'
    LOOP
        -- Drop existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        
        -- Add new constraint with CASCADE
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES solutions(id) ON DELETE CASCADE', 
            r.table_name, r.constraint_name, r.column_name);
            
        RAISE NOTICE 'Updated constraint % on table % to CASCADE', r.constraint_name, r.table_name;
    END LOOP;
END $$;

COMMIT;
