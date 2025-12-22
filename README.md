# Nexus Discovery Platform (v3.1)

## Overview
Nexus Discovery is a SaaS platform for automated reverse engineering of data code (SSIS, SQL, Python) using Generative AI. It extracts data lineage, creates documentation, and visualizes relationships in a Knowledge Graph.

## 🚀 What's New in v3.1 (Plan-Driven Execution)
- **Plan Review UI**: A new "Human-in-the-loop" step where users can review, approve, reorder, and categorize files before execution.
- **Hybrid Parsing (SSIS/DataStage)**: Native XML parsing combined with LLM enrichment for accurate and cost-effective ETL extraction.
- **Incremental Updates**: Reprocess solutions with "Full Clean" or "Incremental Update" modes to manage costs and history.
- **Cost & Time Estimation**: Real-time estimates of Token usage, USD Cost, and Time for every file based on analysis strategy.
- **Policy Engine**: Automatic exclusion of noise (e.g., `.git`, `node_modules`, binary files) to save tokens.

## 🚀 Key Features (v2.0+)
- **Advanced Pipeline Orchestrator**: A robust, stage-based engine (Ingest -> Plan -> Extract -> Persist).
- **Deep Lineage Extraction**: "Senior Data Engineer" prompts for SQL, SSIS, and Python.
- **Resilient AI Execution**: The `ActionRunner` handles Rate Limits and JSON errors with smart fallbacks (Llama 3 70B -> 8B).
- **Universal Ingestion**: Support for ZIP File Uploads and Git Repositories.

## Documentation
- [Functional Specification](docs/FUNCTIONAL_SPEC.md)
- [Roadmap & Known Issues](docs/ROADMAP.md)
- [Release Notes](docs/RELEASE_NOTES.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)

## Prerequisites
1.  **Python 3.11+**
2.  **Node.js 18+**
3.  **Supabase Project** (Free Tier)
4.  **Neo4j AuraDB** (Free Tier)

## Quick Start
1.  **Backend**:
    ```bash
    cd apps/api
    pip install -r requirements.txt
    python -m uvicorn app.main:app --reload
    # In a separate terminal:
    python -m app.worker
    ```
2.  **Frontend**:
    ```bash
    cd apps/web
    npm install
    npm run dev
    ```
3.  **Access**: Open `http://localhost:3000`
    *   Required: `URI`, `Username`, and `Password`.
5.  **LLM Provider**:
    *   **Groq** (Recommended for speed/cost): Get API Key at [console.groq.com](https://console.groq.com).
    *   **OpenAI/Azure**: Supported but requires configuration adjustment.

## Setup & Run

### ⚡ Quick Start (Recommended)
We provide a unified launcher script to start all services (API, Worker, Web) simultaneously in separate windows.

1.  **Configure Environment**:
    Create `.env` in the root folder (see `.env.example`).
2.  **Run Launcher**:
    ```bash
    # From project root
    python start_dev.py
    ```
    This will launch:
    *   **API** on http://localhost:8000
    *   **Web** on http://localhost:3000
    *   **Celery Worker** (Background processing)

---

### 🔧 Manual Setup
If you prefer running services individually:

#### 1. Backend (FastAPI)
Open a terminal in `apps/api`:
```bash
cd apps/api
# Create venv (optional but recommended)
python -m venv .venv
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run API Server
python -m uvicorn app.main:app --reload --port 8000
```

#### 2. Worker (Pipeline Engine)
**Crucial:** The worker processes file uploads asynchronously.
Open a NEW terminal in `apps/api`:
```bash
cd apps/api
# Activate venv if used
.\.venv\Scripts\activate

# Run Worker
python -m app.worker
```

#### 3. Frontend (Next.js)
Open a NEW terminal in `apps/web`:
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Utility Scripts
Useful scripts for debugging and maintenance are located in `apps/api/scripts/`:
*   `system_reset.py`: **Hard Reset**. Wipes Neo4j and Supabase data for a fresh start.
*   `check_db_ready.py`: Verifies Supabase tables exist.
*   `check_neo4j.py`: Tests Neo4j connectivity.

## Architecture Highlights
- **Pipeline V2**: Robust, stage-based processing engine (Ingest -> Enumerate -> Extract -> Persist -> Graph).
- **ActionRunner**: Modular AI execution handling fallbacks (e.g., Llama 3 70B -> 8B) and rate limits.
- **Strict JSON Extraction**: Specialized prompts ensure clean data extraction for SSIS and SQL.
