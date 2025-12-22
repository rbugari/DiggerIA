from typing import Dict, Any
from ..models.planning import Strategy

class Estimator:
    """
    Estimates cost and time for processing files based on strategy.
    Reference: discover_ai_v_3.md
    """
    
    # Cost per 1k tokens (approx, blended rate)
    COST_PER_1K_TOKENS_INPUT = 0.005 # $5 per 1M tokens (GPT-4o / Claude 3.5 Sonnet range)
    COST_PER_1K_TOKENS_OUTPUT = 0.015
    
    # Speed (bytes per second)
    PARSER_SPEED_BPS = 1_000_000 # 1MB/s
    LLM_SPEED_TOKENS_SEC = 50 # tokens/sec generation
    
    @staticmethod
    def estimate(size_bytes: int, strategy: Strategy) -> Dict[str, Any]:
        """
        Returns {
            "tokens": int,
            "cost_usd": float,
            "time_seconds": float
        }
        """
        if strategy == Strategy.SKIP:
            return {"tokens": 0, "cost_usd": 0.0, "time_seconds": 0.0}
            
        # Estimate Tokens (4 chars per token approx)
        estimated_input_tokens = size_bytes / 4
        
        # Output tokens usually a fraction of input for extraction (e.g. 10-20%)
        # or fixed overhead for summaries.
        estimated_output_tokens = estimated_input_tokens * 0.2 
        
        if strategy == Strategy.PARSER_ONLY:
            # Parser is cheap
            return {
                "tokens": 0,
                "cost_usd": 0.0,
                "time_seconds": max(0.1, size_bytes / Estimator.PARSER_SPEED_BPS)
            }
            
        elif strategy == Strategy.LLM_ONLY:
            cost = ((estimated_input_tokens / 1000) * Estimator.COST_PER_1K_TOKENS_INPUT) + \
                   ((estimated_output_tokens / 1000) * Estimator.COST_PER_1K_TOKENS_OUTPUT)
            
            time = (estimated_output_tokens / Estimator.LLM_SPEED_TOKENS_SEC) + 1.0 # +1s latency
            
            return {
                "tokens": int(estimated_input_tokens + estimated_output_tokens),
                "cost_usd": round(cost, 4),
                "time_seconds": round(time, 2)
            }
            
        elif strategy == Strategy.PARSER_PLUS_LLM:
            # Hybrid: Parser reduces input size for LLM
            # Assume parser reduces context by 50% (removing noise)
            reduced_input = estimated_input_tokens * 0.5
            cost = ((reduced_input / 1000) * Estimator.COST_PER_1K_TOKENS_INPUT) + \
                   ((estimated_output_tokens / 1000) * Estimator.COST_PER_1K_TOKENS_OUTPUT)
            
            time = (estimated_output_tokens / Estimator.LLM_SPEED_TOKENS_SEC) + 1.0
            
            return {
                "tokens": int(reduced_input + estimated_output_tokens),
                "cost_usd": round(cost, 4),
                "time_seconds": round(time, 2)
            }
            
        return {"tokens": 0, "cost_usd": 0.0, "time_seconds": 0.0}
