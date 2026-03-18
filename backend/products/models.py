from django.db import models
from django.contrib.auth.models import User
import pyotp


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=100)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    unit_design_image = models.ImageField(upload_to='unit_designs/', blank=True, null=True)
    unit_design_image_url = models.URLField(blank=True, null=True)
    unit_design_emoji = models.CharField(max_length=16, blank=True, null=True)
    unit_design_color = models.CharField(max_length=20, default='#28a745')
    unit_design_border_color = models.CharField(max_length=20, default='#1e7e34')
    in_stock = models.BooleanField(default=True)
    category = models.CharField(max_length=100, default='Game Top-Up')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    """Extended user profile model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    two_fa_enabled = models.BooleanField(default=False)
    two_fa_secret = models.CharField(max_length=32, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'
    
    def generate_2fa_secret(self):
        """Generate a new TOTP secret for Google Authenticator"""
        try:
            # pyotp.random_base32() returns a random secret string
            self.two_fa_secret = pyotp.random_base32()
        except Exception as e:
            raise ValueError(f'Failed to generate 2FA secret: {str(e)}')
        return self.two_fa_secret
    
    def get_2fa_uri(self):
        """Get the provisioning URI for QR code generation"""
        if not self.two_fa_secret:
            self.generate_2fa_secret()
        totp = pyotp.TOTP(self.two_fa_secret)
        return totp.provisioning_uri(
            name=self.user.email,
            issuer_name='DataStAlgo Shop'
        )
    
    def verify_2fa_token(self, token):
        """Verify a TOTP token from Google Authenticator
        Allows for time drift of ±1 time window (30 seconds each side)"""
        if not self.two_fa_enabled or not self.two_fa_secret:
            return False
        try:
            # Ensure token is a string
            token = str(token).strip()
            # Ensure secret is set
            if not self.two_fa_secret:
                return False
            totp = pyotp.TOTP(self.two_fa_secret)
            # Allow for time skew (±1 means checking current window and adjacent windows)
            # This accounts for minor time synchronization differences between devices
            return totp.verify(token, valid_window=2)  # Increased window for more tolerance
        except Exception as e:
            print(f"2FA verification error: {e}")
            return False


class Purchase(models.Model):
    """Purchase/Transaction model"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    product_name = models.CharField(max_length=255)
    product_id = models.CharField(max_length=50, blank=True, null=True)
    purchase_type = models.CharField(max_length=20, blank=True, null=True)
    game = models.CharField(max_length=100, blank=True, null=True)
    coins = models.PositiveIntegerField(blank=True, null=True)
    cost_coins = models.PositiveIntegerField(blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, blank=True, default='unit')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    transaction_id = models.CharField(max_length=100, unique=True)
    user_id_input = models.CharField(max_length=100, blank=True, null=True, help_text="User-provided game ID")
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product_name} (${self.price})"
    
class SearchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='searches')
    query = models.CharField(max_length=255)
    matched_product_ids = models.JSONField(default=list, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} searched '{self.query}'"

class ProductClick(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_clicks')
    product_id = models.CharField(max_length=50)
    product_name = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.username} clicked {self.product_name}"