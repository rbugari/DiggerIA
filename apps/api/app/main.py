from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .tasks import analyze_solution_task
from pydantic import BaseModel
from .routers import planning

load_dotenv()

app = FastAPI(title="DiggerAI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(planning.router)

class JobRequest(BaseModel):
    solution_id: str
    file_path: str

@app.get("/")
def read_root():
    return {"message": "DiggerAI API is running (No Docker Mode)"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/jobs")
async def create_job(job: JobRequest):
    from .services.queue import SQLJobQueue
    from supabase import create_client
    from .config import settings
    
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # 1. Create Job Run Record
    job_data = {
        "project_id": job.solution_id,
        "status": "queued",
        "current_stage": "ingest",
        "requires_approval": True
    }
    # Use job.solution_id as job_id for now? 
    # MD says job_id is UUID. solution_id is UUID.
    # But job_run.project_id is solution_id. job_run.job_id is new.
    # The frontend expects job_id. If I return a new UUID, frontend might get confused if it expects solution_id.
    # Existing code returned {"job_id": job.solution_id}.
    # I should check frontend code.
    # But sticking to requirements: "response: { job_id: ... }"
    
    # Insert into job_run
    res = supabase.table("job_run").insert(job_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create job record")
        
    new_job_id = res.data[0]["job_id"]
    
    # Update Solution Status to QUEUED
    supabase.table("solutions").update({"status": "QUEUED"}).eq("id", job.solution_id).execute()
    
    # 2. Enqueue
    queue = SQLJobQueue()
    queue.enqueue_job(new_job_id)
    
    # We also need to store the file_path somewhere so the worker knows what to process.
    # The `job_run` table has `artifact_id`. 
    # But `JobRequest` has `file_path`.
    # I should probably store `file_path` in `job_run` or look it up from `solutions` (if it's there).
    # The `solutions` table has `storage_path`.
    # The worker can look up `solutions` using `project_id` (which is solution_id).
    
    return {"job_id": new_job_id, "status": "queued"}

@app.get("/solutions/{solution_id}/graph")
def get_solution_graph(solution_id: str):
    from .services.graph import get_graph_service
    # For now we return the whole graph as we are not filtering by subgraph yet in Neo4j service
    graph_service = get_graph_service()
    data = graph_service.get_graph_data(solution_id)
    return data

class ChatRequest(BaseModel):
    question: str

@app.post("/solutions/{solution_id}/chat")
async def chat_solution(solution_id: str, request: ChatRequest):
    from .services.graph import get_graph_service
    from .services.llm import LLMService
    
    # 1. Fetch Graph Context
    graph_service = get_graph_service()
    graph_data = graph_service.get_graph_data(solution_id)
    
    # 2. Ask LLM
    llm_service = LLMService()
    answer = llm_service.chat_with_graph(graph_data, request.question)
    
    return {"answer": answer}

class TranslationRequest(BaseModel):
    column_name: str
    expression_raw: str
    node_name: str
    source_system: str = "SSIS"

@app.post("/solutions/{solution_id}/translate-logic")
async def translate_logic(solution_id: str, request: TranslationRequest):
    from .actions import ActionRunner
    
    runner = ActionRunner()
    result = runner.translate_logic(
        column_name=request.column_name,
        expression_raw=request.expression_raw,
        node_name=request.node_name,
        source_system=request.source_system
    )
    
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error_message)
        
    return result.data

@app.get("/solutions/{solution_id}/report")
async def get_solution_report(solution_id: str):
    from .services.report import ReportService
    from supabase import create_client
    from .config import settings
    
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    report_service = ReportService(supabase)
    
    try:
        pdf_bytes = report_service.generate_solution_report(solution_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=DiggerAI_Report_{solution_id[:8]}.pdf"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/solutions/{solution_id}/chat")
async def chat_solution_options(solution_id: str):
    return {}

@app.delete("/solutions/{solution_id}")
async def delete_solution(solution_id: str):
    from supabase import create_client
    from .config import settings
    from .services.graph import get_graph_service
    
    # Use Service Role Key if available to bypass RLS, otherwise fallback to Anon Key
    key_to_use = settings.SUPABASE_SERVICE_ROLE_KEY if settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_KEY
    supabase = create_client(settings.SUPABASE_URL, key_to_use)
    
    try:
        # Delete from Supabase
        print(f"Attempting to delete solution {solution_id} from Supabase...")
        
        # 1. Clean Assets (Manual Cascade)
        # Step 1: Delete Job Runs (they link to project_id)
        job_del = supabase.table("job_run").delete().eq("project_id", solution_id).execute()
        print(f"Deleted Job Runs: {len(job_del.data)}")
        
        # Step 2: Delete Edges (they link to project_id)
        # Note: edge_evidence might be orphaned if not cascaded.
        edge_del = supabase.table("edge_index").delete().eq("project_id", solution_id).execute()
        print(f"Deleted Edges: {len(edge_del.data)}")
        
        # Step 3: Delete Assets (they link to project_id)
        asset_del = supabase.table("asset").delete().eq("project_id", solution_id).execute()
        print(f"Deleted Assets: {len(asset_del.data)}")
        
        # Step 3.5: Delete Evidence (often overlooked, links to project_id)
        evidence_del = supabase.table("evidence").delete().eq("project_id", solution_id).execute()
        print(f"Deleted Evidence: {len(evidence_del.data)}")
        
        # Step 4: Delete Solution
        res = supabase.from_("solutions").delete().eq("id", solution_id).execute()
        print(f"Supabase Solution Delete Result: {res}")
        
        # Check if anything was actually deleted
        if not res.data:
            print(f"WARNING: Solution {solution_id} was NOT deleted (RLS or ID not found).")
        
        # Delete from Neo4j
        try:
            graph_service = get_graph_service()
            graph_service.delete_solution_nodes(solution_id)
        except Exception as graph_e:
            print(f"Failed to delete graph nodes: {graph_e}")

        return {"status": "deleted", "id": solution_id}
    except Exception as e:
        print(f"Delete Exception: {e}")
        # Return success even if failed, to allow UI to update? No, better return 500 so user knows.
        # But if it's partial failure (e.g. Neo4j down), we might want to return 200 with warning.
        raise HTTPException(status_code=500, detail=str(e))

class ReanalyzeRequest(BaseModel):
    mode: str = "update" # update | full

@app.post("/solutions/{solution_id}/analyze")
async def reanalyze_solution(solution_id: str, request: ReanalyzeRequest = ReanalyzeRequest(mode="update")):
    from .services.queue import SQLJobQueue
    from supabase import create_client
    from .config import settings
    
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Check if full cleanup requested
    if request.mode == "full":
        try:
            print(f"Cleaning previous data for solution {solution_id} (Full Reprocess)...")
            # Reuse logic from delete_solution but keep solution record
            supabase.table("job_run").delete().eq("project_id", solution_id).execute()
            supabase.table("edge_index").delete().eq("project_id", solution_id).execute()
            supabase.table("asset").delete().eq("project_id", solution_id).execute()
            supabase.table("evidence").delete().eq("project_id", solution_id).execute()
        except Exception as e:
            print(f"Warning during cleanup: {e}")

    # Fetch solution to get file_path
    try:
        response = supabase.from_("solutions").select("storage_path").eq("id", solution_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail=f"Solution {solution_id} not found in the new database. Please refresh the browser and re-upload the project.")
            
        storage_path = response.data[0]["storage_path"]
            
        # Create Job Run
        job_data = {
            "project_id": solution_id,
            "status": "queued",
            "current_stage": "ingest",
            "requires_approval": True
        }
        res = supabase.table("job_run").insert(job_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create job record")
            
        new_job_id = res.data[0]["job_id"]
        
        # Update Solution Status to QUEUED
        supabase.table("solutions").update({"status": "QUEUED"}).eq("id", solution_id).execute()
        
        # Enqueue
        queue = SQLJobQueue()
        queue.enqueue_job(new_job_id)
        
        return {"status": "queued", "job_id": new_job_id, "mode": request.mode}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in reanalyze_solution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SubgraphRequest(BaseModel):
    center_id: str
    depth: int = 1
    limit: int = 100

class PathRequest(BaseModel):
    from_id: str
    to_id: str
    max_hops: int = 5

@app.post("/graph/subgraph")
async def get_subgraph(req: SubgraphRequest):
    from .services.graph import get_graph_service
    graph = get_graph_service()
    return graph.get_subgraph(req.center_id, req.depth, req.limit)

@app.post("/graph/path")
async def find_paths(req: PathRequest):
    from .services.graph import get_graph_service
    graph = get_graph_service()
    return graph.find_paths(req.from_id, req.to_id, req.max_hops)

@app.post("/admin/cleanup")
async def admin_cleanup_database():
    """
    NUCLEAR OPTION: Truncates all data tables to reset the system.
    Requires Service Role Key.
    """
    from supabase import create_client
    from .config import settings
    
    # Force Service Role Key
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Service Role Key not configured. Cannot perform admin cleanup.")
        
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    
    try:
        print("☢️ STARTING NUCLEAR CLEANUP ☢️")
        
        # Order matters for Foreign Keys if cascade is not set
        tables_to_clean = [
            "edge_evidence",
            "edge_index",
            "job_stage_run",
            "job_queue",
            "job_run",
            "asset_version",
            "asset",
            "evidence",
            "solutions"
        ]
        
        results = {}
        for table in tables_to_clean:
            # delete().neq("id", "00000...") is a hack to delete all rows since supabase-py delete() requires a filter
            # or use rpc if available.
            # Using neq("id", "00000000-0000-0000-0000-000000000000") assuming UUID PKs
            
            # Better: use a dummy condition that is always true or ID is not null
            # Checking table PK name might be needed but assuming standard ID or UUID logic
            
            print(f"Cleaning {table}...")
            # Using a filter that matches everything usually works like gte created_at 1900...
            # Or if table has 'id' column:
            try:
                if table == "solutions":
                    res = supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                elif table == "edge_evidence":
                     # composite key, trickier. 
                     # If we can't delete easily via client, we might need an RPC.
                     # But let's try assuming we can delete by some column.
                     # edge_evidence has edge_id.
                     res = supabase.table(table).delete().neq("edge_id", "00000000-0000-0000-0000-000000000000").execute()
                elif table == "job_queue":
                     res = supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                elif "id" in ["job_run", "asset", "evidence", "job_stage_run", "edge_index", "asset_version"]:
                     # These usually have specific PKs
                     pk_map = {
                         "job_run": "job_id",
                         "asset": "asset_id",
                         "evidence": "evidence_id",
                         "edge_index": "edge_id",
                         "asset_version": "asset_version_id",
                         "job_stage_run": "id"
                     }
                     pk = pk_map.get(table, "id")
                     res = supabase.table(table).delete().neq(pk, "00000000-0000-0000-0000-000000000000").execute()
                else:
                     res = {"data": "Skipped/Unknown PK"}
                     
                results[table] = len(res.data) if res.data else 0
            except Exception as table_e:
                print(f"Error cleaning {table}: {table_e}")
                results[table] = f"Error: {str(table_e)}"

        return {"status": "cleaned", "details": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/solutions/{solution_id}/stats")
async def get_solution_stats(solution_id: str):
    from supabase import create_client
    from .config import settings
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Total Assets
    assets_count = supabase.table("asset").select("asset_id", count="exact").eq("project_id", solution_id).execute()
    
    # Assets by Type: Dynamic Aggregation
    # Since supabase-py doesn't support GROUP BY, we fetch type and count manually if data is small,
    # or perform a select on all existing types.
    # A better approach for scalability is a dedicated RPC, but for now we'll fetch unique types.
    
    type_res = supabase.table("asset").select("asset_type").eq("project_id", solution_id).execute()
    asset_types_counts = {}
    if type_res.data:
        for item in type_res.data:
            t = item["asset_type"]
            asset_types_counts[t] = asset_types_counts.get(t, 0) + 1
    
    # Total Edges (Relationships)
    edges_count = supabase.table("edge_index").select("edge_id", count="exact").eq("project_id", solution_id).execute()
    
    # Active Job Status
    job_status = None
    job_res = supabase.table("job_run")\
        .select("job_id, plan_id, status, progress_pct, error_details, created_at, current_stage")\
        .eq("project_id", solution_id)\
        .in_("status", ["queued", "running", "planning_ready"])\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
        
    if job_res.data:
        job_status = job_res.data[0]
    
    # Last Completed Job
    last_run = None
    last_run_res = supabase.table("job_run")\
        .select("finished_at")\
        .eq("project_id", solution_id)\
        .eq("status", "completed")\
        .order("finished_at", desc=True)\
        .limit(1)\
        .execute()
    
    if last_run_res.data:
        last_run = last_run_res.data[0]["finished_at"]

    return {
        "total_assets": assets_count.count,
        "total_edges": edges_count.count,
        "asset_types": asset_types_counts,
        "active_job": job_status,
        "last_run": last_run
    }

@app.get("/solutions/{solution_id}/assets")
async def get_solution_assets(
    solution_id: str, 
    type: str = None, 
    search: str = None, 
    limit: int = 50, 
    offset: int = 0
):
    from supabase import create_client
    from .config import settings
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    query = supabase.table("asset").select("*", count="exact").eq("project_id", solution_id)
    
    if type and type != "ALL":
        query = query.eq("asset_type", type)
        
    if search:
        query = query.ilike("name_display", f"%{search}%")
        
    query = query.range(offset, offset + limit - 1).order("name_display")
        
    res = query.execute()
    return {"data": res.data, "count": res.count}

@app.get("/assets/{asset_id}/details")
async def get_asset_details(asset_id: str):
    from supabase import create_client
    from .config import settings
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # 1. Fetch Asset
    asset_res = supabase.table("asset").select("*").eq("asset_id", asset_id).single().execute()
    if not asset_res.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = asset_res.data
    
    # 2. Fetch Relationships (Incoming and Outgoing)
    # Outgoing: from_asset_id = asset_id
    outgoing = supabase.table("edge_index")\
        .select("edge_id, edge_type, confidence, is_hypothesis, to_asset:to_asset_id(asset_id, name_display, asset_type)")\
        .eq("from_asset_id", asset_id)\
        .execute()
        
    # Incoming: to_asset_id = asset_id
    incoming = supabase.table("edge_index")\
        .select("edge_id, edge_type, confidence, is_hypothesis, from_asset:from_asset_id(asset_id, name_display, asset_type)")\
        .eq("to_asset_id", asset_id)\
        .execute()
        
    # 3. Fetch Evidences for this asset (via evidence table directly? or via edges?)
    # Evidence is linked to edges or artifact.
    # But an asset might have evidences directly if we linked them. 
    # Currently `evidence` table has `file_path` but no direct link to `asset_id` unless we infer from name or locator.
    # However, we can fetch evidences for the edges found above.
    
    # Let's collect all edge_ids
    edge_ids = [e["edge_id"] for e in (outgoing.data or [])] + [e["edge_id"] for e in (incoming.data or [])]
    
    evidences = []
    if edge_ids:
        # Fetch edge evidences
        ev_res = supabase.table("edge_evidence")\
            .select("edge_id, evidence:evidence_id(*)")\
            .in_("edge_id", edge_ids)\
            .execute()
        
        # Structure evidences by edge_id
        evidences = ev_res.data
        
    return {
        "asset": asset,
        "outgoing_edges": outgoing.data,
        "incoming_edges": incoming.data,
        "evidences": evidences
    }