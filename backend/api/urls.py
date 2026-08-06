from django.urls import path
from . import views

urlpatterns = [
    # This now perfectly matches your views.py function!
    path('ask/', views.ask_ai, name='ask'), 
]