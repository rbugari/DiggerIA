"""
Action Runner - Ejecuta acciones de LLM con soporte de fallbacks
"""
import time
import json
import traceback
import os
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime
import uuid

from ..router import get_model_router, ActionConfig, ModelConfig
from ..audit import FileProcessingLogger
from ..services.llm_adapter import get_llm_adapter
from ..config import settings

@dataclass
class ActionResult:
    """Resultado de ejecutar una acción"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    
    # Métricas
    model_used: Optional[str] = None
    latency_ms: Optional[int] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_estimate_usd: Optional[float] = None
    
    # Información de fallback
    fallback_used: bool = False
    models_attempted: Optional[List[str]] = None

class ActionRunner:
    """
    Ejecuta acciones de LLM con soporte de fallbacks automáticos
    """
    
    def __init__(self, logger: Optional[FileProcessingLogger] = None):
        self.router = get_model_router()
        self.logger = logger or FileProcessingLogger()
        self.llm_service = get_llm_adapter()
        
        # Estimaciones de costo por modelo (USD por 1K tokens)
        self.cost_estimates = {
            "llama-3.3-70b-versatile": 0.00059, # Groq
            "llama-3.1-8b-instant": 0.00005,    # Groq
            "mistralai/devstral-2512:free": 0.0, 
            "google/gemini-2.0-flash-exp": 0.0, 
            "google/gemini-1.5-flash": 0.000075,
            "meta-llama/llama-3-8b-instruct:free": 0.0,
            "qwen/qwen-2.5-instruct": 0.0008,
            "qwen/qwen-2.5-coder": 0.001,
            "deepseek/deepseek-chat": 0.002,
            "google/gemini-2.0-flash-thinking": 0.003,
        }
        
    def extract_file(self, file_path: str, content: str) -> ActionResult:
        """
        Specialized action for extraction that leverages the ExtractorRegistry.
        This bypasses the generic 'run_action' prompt flow if a native extractor exists.
        """
        start_time = time.time()
        try:
            from ..services.extractors.registry import ExtractorRegistry
            from ..models.cir import CIRPackage
            
            registry = ExtractorRegistry()
            extractor = registry.get_extractor(file_path)
            
            # Try Deep Extraction (V3 Kernel)
            cir_package = extractor.extract_deep(file_path, content)
            
            if cir_package:
                print(f"[ACTION_RUNNER] Using Deep Extractor for {file_path}")
                
                # Logic Injection Phase (Micro-Analysis)
                # Iterate transformations and inject SQL if needed
                # (This is where we would call the LLM for each expression)
                # For now, we return the CIR structure mapped to standard output
                
                # Convert CIR to Standard Result (Nodes/Edges)
                nodes = []
                edges = []
                
                # Group transformations by node_id
                trans_map = {}
                for t in cir_package.transformations:
                    if t.node_id not in trans_map: trans_map[t.node_id] = []
                    trans_map[t.node_id].append({
                        "column": t.column_name,
                        "expression": t.expression_raw
                    })

                for node in cir_package.nodes:
                    attrs = node.properties.copy()
                    attrs["transformations"] = trans_map.get(node.id, [])
                    attrs["columns_metadata"] = node.columns_metadata
                    
                    # Derive a flat list of unique column names for simple UI display
                    flat_columns = sorted(list(set([c.get("name") for c in node.columns_metadata if c.get("name")])))
                    attrs["columns"] = flat_columns
                    
                    nodes.append({
                        "node_id": node.id,
                        "name": node.name,
                        "node_type": node.type.lower(),
                        "system": cir_package.source_system,
                        "parent_node_id": node.parent_id, # Top level for Pydantic model
                        "attributes": attrs,
                        "columns_metadata": node.columns_metadata # Keep as field too
                    })
                    
                for flow in cir_package.data_flows:
                    edges.append({
                        "edge_id": str(uuid.uuid4()),
                        "from_node_id": flow.source_id,
                        "to_node_id": flow.target_id,
                        "edge_type": "FLOWS_TO",
                        "confidence": 1.0,
                        "rationale": "Directly extracted from SSIS Data Flow pipeline XML",
                        "attributes": {"columns": flow.columns}
                    })
                
                return ActionResult(
                    success=True,
                    data={
                        "nodes": nodes, 
                        "edges": edges,
                        "metadata": {"extractor": "native_deep_ssis", "version": "3.0"},
                        "evidences": [],
                        "cir_package": cir_package.dict()
                    },
                    model_used="native_deep_parser",
                    latency_ms=int((time.time() - start_time) * 1000)
                )
            
            # Fallback to Legacy/LLM Extraction
            print(f"[ACTION_RUNNER] Fallback to legacy extraction for {file_path}")
            # If native extractor returns None, we might still want to try LLM prompt
            # But normally we call run_action('extract_lineage', ...) from the service layer.
            # Here we just return failure to prompt the service to use the LLM action.
            return ActionResult(success=False, error_type="native_extraction_unavailable")

        except Exception as e:
            print(f"[ACTION_RUNNER] Deep Extraction failed: {e}")
            import traceback
            traceback.print_exc()
            return ActionResult(success=False, error_message=str(e))

    def run_action(
        self, 
        action_name: str, 
        input_data: Dict[str, Any], 
        context: Dict[str, Any],
        log_id: Optional[str] = None
    ) -> ActionResult:
        """
        Ejecuta una acción con su configuración primaria
        
        Args:
            action_name: Nombre de la acción (ej: 'triage_fast')
            input_data: Datos de entrada para la acción
            context: Contexto adicional (job_id, file_path, etc.)
            log_id: ID del log de auditoría (opcional)
            
        Returns:
            ActionResult con el resultado de la ejecución
        """
        start_time = time.time()
        
        try:
            # Obtener configuración de la acción
            action_config = self.router.get_action_config(action_name)
            
            # Ejecutar con el modelo primario
            result = self._execute_single_model(
                action_config.primary, 
                input_data, 
                context,
                log_id
            )
            
            # Si falló y hay fallbacks, intentarlos
            if not result.success and action_config.fallbacks:
                return self._execute_fallbacks(
                    action_config.fallbacks,
                    input_data,
                    context,
                    log_id,
                    start_time,
                    action_config.primary.model
                )
            
            return result
            
        except Exception as e:
            error_msg = f"Error ejecutando acción '{action_name}': {str(e)}"
            print(f"[ACTION_RUNNER] {error_msg}")
            
            return ActionResult(
                success=False,
                error_message=error_msg,
                error_type="action_execution_error",
                latency_ms=int((time.time() - start_time) * 1000)
            )
    
    def _execute_single_model(
        self, 
        model_config: ModelConfig, 
        input_data: Dict[str, Any], 
        context: Dict[str, Any],
        log_id: Optional[str] = None
    ) -> ActionResult:
        """Ejecuta un modelo individual"""
        start_time = time.time()
        
        try:
            # Cargar prompt
            prompt_content = self._load_prompt(model_config.prompt_file, input_data, context)
            
            # Preparar mensajes para LLM
            # Truncar input_data de forma segura (sin romper el JSON)
            # Copiar input_data para no modificar el original
            safe_input = input_data.copy()
            
            # Si hay contenido grande, truncarlo ANTES de dumps
            if "content" in safe_input and isinstance(safe_input["content"], str):
                limit = 200000 
                if len(safe_input["content"]) > limit:
                    print(f"[ACTION_RUNNER] Truncating content from {len(safe_input['content'])} to {limit} chars (preserving head and tail)")
                    head_size = limit // 2
                    tail_size = limit // 2
                    safe_input["content"] = safe_input["content"][:head_size] + "\n... (TRUNCATED) ...\n" + safe_input["content"][-tail_size:]
            
            input_json = json.dumps(safe_input)
            
            messages = [
                {"role": "system", "content": prompt_content},
                {"role": "user", "content": input_json}
            ]
            
            # Ejecutar LLM
            llm_result = self.llm_service.call_model(
                model=model_config.model,
                messages=messages,
                temperature=model_config.temperature,
                max_tokens=model_config.max_tokens,
                provider=model_config.provider or settings.LLM_PROVIDER
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if not llm_result.get("success"):
                error_detail = llm_result.get("error", "Unknown LLM error")
                print(f"[ACTION_RUNNER] Model {model_config.model} failed: {error_detail}")
                return ActionResult(
                    success=False,
                    error_message=error_detail,
                    error_type="llm_error",
                    model_used=model_config.model,
                    latency_ms=latency_ms
                )
            
            # Parsear respuesta
            response_content = llm_result.get("content", "")
            
            # Validar JSON si es necesario
            if self._requires_json_validation(model_config.prompt_file):
                try:
                    cleaned_content = self._clean_json_response(response_content)
                    parsed_data = json.loads(cleaned_content)
                    
                    validation_error = self._validate_json_schema(
                        parsed_data, 
                        model_config.prompt_file
                    )
                    
                    if validation_error:
                        print(f"[ACTION_RUNNER] JSON Validation Failed for {model_config.model}: {validation_error}")
                        return ActionResult(
                            success=False,
                            error_message=f"JSON validation failed: {validation_error}",
                            error_type="validation_error",
                            model_used=model_config.model,
                            latency_ms=latency_ms
                        )
                    
                    response_data = parsed_data
                    
                except json.JSONDecodeError as e:
                    print(f"[ACTION_RUNNER] JSON Decode Error for {model_config.model}: {e}")
                    return ActionResult(
                        success=False,
                        error_message=f"Invalid JSON response: {str(e)}",
                        error_type="json_parse_error",
                        model_used=model_config.model,
                        latency_ms=latency_ms
                    )
            else:
                response_data = {"content": response_content}
            
            tokens_in = llm_result.get("tokens_in", 0)
            tokens_out = llm_result.get("tokens_out", 0)
            total_tokens = tokens_in + tokens_out
            
            cost_estimate = self._estimate_cost(
                model_config.model, 
                total_tokens
            )
            
            if log_id:
                self.logger.update_model_usage(log_id, "openrouter", model_config.model)
                self.logger.update_tokens_and_cost(
                    log_id, tokens_in, tokens_out, cost_estimate, latency_ms
                )
            
            return ActionResult(
                success=True,
                data=response_data,
                model_used=model_config.model,
                latency_ms=latency_ms,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                total_tokens=total_tokens,
                cost_estimate_usd=cost_estimate
            )
            
        except Exception as e:
            error_msg = f"Error ejecutando modelo '{model_config.model}': {str(e)}"
            print(f"[ACTION_RUNNER] {error_msg}")
            
            return ActionResult(
                success=False,
                error_message=error_msg,
                error_type="model_execution_error",
                model_used=model_config.model,
                latency_ms=int((time.time() - start_time) * 1000)
            )
    
    def _execute_fallbacks(
        self,
        fallback_configs: List[ModelConfig],
        input_data: Dict[str, Any],
        context: Dict[str, Any],
        log_id: Optional[str],
        start_time: float,
        primary_model: str
    ) -> ActionResult:
        """Ejecuta cadena de fallbacks"""
        
        print(f"[ACTION_RUNNER] Primary model '{primary_model}' failed, trying fallbacks...")
        
        models_attempted = [primary_model]
        
        for i, fallback_config in enumerate(fallback_configs):
            print(f"[ACTION_RUNNER] Trying fallback {i+1}/{len(fallback_configs)}: {fallback_config.model}")
            
            result = self._execute_single_model(
                fallback_config, 
                input_data, 
                context,
                log_id
            )
            
            models_attempted.append(fallback_config.model)
            
            if result.success:
                result.fallback_used = True
                result.models_attempted = models_attempted
                
                if log_id:
                    self.logger.update_model_usage(
                        log_id, 
                        "openrouter", 
                        result.model_used,
                        fallback_used=True,
                        fallback_chain=models_attempted
                    )
                
                print(f"[ACTION_RUNNER] Fallback successful with {result.model_used}")
                return result
        
        return ActionResult(
            success=False,
            error_message="All models failed. Fallback chain exhausted.",
            error_type="fallback_exhausted",
            fallback_used=True,
            models_attempted=models_attempted,
            latency_ms=int((time.time() - start_time) * 1000)
        )
    
    def _load_prompt(self, prompt_file: str, input_data: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Carga y prepara el prompt"""
        try:
            # Forzamos limpieza del path
            clean_file = prompt_file.strip().replace("\\", "/")
            
            # Si empieza con / o ./ lo quitamos
            if clean_file.startswith("./"): clean_file = clean_file[2:]
            if clean_file.startswith("/"): clean_file = clean_file[1:]
            
            # Si empieza con prompts/ lo quitamos
            if clean_file.startswith("prompts/"):
                clean_file = clean_file.replace("prompts/", "", 1)
            
            prompt_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "prompts"))
            prompt_path = os.path.normpath(os.path.join(prompt_dir, clean_file))
            
            # Log de depuración para ver qué está pasando exactamente
            # print(f"[ACTION_RUNNER] Loading prompt: original='{prompt_file}', clean='{clean_file}', final='{prompt_path}'")
            
            # Security check
            if not prompt_path.startswith(prompt_dir):
                raise Exception(f"Insecure prompt path: {prompt_file}")
            
            if not os.path.exists(prompt_path):
                # Intentamos buscarlo sin el prefijo v3 si fallara, por si acaso
                raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
            
            format_data = {**input_data, **context}
            
            for key, value in format_data.items():
                if isinstance(value, str):
                    prompt_template = prompt_template.replace(f"{{{key}}}", value)
                elif isinstance(value, (int, float, bool)):
                    prompt_template = prompt_template.replace(f"{{{key}}}", str(value))
                    
            return prompt_template
        except Exception as e:
            print(f"[ACTION_RUNNER] Error loading prompt {prompt_file}: {e}")
            return self._get_generic_prompt(prompt_file, input_data, context)
    
    def _get_generic_prompt(self, prompt_file: str, input_data: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Prompt genérico cuando no se encuentra el archivo específico"""
        
        if "triage" in prompt_file:
            return f"Analyze the following code and return a JSON with categorization. Code: \n{{content}}"
        elif "extract" in prompt_file or "strict" in prompt_file:
            return (
                "Extract nodes and edges from this file and return a valid JSON object.\n"
                "SCHEMA TEMPLATE:\n"
                "{\n"
                "  \"nodes\": [{\"node_id\": \"id1\", \"node_type\": \"table\", \"name\": \"name1\", \"system\": \"sql\"}],\n"
                "  \"edges\": [{\"from_node_id\": \"id1\", \"to_node_id\": \"id2\", \"edge_type\": \"data_flow\"}]\n"
                "}\n"
                "File content to analyze:\n{content}"
            )
        elif "translate_logic" in prompt_file:
            return "You are a SQL expert. Translate the following expression to standard SQL. Return JSON: {\"sql\": \"...\", \"explanation\": \"...\"}. Expression: {expression_raw}"
        else:
            return "Generic prompt fallback. Return JSON: {\"status\": \"ok\"}. Context: {content}"
    
    def _requires_json_validation(self, prompt_file: str) -> bool:
        """Determina si el prompt requiere validación JSON"""
        return "extract" in prompt_file or "strict" in prompt_file or "translate_logic" in prompt_file
    
    def _validate_json_schema(self, data: Dict[str, Any], prompt_file: str) -> Optional[str]:
        """Valida el JSON contra el esquema esperado"""
        try:
            if "extract" in prompt_file or "strict" in prompt_file:
                if "nodes" not in data: return "Missing 'nodes' field"
                if "edges" not in data: return "Missing 'edges' field"
                
                # Deep validation of nodes
                for i, node in enumerate(data.get("nodes", [])):
                    if not isinstance(node, dict): return f"node[{i}] is not an object"
                    for field in ["node_id", "node_type", "name"]:
                        if field not in node: return f"node[{i}] missing '{field}'"
                
                # Deep validation of edges
                for i, edge in enumerate(data.get("edges", [])):
                    if not isinstance(edge, dict): return f"edge[{i}] is not an object"
                    for field in ["from_node_id", "to_node_id"]:
                        if field not in edge: return f"edge[{i}] missing '{field}'"
            
            if "translate_logic" in prompt_file:
                if "sql" not in data: return "Missing 'sql' field"
            
            return None
        except Exception as e:
            return str(e)
    
    def _clean_json_response(self, text: str) -> str:
        """Limpia la respuesta del LLM para extraer solo el JSON"""
        if not text:
            return "{}"
        text = text.strip()
        import re
        
        # Try finding multi-line JSON blocks first
        json_match = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", text, re.DOTALL)
        if json_match:
            return json_match.group(1)
            
        # Try finding the first { and last }
        try:
            start = text.index('{')
            end = text.rindex('}') + 1
            return text[start:end]
        except ValueError:
            # Try finding the first [ and last ]
            try:
                start = text.index('[')
                end = text.rindex(']') + 1
                return text[start:end]
            except ValueError:
                return text

    def _estimate_cost(self, model: str, tokens: int) -> float:
        """Estima el costo en USD basado en el modelo y tokens"""
        cost_per_1k = self.cost_estimates.get(model, 0.002)
        return (tokens / 1000) * cost_per_1k

    def translate_logic(self, column_name: str, expression_raw: str, node_name: str, source_system: str) -> ActionResult:
        """
        Translates an SSIS expression to SQL/dbt using LLM.
        """
        input_data = {
            "column_name": column_name,
            "expression_raw": expression_raw,
            "node_name": node_name,
            "source_system": source_system
        }
        
        result = self.run_action(
            action_name="translate_logic",
            input_data=input_data,
            context={"column": column_name, "node": node_name}
        )
        
        return result