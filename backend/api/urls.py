from django.urls import path
from . import views

urlpatterns = [
    path('ask/', views.ask_ai, name='ask'),
    path('execute-raw/', views.execute_raw_sql, name='execute_raw'),
    path('schema/', views.get_database_schema, name='schema'),
    path('test-db/', views.test_db_connection, name='test_db'),
]