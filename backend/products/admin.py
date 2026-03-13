from django.contrib import admin

from .models import Product, ProductClick, Purchase, SearchHistory, UserProfile


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
	list_display = ('name', 'unit', 'price', 'in_stock', 'updated_at')
	list_filter = ('in_stock', 'category')
	search_fields = ('name', 'description', 'unit')


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
	list_display = ('product_name', 'user', 'purchase_type', 'game', 'price', 'status', 'created_at')
	list_filter = ('status', 'purchase_type', 'game')
	search_fields = ('product_name', 'transaction_id', 'user__username')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
	list_display = ('user', 'two_fa_enabled', 'created_at')
	search_fields = ('user__username', 'user__email')


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
	list_display = ('user', 'query', 'timestamp')
	search_fields = ('user__username', 'query')


@admin.register(ProductClick)
class ProductClickAdmin(admin.ModelAdmin):
	list_display = ('user', 'product_name', 'timestamp')
	search_fields = ('user__username', 'product_name')
