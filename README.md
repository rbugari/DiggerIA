# DiggerAI Platform (v3.2)

## 🚀 What's New in v3.2 (Hierarchical Intelligence)
- **Hierarchical Graph Visualization**: Tasks and data flows are now encapsulated within **Package Containers** (e.g., SSIS Packages), reducing clutter and reflecting real-world structure.
- **Visual Impact Analysis**: New "Impact Mode" allows users to select any asset and instantly visualize its downstream "blast radius" across the entire ecosystem.
- **Persona-Based Perspectives**: Toggle between **Architect** (High-level business map) and **Engineer** (Deep technical logic) views.
- **Professional PDF Reports**: Automated generation of professional discovery reports with asset inventories and executive summaries.
- **Context Isolation**: Drill-down into specific packages to isolate their sub-graphs and focus on local logic.

## 🚀 Key Features (v3.1)
- **Plan Review UI**: A "Human-in-the-loop" step to review, approve, and estimate costs before execution.
- **Hybrid Parsing**: Native XML/Regex parsing combined with LLM enrichment for accurate and cost-effective ETL extraction.
- **Incremental Updates**: Reprocess solutions with "Full Clean" or "Incremental Update" modes.

## 📖 Documentation
- [Functional Specification](docs/FUNCTIONAL_SPEC.md) - *What the product does and its value.*
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md) - *System components, data flow, and architecture.*
- [User Manual](docs/USER_MANUAL.md) - *Step-by-step guide for discovery and analysis.*
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
