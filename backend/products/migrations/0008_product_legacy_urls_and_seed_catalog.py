from django.db import migrations, models


SEED_PRODUCTS = [
    {
        'name': 'Mobile Legends Bang Bang',
        'description': 'Buy Mobile Legends Diamonds, Twilight Pass and Weekly Diamond Pass in seconds! TheLootStop offers easy, safe and convenient ML top ups.',
        'price': '89.99',
        'unit': 'Diamonds',
        'image_url': 'http://localhost:8000/static/images/MLBB.jpg',
        'unit_design_image_url': '',
        'unit_design_emoji': '💎',
        'unit_design_color': '#28a745',
        'unit_design_border_color': '#1e7e34',
        'in_stock': False,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Call of Duty Mobile',
        'description': 'Buy Garena Shells for Call of Duty Mobile CP in seconds! TheLootStop offers easy, safe and convenient Call of Duty Mobile top ups.',
        'price': '599.99',
        'unit': 'Shells',
        'image_url': 'http://localhost:8000/static/images/CODM.jpg',
        'unit_design_image_url': 'http://localhost:8000/static/images/Item_Shells.png',
        'unit_design_emoji': '',
        'unit_design_color': '#fd7e14',
        'unit_design_border_color': '#d35400',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Leauge of Legends: Wild Rift',
        'description': 'Buy Wild Cores for League of Legends: Wild Rift (Mobile). TheLootStop offers easy, safe and convenient Wild Rift Top ups.',
        'price': '929.99',
        'unit': 'Wild Cores',
        'image_url': 'http://localhost:8000/static/images/LOL.png',
        'unit_design_image_url': 'http://localhost:8000/static/images/Item_Wildcore.png',
        'unit_design_emoji': '',
        'unit_design_color': '#0dcaf0',
        'unit_design_border_color': '#0aa2c0',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Roblox',
        'description': 'Buy Roblox Digital Gift Card and enjoy a hassle-free top-up experience only at TheLootStop. TheLootStop offers easy, safe and convenient Roblox top ups.',
        'price': '399.99',
        'unit': 'Robux',
        'image_url': 'http://localhost:8000/static/images/Roblox.png',
        'unit_design_image_url': 'http://localhost:8000/static/images/Item_Robux.png',
        'unit_design_emoji': '',
        'unit_design_color': '#6f42c1',
        'unit_design_border_color': '#4c0099',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Genshin Impact',
        'description': 'Buy Genshin Impact Primogems and enjoy a hassle-free top-up experience at TheLootStop. TheLootStop offers easy, safe and convenient Genshin Impact top ups.',
        'price': '49.99',
        'unit': 'Primogems',
        'image_url': 'http://localhost:8000/static/images/Genshin.jpg',
        'unit_design_image_url': 'http://localhost:8000/static/images/Item_Primogem.webp',
        'unit_design_emoji': '',
        'unit_design_color': '#dc3545',
        'unit_design_border_color': '#a71d2a',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Honkai: Star Rail',
        'description': 'Buy Honkai: Star Rail Oneiric Shards and enjoy a hassle-free top-up experience at TheLootStop. TheLootStop offers easy, safe and convenient Honkai: Star Rail top ups.',
        'price': '29.99',
        'unit': 'Oneiric Shards',
        'image_url': 'http://localhost:8000/static/images/Honkai.jpg',
        'unit_design_image_url': 'http://localhost:8000/static/images/Item_Oneiric_Shard.webp',
        'unit_design_emoji': '',
        'unit_design_color': '#6930c3',
        'unit_design_border_color': '#4d1e99',
        'in_stock': False,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Honor of Kings',
        'description': 'Buy Honor of Kings Tokens and enjoy a hassle-free top-up experience at TheLootStop. TheLootStop offers easy, safe and convenient Honor of Kings top ups.',
        'price': '29.99',
        'unit': 'Tokens',
        'image_url': 'http://localhost:8000/static/images/HOK.png',
        'unit_design_image_url': '',
        'unit_design_emoji': '🪙',
        'unit_design_color': '#ffc107',
        'unit_design_border_color': '#cc9900',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
    {
        'name': 'Love and Deepspace',
        'description': 'Buy Love and Deepspace Crystals and enjoy a hassle-free top-up experience at TheLootStop. TheLootStop offers easy, safe and convenient Love and Deepspace top ups.',
        'price': '29.99',
        'unit': 'Crystals',
        'image_url': 'http://localhost:8000/static/images/LID.jpg',
        'unit_design_image_url': '',
        'unit_design_emoji': '💎',
        'unit_design_color': '#e91e63',
        'unit_design_border_color': '#ad1457',
        'in_stock': True,
        'category': 'Game Top-Up',
    },
]


def seed_catalog(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    for payload in SEED_PRODUCTS:
        Product.objects.update_or_create(name=payload['name'], defaults=payload)


def unseed_catalog(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(name__in=[product['name'] for product in SEED_PRODUCTS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_product'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='image_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='unit_design_image_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.RunPython(seed_catalog, unseed_catalog),
    ]