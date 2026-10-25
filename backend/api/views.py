import json
import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .security import is_safe_sql
from .schema_inspector import introspect_schema
from .ai_engine import (
    generate_sql,
    heal_sql,
    generate_insights_and_visualization
)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_ai(request):
    """
    Main Conversational Natural Language to SQL Endpoint.
    Translates questions, self-heals syntax errors, validates security,
    executes queries, and synthesizes executive insights and chart recommendations.
    """
    start_time = time.perf_counter()
    try:
        data = json.loads(request.body)
        user_question = data.get('question', '').strip()
        history = data.get('history', [])

        if not user_question:
            return JsonResponse({'error': 'Please provide a question.'}, status=400)

        # 1. Generate initial SQL via AI Engine
        generated_sql, model_name = generate_sql(user_question, history=history)

        # 2. Run through AST Security Sandbox
        is_safe, message = is_safe_sql(generated_sql)
        if not is_safe:
            return JsonResponse({
                'error': f'Query blocked by Security Middleware: {message}',
                'sql': generated_sql
            }, status=403)

        # 3. Execution & Self-Healing Loop
        columns = []
        results = []
        was_healed = False
        max_retries = 2
        current_sql = generated_sql

        for attempt in range(max_retries + 1):
            try:
                with connection.cursor() as cursor:
                    cursor.execute(current_sql)
                    if cursor.description:
                        columns = [col[0] for col in cursor.description]
                        rows = cursor.fetchall()
                        results = [dict(zip(columns, row)) for row in rows]
                    else:
                        columns = []
                        results = []
                # If we get here, execution succeeded!
                break
            except Exception as db_err:
                if attempt < max_retries:
                    # Trigger Self-Healing Loop
                    try:
                        healed_sql = heal_sql(current_sql, str(db_err), user_question)
                        safe_healed, heal_msg = is_safe_sql(healed_sql)
                        if safe_healed:
                            current_sql = healed_sql
                            was_healed = True
                            continue
                    except Exception:
                        pass
                # If retries exhausted or healing failed
                return JsonResponse({
                    'error': f"Database execution error: {str(db_err)}",
                    'sql': current_sql
                }, status=500)

        execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 4. Generate AI Business Insight & Chart Recommendation
        insight, suggested_chart = generate_insights_and_visualization(
            user_question, current_sql, columns, results
        )

        return JsonResponse({
            'status': 'success',
            'question': user_question,
            'sql': current_sql,
            'columns': columns,
            'rows': results,
            'row_count': len(results),
            'insight': insight,
            'suggested_chart': suggested_chart,
            'execution_time_ms': execution_time_ms,
            'healed': was_healed,
            'model': model_name
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_raw_sql(request):
    """
    SQL Workbench Runner.
    Allows developers & analysts to edit and run custom SQL safely.
    """
    start_time = time.perf_counter()
    try:
        data = json.loads(request.body)
        raw_sql = data.get('query', '').strip()

        if not raw_sql:
            return JsonResponse({'error': 'No SQL query provided.'}, status=400)

        # Validate through security sandbox
        is_safe, message = is_safe_sql(raw_sql)
        if not is_safe:
            return JsonResponse({'error': f'Security Block: {message}'}, status=403)

        with connection.cursor() as cursor:
            cursor.execute(raw_sql)
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                results = [dict(zip(columns, row)) for row in rows]
            else:
                columns = []
                results = []

        execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return JsonResponse({
            'status': 'success',
            'sql': raw_sql,
            'columns': columns,
            'rows': results,
            'row_count': len(results),
            'execution_time_ms': execution_time_ms
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_database_schema(request):
    """
    Returns active database tables and column definitions for the frontend Schema Explorer.
    """
    try:
        schema = introspect_schema()
        return JsonResponse({
            'status': 'success',
            'vendor': schema['vendor'],
            'tables': schema['tables']
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)