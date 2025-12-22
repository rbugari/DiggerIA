# Release Notes - Nexus Discovery v3.1

**Date:** December 22, 2025
**Theme:** "Plan, Control & Optimize"

## 🌟 Highlights

DiscoverAI v3.1 introduces a fundamental shift in how we process data repositories. Instead of "blindly" analyzing every file, we now use a **Plan-Driven Orchestrator**. This allows users to review the scope, cost, and strategy before execution begins.

### 1. Planning Phase & Review UI
- **Pre-flight Scan**: When you upload a ZIP or Repo, the system now creates a "Job Plan" in seconds.
- **Review Dashboard**: A new UI lets you see exactly what files will be processed.
- **Cost Estimation**: See estimated Token usage, Cost (USD), and Time for the entire job and per-file.
- **Control**: Toggle files ON/OFF or reorder them (e.g., prioritize Schema files before ETLs).

### 2. Hybrid Parsing (SSIS & DataStage)
- **Problem**: Sending huge XML files to LLMs is slow, expensive, and error-prone.
- **Solution**: We implemented a native Python parser for `.dtsx` files that extracts the structure (Control Flow) locally.
- **Result**: The LLM only receives the relevant metadata and SQL queries, reducing token usage by ~60% and improving accuracy.

### 3. Reprocessing Modes
- **Incremental Update**: Re-run analysis on a solution to pick up new files or retry failed ones without deleting existing history.
- **Full Clean**: A "Nuclear Option" in the UI to wipe all data for a solution and start fresh (useful for testing new prompts).

### 4. Smart Policy Engine
- **Noise Reduction**: Automatically ignores `.git/`, `node_modules/`, `__pycache__/`, and binary files.
- **Security**: Prevents processing of potential secrets files (config.json, .env) unless explicitly allowed (future).

## 🛠 Technical Improvements
- **New Tables**: `job_plan`, `job_plan_area`, `job_plan_item` in Supabase.
- **Validation**: Strict JSON Schema enforcement for all LLM outputs to prevent "hallucinated" fields.
- **Upsert Logic**: Catalog service now supports idempotent writes (updating existing assets instead of duplicating).

## 🐛 Bug Fixes
- Fixed issue where SSIS extraction failed silently due to missing parser import.
- Fixed "Assets = 0" bug caused by strict Pydantic validation on optional fields.
- Fixed Dashboard date display to show "Last Run" instead of creation date.

## 🔜 What's Next (v3.2)
- PDF/CSV Export for documentation.
- Graph Visualization filters.
- Real-time WebSocket progress bar.
