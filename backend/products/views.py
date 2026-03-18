from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from .serializers import ProductSerializer, PurchaseSerializer, UserLoginSerializer, UserProfileSerializer, UserRegistrationSerializer, UserSerializer
from .models import Product, ProductClick, Purchase, UserProfile
from .recommendations import get_ai_recommendations, get_fallback_recommendations
import pyotp
import qrcode
import io
import base64
import requests
from django.conf import settings

def _get_catalog_queryset():
    return Product.objects.all().order_by('name')


def _get_catalog_payload(request=None):
    context = {'request': request} if request else {}
    return ProductSerializer(_get_catalog_queryset(), many=True, context=context).data


def _get_hottest_products(limit=4):
    products = list(_get_catalog_queryset())
    if not products:
        return []

    products_by_id = {str(product.pk): product for product in products}
    products_by_name = {product.name.strip().lower(): product for product in products}
    purchase_counts = {product.pk: 0 for product in products}

    completed_purchases = Purchase.objects.exclude(
        Q(status__iexact='pending') | Q(status__iexact='failed') | Q(status__iexact='refunded')
    )

    for purchase in completed_purchases.iterator():
        matched_product = None
        if purchase.product_id:
            matched_product = products_by_id.get(str(purchase.product_id).strip())

        if matched_product is None and purchase.product_name:
            matched_product = products_by_name.get(purchase.product_name.strip().lower())

        if matched_product is not None:
            purchase_counts[matched_product.pk] += 1

    return sorted(products, key=lambda product: (-purchase_counts[product.pk], product.name.lower()))[:limit]


def _get_hottest_catalog_payload(request=None, limit=4):
    context = {'request': request} if request else {}
    hottest_products = _get_hottest_products(limit=limit)
    return ProductSerializer(hottest_products, many=True, context=context).data


def _forbidden_if_not_admin(request):
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    return None


# Create your views here.
@api_view(['GET'])
@permission_classes([AllowAny])
def getProducts(request):
    return Response(_get_catalog_payload(request))


