from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('api/payment', views.home, name='home'),
    path('api/payment_create', views.create_payment, name='create_payment'),
    path('payment-done/', views.payment_done, name='payment_done'),
    path('payment-cancelled/', views.payment_cancelled, name='payment_cancelled'),
    path('paypal/', views.paypal_ipn, name='paypal-ipn'),
]