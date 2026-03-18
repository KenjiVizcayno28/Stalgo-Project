from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
import json
from .models import Payment
from .forms import PaymentForm
from django.conf import settings

@require_http_methods(["GET"])
def home(request):
    return JsonResponse({'status': 'ready', 'message': 'Payment API is ready'})

@csrf_exempt
@require_http_methods(["POST"])
def create_payment(request):
    try:
        data = json.loads(request.body)
        form = PaymentForm(data)
        if form.is_valid():
            capture_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            amount = form.cleaned_data['amount']
            
            # Save to database
            payment = Payment.objects.create(
                name=form.cleaned_data['name'],
                email=form.cleaned_data['email'],
                amount=amount,
                invoice_id=capture_time,
                status='pending'
            )
            
            payer_info = {
                'name': form.cleaned_data['name'],
                'email': form.cleaned_data['email'],
                'amount': str(amount),
                'invoice_id': capture_time,
            }
            
            # PayPal sandbox info
            paypal_data = {
                'receiver_email': settings.PAYPAL_RECEIVER,
                'amount': str(amount),
                'invoice': capture_time,
                'business': settings.PAYPAL_RECEIVER,
                'item_name': 'Payment',
                'currency_code': 'USD',
            }
            
            return JsonResponse({
                'status': 'success',
                'payer_info': payer_info,
                'paypal_data': paypal_data,
                'payment_id': payment.id
            })
        else:
            return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

@require_http_methods(["GET"])
def payment_done(request):
    return JsonResponse({'status': 'success', 'message': 'Payment completed successfully'})

@require_http_methods(["GET"])
def payment_cancelled(request):
    return JsonResponse({'status': 'cancelled', 'message': 'Payment was cancelled'})

@csrf_exempt
@require_http_methods(["POST"])
def paypal_ipn(request):
    return JsonResponse({'status': 'received'})