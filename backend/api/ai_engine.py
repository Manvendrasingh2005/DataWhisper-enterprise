"""
AI Engine for DataWhisper.
Handles natural language to SQL translation, conversational history,
self-healing SQL correction, executive insights, and visualization recommendations.
"""
import os
import json
import re
import time
from dotenv import load_dotenv
from .schema_inspector import get_prompt_schema_map
from .security import is_safe_sql

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Primary and fallback model priorities
MODELS_TO_TRY = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
]

def clean_sql(raw_text):
    """Strips markdown code fences and cleans SQL string."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    if text.startswith("```sql"):
        text = text[6:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def get_genai_client():
    """Initializes and returns google.genai Client."""
    from google import genai
    return genai.Client(api_key=GEMINI_API_KEY)

def generate_ai_content(prompt, system_instruction=None):
    """
    Calls Gemini API with automatic model fallback for maximum resilience.
    """
    client = get_genai_client()
    last_error = None

    for model_name in MODELS_TO_TRY:
        try:
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction
            
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config if config else None
            )
            if response and response.text:
                return response.text.strip(), model_name
        except Exception as e:
            last_error = e
            continue

    # Fallback to legacy google.generativeai if available
    try:
        import google.generativeai as legacy_genai
        legacy_genai.configure(api_key=GEMINI_API_KEY)
        for legacy_model in ['gemini-3.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']:
            try:
                m = legacy_genai.GenerativeModel(legacy_model)
                res = m.generate_content(f"{system_instruction}\n\n{prompt}" if system_instruction else prompt)
                if res and res.text:
                    return res.text.strip(), legacy_model
            except Exception:
                continue
    except Exception:
        pass

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

def build_prompt_with_history(question, history=None):
    """
    Constructs prompt including prior conversational turns if provided.
    """
    schema_text, _ = get_prompt_schema_map()
    
    prompt_parts = [schema_text, "\nConversation History:"]
    if history and isinstance(history, list):
        for turn in history[-5:]: # Keep last 5 turns for context
            q = turn.get("question")
            sql = turn.get("sql")
            if q and sql:
                prompt_parts.append(f"User: {q}\nSQL: {sql}")

    prompt_parts.append(f"\nCurrent User Question: {question}")
    prompt_parts.append("SQL Query:")
    return "\n\n".join(prompt_parts)

def generate_sql(question, history=None):
    """
    Generates SQL from user question with schema and history context.
    """
    prompt = build_prompt_with_history(question, history)
    system_inst = "You are an expert SQL engineer. Return ONLY the raw SQL SELECT query. Do not wrap in markdown or backticks."
    raw_response, model_used = generate_ai_content(prompt, system_instruction=system_inst)
    cleaned = clean_sql(raw_response)
    return cleaned, model_used

def heal_sql(failed_sql, error_message, original_question):
    """
    Self-healing loop: feeds execution error traceback back to Gemini to correct the query.
    """
    schema_text, _ = get_prompt_schema_map()
    heal_prompt = f"""
{schema_text}

The following SQL query failed during database execution:
FAILED SQL: {failed_sql}
DATABASE ERROR: {error_message}
ORIGINAL USER GOAL: {original_question}

TASK:
Correct the SQL query to resolve the database error.
Ensure all table and column names match the schema exactly.
Return ONLY the raw SQL SELECT statement with no markdown or formatting.
"""
    raw_response, _ = generate_ai_content(
        heal_prompt,
        system_instruction="Fix the SQL query so it runs without error. Return ONLY the raw SQL query."
    )
    return clean_sql(raw_response)

def generate_insights_and_visualization(question, sql, columns, rows):
    """
    Analyzes returned data to generate a plain-English executive summary
    and recommends the optimal chart type.
    """
    if not rows:
        return "No matching records found for this query.", "table"

    # Truncate sample rows for prompt efficiency
    sample_rows = rows[:10]
    
    prompt = f"""
Question: {question}
Executed SQL: {sql}
Columns: {columns}
Sample Results (first {len(sample_rows)} rows):
{json.dumps(sample_rows, default=str)}
Total Records Returned: {len(rows)}

Task:
1. Provide a concise 1-2 sentence executive business insight highlighting the main takeaway, trends, or outliers.
2. Select the single best visualization type from:
   - 'metric_card': if results represent a single aggregate number/stat (1 row, 1 numeric column)
   - 'bar_chart': for comparing distinct categories
   - 'line_chart': for date or time-series trends
   - 'area_chart': for volume trends over time
   - 'pie_chart': for proportional distributions/percentages (fewer than 7 categories)
   - 'table': for multi-column relational listings

Return ONLY valid JSON in this exact structure:
{{
  "insight": "...",
  "suggested_chart": "bar_chart"
}}
"""
    try:
        raw_response, _ = generate_ai_content(prompt, system_instruction="Return ONLY a JSON object with 'insight' and 'suggested_chart'.")
        # Clean JSON fences if present
        cleaned_json = raw_response.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        elif cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]
        
        parsed = json.loads(cleaned_json.strip())
        insight = parsed.get("insight", "Query completed successfully.")
        chart = parsed.get("suggested_chart", "table")
        valid_charts = {'metric_card', 'bar_chart', 'line_chart', 'area_chart', 'pie_chart', 'table'}
        if chart not in valid_charts:
            chart = "bar_chart" if len(columns) >= 2 else "metric_card"
        return insight, chart
    except Exception:
        # Fallback heuristic
        if len(rows) == 1 and len(columns) == 1 and isinstance(rows[0].get(columns[0]), (int, float)):
            return "Single aggregate metric retrieved.", "metric_card"
        elif len(columns) >= 2:
            return "Data breakdown successfully generated.", "bar_chart"
        return "Records retrieved successfully.", "table"
