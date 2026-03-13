from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, UserProfile, Purchase


class ProductSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source='pk', read_only=True)
    countInStock = serializers.SerializerMethodField()
    unitDesign = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            '_id',
            'id',
            'name',
            'description',
            'price',
            'unit',
            'image',
            'image_url',
            'unit_design_image',
            'unit_design_image_url',
            'unit_design_emoji',
            'unit_design_color',
            'unit_design_border_color',
            'unitDesign',
            'in_stock',
            'countInStock',
            'category',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', '_id', 'countInStock', 'unitDesign', 'created_at', 'updated_at']

    def _build_file_url(self, field):
        if not field:
            return None
        request = self.context.get('request')
        try:
            url = field.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    def _resolve_media_url(self, field, fallback_url=None):
        file_url = self._build_file_url(field)
        if file_url:
            return file_url
        return fallback_url or None

    def get_countInStock(self, obj):
        return 1 if obj.in_stock else 0

    def get_unitDesign(self, obj):
        design = {
            'color': obj.unit_design_color,
            'borderColor': obj.unit_design_border_color,
        }
        image_url = self._resolve_media_url(obj.unit_design_image, obj.unit_design_image_url)
        if image_url:
            design['image'] = image_url
        if obj.unit_design_emoji:
            design['emoji'] = obj.unit_design_emoji
        return design

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['image'] = self._resolve_media_url(instance.image, instance.image_url)
        data['unit_design_image'] = self._resolve_media_url(instance.unit_design_image, instance.unit_design_image_url)
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_superuser']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['user', 'bio', 'profile_picture', 'created_at', 'updated_at']

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            try:
                url = obj.profile_picture.url
                if request is not None:
                    return request.build_absolute_uri(url)
                return url
            except Exception:
                return None
        return None

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password2 = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({'username': 'Username already exists'})
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'Email already registered'})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class PurchaseSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    type = serializers.CharField(source='purchase_type', read_only=True)
    
    class Meta:
        model = Purchase
        fields = ['id', 'user', 'product_name', 'product_id', 'type', 'game', 'coins', 'cost_coins', 'quantity', 'unit', 'price', 'status', 'transaction_id', 'user_id_input', 'payment_method', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
