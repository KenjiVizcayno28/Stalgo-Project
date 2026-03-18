import requests
from django.conf import settings
from .models import Purchase, ProductClick
import json


def get_ai_recommendations(user, all_products, limit=4):
    """
    AI-powered product recommendations based on user's purchase and click history.
    Uses a weighted point system:
    - Purchase = 5 points
    - Click = 2.5 points
    
    Returns:
        List of recommended product IDs
    """
    try:
        if not settings.GROQ_API_KEY:
            raise ValueError('GROQ_API_KEY is not configured')
        
        purchases = Purchase.objects.filter(user=user, status='completed').order_by('-created_at')[:10]
        clicked_products = ProductClick.objects.filter(user=user).order_by('-timestamp')[:15]
        
        product_scores = {}
        
        for purchase in purchases:
            pid = purchase.product_id
            if pid:
                product_scores[pid] = product_scores.get(pid, 0) + 5
        
        for click in clicked_products:
            pid = click.product_id
            product_scores[pid] = product_scores.get(pid, 0) + 2.5
        
        product_interest = []
        for pid, score in sorted(product_scores.items(), key=lambda x: x[1], reverse=True):
            product_name = None
            for p in all_products:
                p_id = p.get('_id') if isinstance(p, dict) else p._id
                if p_id == pid:
                    product_name = p.get('name') if isinstance(p, dict) else p.name
                    break
            if product_name:
                product_interest.append(f"{product_name} (ID: {pid}) - {score} points")
        
        product_list = []
        for product in all_products:
            product_list.append({
                'id': product.get('_id') if isinstance(product, dict) else product._id,
                'name': product.get('name') if isinstance(product, dict) else product.name,
                'category': product.get('category', 'General') if isinstance(product, dict) else getattr(product, 'category', 'General'),
                'description': product.get('description', '')[:100] if isinstance(product, dict) else getattr(product, 'description', '')[:100]
            })
        
        prompt = f"""You are a product recommendation system for a gaming shop.

SCORING SYSTEM:
- Each purchase = 5 points (highest priority)
- Each product click/view = 2.5 points (medium priority)

User's Product Interest (scored by interaction):
{chr(10).join(product_interest) if product_interest else 'No previous interactions'}

Available Products:
{json.dumps(product_list, indent=2)}

Based on the weighted scoring system and user's behavior, recommend exactly {limit} products that this user would be most interested in.

IMPORTANT: 
- Prioritize products related to those with high scores (purchases are most important)
- Only recommend products from the Available Products list below
- Recommend products that are related to the types/categories of products the user has interacted with (e.g., Mobile Legends is related to League of Legends, Valorant is related to FPS games)
- Return ONLY a JSON array of product IDs, nothing else
- Format: ["id1", "id2", "id3", "id4"]
- If user has no history, recommend popular gaming items
- Ensure you return exactly {limit} recommendations

Your response (JSON array only):"""

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
                        'content': 'You are a recommendation engine. Return only a JSON array of product IDs.',
                    },
                    {'role': 'user', 'content': prompt},
                ],
                'temperature': 0.2,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        response_text = payload.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        
        if '```' in response_text:
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        recommended_ids = json.loads(response_text.strip())
        
        valid_ids = [p['id'] for p in product_list]
        recommended_ids = [rid for rid in recommended_ids if rid in valid_ids]
        
        if len(recommended_ids) < limit:
            for product in product_list:
                if product['id'] not in recommended_ids:
                    recommended_ids.append(product['id'])
                if len(recommended_ids) >= limit:
                    break
        
        return recommended_ids[:limit]
    
    except Exception as e:
        print(f"Error generating AI recommendations: {e}")
        return [p.get('_id') if isinstance(p, dict) else p._id for p in all_products[:limit]]


def get_fallback_recommendations(all_products, limit=4):
    return [p.get('_id') if isinstance(p, dict) else p._id for p in all_products[:limit]]
