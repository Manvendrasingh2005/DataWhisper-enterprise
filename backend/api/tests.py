"""
Comprehensive Test Suite for DataWhisper Enterprise.
Tests AST-level security sandbox, schema inspector, external DB connector,
and API REST endpoints.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from api.security import is_safe_sql
from api.schema_inspector import introspect_schema, get_prompt_schema_map
from api.models import Supplier, Product

class SecuritySandboxTests(TestCase):
    """Tests the AST-level SQL security sandbox."""

    def test_allows_valid_select_queries(self):
        safe_queries = [
            "SELECT * FROM api_product;",
            "SELECT name, country FROM api_supplier WHERE country = 'Taiwan'",
            "SELECT category, AVG(selling_price) FROM api_product GROUP BY category ORDER BY 2 DESC",
            "SELECT p.title, s.name FROM api_product p JOIN api_supplier s ON p.supplier_id = s.id LIMIT 10"
        ]
        for query in safe_queries:
            is_safe, msg = is_safe_sql(query)
            self.assertTrue(is_safe, f"Expected safe for query: {query}, got: {msg}")

    def test_blocks_dml_and_ddl_queries(self):
        dangerous_queries = [
            "DROP TABLE api_product",
            "TRUNCATE TABLE api_supplier",
            "DELETE FROM api_user WHERE status = 'churned'",
            "UPDATE api_product SET selling_price = 0",
            "INSERT INTO api_user (name, email) VALUES ('Hacker', 'hacked@hack.com')",
            "ALTER TABLE api_user ADD COLUMN password_leak text"
        ]
        for query in dangerous_queries:
            is_safe, msg = is_safe_sql(query)
            self.assertFalse(is_safe, f"Expected unsafe for: {query}")
            self.assertIn("Security Violation", msg)

    def test_blocks_chained_queries(self):
        chained_sql = "SELECT * FROM api_product; DROP TABLE api_product;"
        is_safe, msg = is_safe_sql(chained_sql)
        self.assertFalse(is_safe)
        self.assertIn("Multiple SQL statements", msg)

    def test_blocks_sensitive_auth_and_system_tables(self):
        sensitive_queries = [
            "SELECT * FROM auth_user",
            "SELECT password FROM auth_user WHERE is_superuser = 1",
            "SELECT * FROM django_session",
            "SELECT * FROM sqlite_sequence"
        ]
        for query in sensitive_queries:
            is_safe, msg = is_safe_sql(query)
            self.assertFalse(is_safe, f"Expected blocked table access for: {query}")
            self.assertIn("Security Violation", msg)


class SchemaInspectorTests(TestCase):
    """Tests dynamic schema introspection."""

    def test_introspect_schema_discovers_application_tables(self):
        schema = introspect_schema()
        self.assertIn("vendor", schema)
        self.assertIn("tables", schema)
        self.assertIn("api_product", schema["tables"])
        self.assertIn("api_supplier", schema["tables"])

    def test_system_tables_excluded_from_introspection(self):
        schema = introspect_schema()
        table_names = list(schema["tables"].keys())
        for name in table_names:
            self.assertFalse(name.startswith("auth_"), f"Internal auth table found: {name}")
            self.assertFalse(name.startswith("django_"), f"Internal django table found: {name}")

    def test_prompt_schema_map_generation(self):
        prompt_text, schema_obj = get_prompt_schema_map()
        self.assertIn("CRITICAL RULES:", prompt_text)
        self.assertIn("Table: api_product", prompt_text)


class ApiEndpointTests(TestCase):
    """Tests REST endpoints with authentication."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testanalyst', password='testpassword123')
        self.client.force_authenticate(user=self.user)
        
        # Create test supplier and product
        supplier = Supplier.objects.create(name="Alpha Test", contact_email="a@test.com", country="USA")
        Product.objects.create(
            title="Test Gadget",
            category="Electronics",
            sku="SKU-TEST-1",
            cost_price=50.00,
            selling_price=100.00,
            stock_count=120,
            supplier=supplier
        )

    def test_schema_endpoint(self):
        res = self.client.get('/api/schema/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get('status'), 'success')
        self.assertIn('api_product', data.get('tables', {}))

    def test_execute_raw_sql_safe(self):
        res = self.client.post('/api/execute-raw/', {'query': 'SELECT title, selling_price FROM api_product'}, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data.get('row_count'), 1)
        self.assertEqual(data['rows'][0]['title'], 'Test Gadget')

    def test_execute_raw_sql_blocks_malicious_query(self):
        res = self.client.post('/api/execute-raw/', {'query': 'DELETE FROM api_product'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertIn('error', res.json())

    def test_unauthenticated_request_rejected(self):
        unauth_client = APIClient()
        res = unauth_client.get('/api/schema/')
        self.assertEqual(res.status_code, 401)
