from django.shortcuts import render
from django.http import JsonResponse
from .products import products
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer, UserProfileSerializer
from .models import UserProfile
from .models import Purchase
from .serializers import PurchaseSerializer
import pyotp
import qrcode
import io
import base64
import google.generativeai as genai
from django.conf import settings

# Create your views here.
@api_view(['GET'])
@permission_classes([AllowAny])
def getProducts(request):
    return Response(products)

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
    profile = request.user.profile
    
    # If secret already exists (e.g., re-enabling after disable), use it
    if not profile.two_fa_secret:
        profile.generate_2fa_secret()
        profile.save()
    
    uri = profile.get_2fa_uri()
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return Response({
        'message': '2FA setup initiated',
        'secret': profile.two_fa_secret,
        'qr_code': f'data:image/png;base64,{img_str}',
        'uri': uri
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase(request):
    """Create a purchase/transaction for the authenticated user"""
    data = request.data
    try:
        product_name = data.get('product_name') or data.get('name')
        product_id = data.get('product_id')
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
    
    profile = request.user.profile
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
        profile = request.user.profile
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
    try:
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'Profile not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_user_profile(request):
    """
    Update user profile
    """
    try:
        profile = request.user.profile
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
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'Profile not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_2fa_code(request):
    """
    DEBUG: Get current OTP code for testing (remove in production)
    """
    profile = request.user.profile
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
    product = None
    for i in products:
        if i['_id'] == pk:
            product = i
            break
    return Response(product)

@api_view(['GET'])
def getRoutes(request):
    routes = [
        '/api/products/',
        '/api/products/create/',

        '/api/products/upload/',

        '/api/products/<id>/reviews/',

        '/api/products/top/',
        '/api/products/<id>/',

        '/api/products/delete/<id>/',
        '/api/products/update/<id>/',
    ]
    return Response(routes)

@api_view(['POST'])
@permission_classes([AllowAny])
def llm_search(request):
    query = request.data.get('query', '').strip()
    if not query:
        return Response({'ids': []})

    catalog = "\n".join([f"ID {p['_id']}: {p['name']} - {p['description']}" for p in products])

    prompt = (
        f"You are a game search assistant for a game top-up store. "
        f"Given the user's search query, return ONLY a JSON array of matching product IDs (as strings) from the catalog below. "
        f"Return an empty array [] if nothing matches. Do not explain, just return the array.\n\n"
        f"Catalog:\n{catalog}\n\n"
        f"Query: \"{query}\"\n\n"
        f"Response (JSON array only):"
    )

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        import json
        ids = json.loads(text.strip())
        return Response({'ids': ids})
    except Exception as e:
        return Response({'ids': [], 'error': str(e)}, status=500)