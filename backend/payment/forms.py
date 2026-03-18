from django import forms
from django.forms import ModelForm
from .models import Payment

class PaymentForm(ModelForm):
    name = forms.CharField(max_length=100, label='Name')
    email = forms.EmailField(label='Email')
    amount = forms.DecimalField(max_digits=10, decimal_places=2, label='Amount')

    class Meta:
        model = Payment
        fields = ['name', 'email', 'amount']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'class': 'form-control'}),
        }