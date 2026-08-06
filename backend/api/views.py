import json
import sqlparse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

def is_safe_sql(sql):
    """
    Core Security Sandbox:
    1. Parses the raw SQL string.
    2. Blocks multiple chained statements (prevents SQL injection via ';').
    3. Strictly enforces that the query is a SELECT statement.
    """
    parsed = sqlparse.parse(sql)
    
    # 1. Prevent multiple chained statements (e.g., "SELECT * FROM users; DROP TABLE users;")
    if len(parsed) > 1:
        return False, "Multiple SQL statements are not allowed."
        
    if not parsed:
        return False, "No valid SQL found."
        
    statement = parsed[0]
    
    # 2. Extract the core command type (SELECT, DROP, UPDATE, etc.)
    command_type = statement.get_type()
    
    # 3. Whitelist ONLY 'SELECT' commands
    if command_type != 'SELECT':
        return False, f"Security Violation: '{command_type}' commands are strictly blocked. Only SELECT is allowed."
        
    return True, "Safe"

@csrf_exempt # Used for local development to allow React to hit this endpoint
def execute_sql(request):
    if request.method == 'POST':
        try:
            # Extract the raw SQL from the incoming React request
            data = json.loads(request.body)
            raw_sql = data.get('query', '').strip()
            
            if not raw_sql:
                return JsonResponse({'error': 'No query provided'}, status=400)
                
            # Run the query through our security vault
            is_safe, message = is_safe_sql(raw_sql)
            if not is_safe:
                return JsonResponse({'error': f'Blocked by Security Middleware: {message}'}, status=403)
                
            # If safe, execute the query against the database
            with connection.cursor() as cursor:
                cursor.execute(raw_sql)
                
                # Extract column names dynamically so React can build table headers
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                # Zip columns and rows together into a clean JSON array
                results = [dict(zip(columns, row)) for row in rows]
                
            return JsonResponse({
                'status': 'success',
                'columns': columns,
                'rows': results
            })
            
        except Exception as e:
            # Catch bad table names, bad syntax, etc.
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Method not allowed. Use POST.'}, status=405)

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load the secret API key from the .env file
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Define the blueprint of your database to teach the AI
DATABASE_SCHEMA_MAP = """
You are a senior SQL data engineer. Translate the question into a highly accurate, optimized SQL SELECT statement for SQLite.

Schema:
Table: api_supplier
- id (integer, pk)
- name (varchar)
- contact_email (varchar)
- country (varchar)

Table: api_user
- id (integer, pk)
- name (varchar)
- email (varchar)
- city (varchar)
- status (varchar) -> 'active' or 'churned'

Table: api_product
- id (integer, pk)
- title (varchar)
- category (varchar)
- sku (varchar)
- cost_price (numeric) -> wholesale cost
- selling_price (numeric) -> what the customer pays
- stock_count (integer)
- supplier_id (integer, fk to api_supplier.id)

Table: api_order
- id (integer, pk)
- user_id (integer, fk to api_user.id)
- order_date (timestamp)
- total_amount (numeric)
- status (varchar) -> 'completed' or 'cancelled'

Table: api_orderitem
- id (integer, pk)
- order_id (integer, fk to api_order.id)
- product_id (integer, fk to api_product.id)
- quantity (integer)
- price_per_unit (numeric)

Table: api_payment
- id (integer, pk)
- order_id (integer, fk to api_order.id, unique)
- payment_method (varchar) -> 'Credit Card', 'UPI', 'PayPal', 'NetBanking'
- transaction_id (varchar)
- gateway_response (varchar) -> 'SUCCESS', 'FAILED'
- processed_at (timestamp)

Table: api_inventorylog
- id (integer, pk)
- product_id (integer, fk to api_product.id)
- movement_type (varchar) -> 'IN', 'OUT'
- quantity (integer)
- logged_at (timestamp)

CRITICAL RULES:
1. Return ONLY the raw SQL string (no markdown, no backticks).
2. Only write SELECT commands.
3. THERE IS NO "price" COLUMN. If asked about "price", "expensive", or "cheapest", ALWAYS use the "selling_price" column.
4. To calculate profit margins, use (selling_price - cost_price).
5. BUSINESS DEFINITION: If a user asks about "low stock", assume that means a stock_count of less than 50.
"""

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_ai(request):
    """
    Takes natural language, asks Gemini for SQL, validates it, and executes it.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_question = data.get('question', '').strip()
            
            if not user_question:
                return JsonResponse({'error': 'Please provide a question.'}, status=400)

            # 1. Ask Gemini to write the SQL
            model = genai.GenerativeModel('gemini-3.5-flash')
            prompt = f"{DATABASE_SCHEMA_MAP}\n\nUser Question: {user_question}\nSQL Query:"
            
            response = model.generate_content(prompt)
            generated_sql = response.text.strip()
            
            # Remove rogue markdown blocks if the AI disobeys rule 2
            if generated_sql.startswith("```sql"):
                generated_sql = generated_sql[6:-3].strip()
            elif generated_sql.startswith("```"):
                generated_sql = generated_sql[3:-3].strip()

            # 2. Pass the AI's SQL through your security vault!
            is_safe, message = is_safe_sql(generated_sql)
            if not is_safe:
                return JsonResponse({
                    'error': f'AI generated an unsafe query. Blocked: {message}',
                    'sql': generated_sql
                }, status=403)

            # 3. Execute the safe query
            with connection.cursor() as cursor:
                cursor.execute(generated_sql)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                results = [dict(zip(columns, row)) for row in rows]

            # Return the English question, the generated SQL, and the actual data!
            return JsonResponse({
                'status': 'success',
                'question': user_question,
                'sql': generated_sql,
                'columns': columns,
                'rows': results
            })

        except Exception as e:
            import traceback
            traceback.print_exc() # <--- THIS LINE PRINTS THE ERROR TO YOUR TERMINAL
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed.'}, status=405)