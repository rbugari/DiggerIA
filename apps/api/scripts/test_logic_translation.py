import json
from app.models.cir import CIRTransformation

# Mock Input: What the Deep Parser extracted
raw_transforms = [
    CIRTransformation(node_id="1", column_name="FullName", expression_raw="(DT_WSTR,50)[FirstName] + \" \" + [LastName]"),
    CIRTransformation(node_id="1", column_name="TaxAmount", expression_raw="ISNULL([Price]) ? 0 : [Price] * 1.21"),
    CIRTransformation(node_id="2", column_name="LoadDate", expression_raw="GETDATE()")
]

def simulate_logic_injection():
    print("--- Starting Logic Injection Simulation ---\n")
    
    # Load Prompt Template
    with open("app/prompts/ssis_logic_translation.md", "r") as f:
        prompt_template = f.read()
    
    print(f"Loaded Prompt Template ({len(prompt_template)} chars)\n")
    
    for t in raw_transforms:
        print(f"Processing Transform: {t.expression_raw}")
        
        # 1. Construct Prompt (Simulation)
        user_prompt = f"""
        Translate this SSIS expression to SQL (BigQuery dialect):
        {json.dumps({"expression_raw": t.expression_raw, "dialect": "BigQuery"})}
        """
        
        # 2. Simulate LLM Response (Mocking the AI part)
        # In a real scenario, this would call ActionRunner._execute_llm
        if "DT_WSTR" in t.expression_raw:
            mock_response = {
                "expression_standard": "CAST(FirstName AS STRING) || ' ' || LastName",
                "confidence": 0.98
            }
        elif "ISNULL" in t.expression_raw:
            mock_response = {
                "expression_standard": "COALESCE(Price, 0) * 1.21",
                "confidence": 0.99
            }
        elif "GETDATE" in t.expression_raw:
            mock_response = {
                "expression_standard": "CURRENT_TIMESTAMP()",
                "confidence": 0.95
            }
            
        # 3. Apply Result
        t.expression_standard = mock_response["expression_standard"]
        t.confidence = mock_response["confidence"]
        
        print(f"  -> Translated: {t.expression_standard}")
        print(f"  -> Confidence: {t.confidence}\n")

if __name__ == "__main__":
    simulate_logic_injection()