@api_view(['GET'])
@permission_classes([AllowAny])
def getHottestProducts(request):
    return Response(_get_hottest_catalog_payload(request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_products(request):
    forbidden = _forbidden_if_not_admin(request)
    if forbidden:
        return forbidden
    return Response(_get_catalog_payload(request))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_create_product(request):
    forbidden = _forbidden_if_not_admin(request)
    if forbidden:
        return forbidden

    serializer = ProductSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_update_product(request, pk):
    forbidden = _forbidden_if_not_admin(request)
    if forbidden:
        return forbidden

    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProductSerializer(product, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    User registration endpoint
    """
    if request.method == 'POST':
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Create user profile with 2FA disabled by default
            profile, created = UserProfile.objects.get_or_create(user=user)
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    User login endpoint with optional 2FA check
    """
    if request.method == 'POST':
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            user = authenticate(username=username, password=password)
            if user:
                # Ensure user has a profile (create one if missing)
                profile, created = UserProfile.objects.get_or_create(user=user)
                
                # If 2FA is enabled, require OTP verification
                if profile.two_fa_enabled:
                    return Response({
                        'message': 'OTP verification required',
                        'require_otp': True,
                        'user_id': user.id
                    }, status=status.HTTP_200_OK)
                
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'message': 'Login successful',
                    'user': UserSerializer(user).data,
                    'token': token.key,
                    'require_otp': False
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Invalid username or password'
                }, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP token for 2FA login
    """
    user_id = request.data.get('user_id')
    otp_token = request.data.get('otp_token')
    
    if not user_id or not otp_token:
        return Response({
            'error': 'user_id and otp_token are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Convert to string and strip whitespace
        otp_token = str(otp_token).strip()
        
        if profile.verify_2fa_token(otp_token):
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'OTP verified successfully',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid OTP token. Please check and try again.'
            }, status=status.HTTP_401_UNAUTHORIZED)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """
    Generate QR code for setting up 2FA
    If a secret already exists (from previous setup), use it.
    Otherwise, generate a new one.
    """
    try:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        # If secret already exists (e.g., re-enabling after disable), use it
        if not profile.two_fa_secret:
            profile.generate_2fa_secret()
            profile.save()

        uri = profile.get_2fa_uri()

        # Graceful fallback: if QR rendering fails, still return secret + URI
        # so users can manually add the key in authenticator apps.
        img_data_url = None
        qr_error = None
        try:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(uri)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            img_data_url = f'data:image/png;base64,{img_str}'
        except Exception as qr_exception:
            qr_error = f'QR generation failed: {str(qr_exception)}'

        return Response({
            'message': '2FA setup initiated',
            'secret': profile.two_fa_secret,
            'qr_code': img_data_url,
            'uri': uri,
            'qr_error': qr_error,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Failed to start 2FA setup: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase(request):
    """Create a purchase/transaction for the authenticated user"""
    data = request.data
    try:
        product_name = data.get('product_name') or data.get('name')
        product_id = data.get('product_id')
        purchase_type = data.get('type')
        game = data.get('game')
        coins = data.get('coins')
        cost_coins = data.get('cost_coins')
        quantity = int(data.get('quantity', 1))
        unit = data.get('unit') or data.get('unit_name') or 'unit'
        price = float(data.get('price') or 0)
        user_id_input = data.get('user_id_input')
        payment_method = data.get('payment_method')
        notes = data.get('notes')

        # generate a unique transaction id
        import uuid
        transaction_id = uuid.uuid4().hex

        purchase = Purchase.objects.create(
            user=request.user,
            product_name=product_name or 'Unknown Product',
            product_id=product_id,
            purchase_type=purchase_type,
            game=game,
            coins=int(coins) if coins not in (None, '') else None,
            cost_coins=int(cost_coins) if cost_coins not in (None, '') else None,
            quantity=quantity,
            unit=unit,
            price=price,
            status=data.get('status', 'completed'),
            transaction_id=transaction_id,
            user_id_input=user_id_input,
            payment_method=payment_method,
            notes=notes,
        )

        serializer = PurchaseSerializer(purchase, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_purchases(request):
    purchases = Purchase.objects.filter(user=request.user).order_by('-created_at')
    serializer = PurchaseSerializer(purchases, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_purchases(request):
    # only superusers may access
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    purchases = Purchase.objects.all().order_by('-created_at')
    serializer = PurchaseSerializer(purchases, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    from django.db.models import Sum, F, Count, DecimalField, ExpressionWrapper
    total_orders = Purchase.objects.count()
    total_revenue = Purchase.objects.filter(status='completed').aggregate(
        total=Sum(ExpressionWrapper(F('price') * F('quantity'), output_field=DecimalField()))
    )['total'] or 0
    by_status = {p['status']: p['count'] for p in Purchase.objects.values('status').annotate(count=Count('id'))}
    recent = Purchase.objects.order_by('-created_at')[:10]
    recent_ser = PurchaseSerializer(recent, many=True, context={'request': request})
    return Response({
        'total_orders': total_orders,
        'total_revenue': float(total_revenue),
        'by_status': by_status,
        'recent': recent_ser.data,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_2fa(request):
    """
    Confirm 2FA setup by verifying OTP token
    Works both for initial setup and for re-enabling after disable
    """
    otp_token = request.data.get('otp_token')
    
    if not otp_token:
        return Response({
            'error': 'otp_token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    # Convert to string and strip whitespace
    otp_token = str(otp_token).strip()
    
    if not profile.two_fa_secret:
        return Response({
            'error': 'No 2FA secret found. Please generate a QR code first by visiting the enable 2FA page.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create TOTP instance to verify token (don't require 2FA to be enabled yet)
    totp = pyotp.TOTP(profile.two_fa_secret)
    if totp.verify(otp_token, valid_window=2):
        profile.two_fa_enabled = True
        profile.save()
        return Response({
            'message': '2FA enabled successfully'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Invalid OTP token. Please check and try again.'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Disable 2FA for user
    If 2FA is enabled, require OTP verification for security
    Note: We keep the secret stored so user can re-enable without scanning QR code again
    """
    try:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        otp_token = request.data.get('otp_token')
        
        # If 2FA is enabled, require OTP verification to disable it
        if profile.two_fa_enabled and profile.two_fa_secret:
            if not otp_token:
                return Response({
                    'error': 'OTP token required to disable 2FA'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify the OTP token
            totp = pyotp.TOTP(profile.two_fa_secret)
            if not totp.verify(otp_token, valid_window=2):
                return Response({
                    'error': 'Invalid OTP token. Please try again.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        profile.two_fa_enabled = False
        # Don't clear the secret - keep it so user can re-enable by just verifying OTP
        profile.save()
        print(f"2FA disabled for user {request.user.username}")
        return Response({
            'message': '2FA disabled successfully',
            'two_fa_enabled': False
        }, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error disabling 2FA: {str(e)}")
        return Response({
            'error': f'Failed to disable 2FA: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    User logout endpoint
    """
    request.user.auth_token.delete()
    return Response({
        'message': 'Successfully logged out'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """
    Get current user profile
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    serializer = UserProfileSerializer(profile, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_user_profile(request):
    """
    Update user profile
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    user = request.user

    # Update user fields
    if 'first_name' in request.data:
        user.first_name = request.data['first_name']
    if 'last_name' in request.data:
        user.last_name = request.data['last_name']
    if 'email' in request.data:
        user.email = request.data['email']
    user.save()

    # Update profile fields
    if 'bio' in request.data:
        profile.bio = request.data['bio']

    # Accept profile picture upload
    if 'profile_picture' in request.FILES:
        profile.profile_picture = request.FILES['profile_picture']

    profile.save()

    serializer = UserProfileSerializer(profile, context={'request': request})
    return Response({
        'message': 'Profile updated successfully',
        'data': serializer.data
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_2fa_code(request):
    """
    DEBUG: Get current OTP code for testing (remove in production)
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if not profile.two_fa_secret:
        return Response({
            'error': 'No 2FA secret configured'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    totp = pyotp.TOTP(profile.two_fa_secret)
    current_code = totp.now()
    
    return Response({
        'current_otp': current_code,
        'secret': profile.two_fa_secret,
        'message': 'DEBUG: This is your current OTP code. DO NOT use in production!'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def getProduct(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProductSerializer(product, context={'request': request}).data)

@api_view(['GET'])
def getRoutes(request):
    routes = [
        '/api/products/',
        '/api/products/<id>/',
        '/api/admin/products/',
        '/api/admin/products/create/',
        '/api/admin/products/<id>/update/',
    ]
    return Response(routes)

@api_view(['POST'])
@permission_classes([AllowAny])
def llm_search(request):
    query = request.data.get('query', '').strip()
    if not query:
        return Response({'ids': []})

    catalog_products = _get_catalog_payload()
    if not catalog_products:
        return Response({'ids': []})

    catalog = "\n".join([f"ID {p['_id']}: {p['name']} - {p['description']}" for p in catalog_products])

    prompt = (
        f"You are an intelligent game search assistant for a gaming top-up store. "
        f"Understand the user's search intent and match it with relevant products based on genre, gameplay, or themes. "
        f"For example: 'gacha' should match gacha games like Genshin Impact and Honkai, "
        f"'shooter' should match FPS/TPS games like Call of Duty, PUBG, Valorant. "
        f"Return ONLY a JSON array of matching product IDs (as strings). "
        f"Return an empty array [] if nothing matches. Do not explain, just return the array.\n\n"
        f"Catalog:\n{catalog}\n\n"
        f"User Search Query: \"{query}\"\n\n"
        f"Response (JSON array only):"
    )
    
    try:
        if not settings.GROQ_API_KEY:
            return Response({'ids': [], 'error': 'GROQ_API_KEY is not configured'}, status=500)

        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {settings.GROQ_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': settings.GROQ_MODEL,
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a search assistant. Return only a JSON array of product IDs.',
                    },
                    {'role': 'user', 'content': prompt},
                ],
                'temperature': 0.1,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        text = payload.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        import json
        matched_ids = json.loads(text.strip())
        return Response({'ids': matched_ids})
    except Exception as e:
        print(f"LLM Search Error: {e}")
        return Response({'ids': [], 'error': str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def get_recommendations(request):
    try:
        catalog_products = _get_catalog_payload(request)
        if not catalog_products:
            return Response({'products': [], 'count': 0}, status=status.HTTP_200_OK)

        if request.user.is_authenticated:
            recommended_ids = get_ai_recommendations(request.user, catalog_products, limit=4)
        else:
            recommended_ids = get_fallback_recommendations(catalog_products, limit=4)
        
        recommended_products = [p for p in catalog_products if p['_id'] in recommended_ids]
        
        return Response({
            'products': recommended_products,
            'count': len(recommended_products)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        catalog_products = _get_catalog_payload(request)
        fallback_ids = get_fallback_recommendations(catalog_products, limit=4)
        fallback_products = [p for p in catalog_products if p['_id'] in fallback_ids]
        
        return Response({
            'products': fallback_products,
            'count': len(fallback_products),
            'error': str(e)
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_product_click(request):
    try:
        product_id = request.data.get('product_id')
        product_name = request.data.get('product_name')
        
        if not product_id or not product_name:
            return Response({
                'error': 'product_id and product_name are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ProductClick.objects.create(
            user=request.user,
            product_id=product_id,
            product_name=product_name
        )
        
        return Response({
            'message': 'Product click tracked successfully'
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)