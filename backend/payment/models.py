from django.db import models
from django.core.exceptions import ValidationError
# Create your models here.

class Payment(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_payment = models.DateTimeField(auto_now_add=True)
    status = models.TextField(blank=True, default='N/A')
    invoice_id = models.CharField(max_length=100, blank=True, default='')

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Payment amount must be greater than zero.')