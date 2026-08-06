import random
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Supplier, User, Product, Order, OrderItem, Payment, InventoryLog

class Command(BaseCommand):
    help = 'Seeds database with dense, production-like business intelligence records'

    def handle(self, *args, **kwargs):
        self.stdout.write("Purging structural tables...")
        InventoryLog.objects.all().delete()
        Payment.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Product.objects.all().delete()
        User.objects.all().delete()
        Supplier.objects.all().delete()

        # 1. Seed Global Suppliers
        self.stdout.write("Constructing supply chain nodes...")
        supplier_data = [
            ("Apex Electronics", "logistics@apexelectronics.com", "Taiwan"),
            ("Nordic Apparels", "b2b@nordicapparel.se", "Sweden"),
            ("Horizon Home Goods", "supply@horizonhome.in", "India"),
            ("LogiTech SaaS Solutions", "billing@logitechsaas.com", "USA")
        ]
        suppliers = [Supplier.objects.create(name=n, contact_email=e, country=c) for n, e, c in supplier_data]

        # 2. Seed Realistic Catalog
        self.stdout.write("Generating realistic product index...")
        
        product_catalog = {
            'Electronics': [
                'Wireless Noise-Canceling Headphones', '4K Ultra HD OLED TV', 'Mechanical Gaming Keyboard', 
                'Smartphone Gimbal Stabilizer', '1TB NVMe Solid State Drive', 'Smart Home Hub v2', 
                '1080p Streaming Web Camera', 'Bluetooth Portable Speaker', '27-inch IPS 144Hz Monitor', 'Pro Drone with 4K Camera'
            ],
            'Apparel': [
                'Men\'s Wool Peacoat', 'Women\'s Cashmere Sweater', 'Waterproof Hiking Boots', 
                'Vintage Denim Trucker Jacket', 'Athletic Running Shorts', 'Graphic Cotton Tee', 
                'Fleece-Lined Winter Leggings', 'Leather Crossbody Bag', 'Polarized Aviator Sunglasses', 'Breathable Yoga Top'
            ],
            'Home & Kitchen': [
                'Stainless Steel Espresso Maker', 'Robot Vacuum Cleaner Pro', 'Cast Iron Dutch Oven', 
                'Memory Foam Mattress Topper', 'Air Purifier with HEPA Filter', 'Ceramic Non-Stick Pan Set', 
                'Smart WiFi Thermostat', 'Bamboo Cutting Board Set', 'Electric Standing Desk', 'Ergonomic Mesh Office Chair'
            ],
            'Software': [
                'Cloud Storage 1TB Annual Plan', 'Pro Video Editing Suite', 'Cybersecurity Antivirus 1-Year', 
                'Project Management Pro License', 'Graphic Design AI Plugin', 'Accounting Software Standard', 
                'CRM Enterprise License', 'VPN 2-Year Plan', 'Developer IDE Ultimate Edition', '3D Modeling Architecture Tool'
            ]
        }

        products = []
        for category, titles in product_catalog.items():
            for title in titles:
                cost = round(random.uniform(15.0, 300.0), 2)
                markup = random.choice([1.3, 1.5, 1.8, 2.2])
                selling_price = round(cost * markup, 2)
                
                prod = Product.objects.create(
                    title=title,
                    category=category,
                    sku=f"SKU-{random.randint(10000, 99999)}",
                    cost_price=cost,
                    selling_price=selling_price,
                    stock_count=random.randint(5, 450),
                    supplier=random.choice(suppliers)
                )
                products.append(prod)

        # 3. Seed Users
        self.stdout.write("Populating market demographics...")
        cities = ['New York', 'San Francisco', 'Austin', 'London', 'Toronto', 'Bangalore']
        users = []
        for i in range(1, 61):
            users.append(User.objects.create(
                name=f"Corporate Client {i}",
                email=f"partner{i}@enterprise.org",
                city=random.choice(cities),
                status=random.choice(['active', 'active', 'active', 'churned'])
            ))

        # 4. Seed Transaction Layer & Logs
        self.stdout.write("Simulating real-time operations history...")
        gateways = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED']
        pay_methods = ['Credit Card', 'UPI', 'PayPal', 'NetBanking']
        
        for user in users:
            for _ in range(random.randint(1, 5)):
                days_ago = random.randint(1, 120)
                order_time = timezone.now() - timedelta(days=days_ago)
                
                order = Order.objects.create(
                    user=user,
                    order_date=order_time,
                    status=random.choice(['completed', 'completed', 'cancelled'])
                )
                
                order_total = 0
                chosen_items = random.sample(products, random.randint(1, 3))
                for prod in chosen_items:
                    qty = random.randint(1, 5)
                    OrderItem.objects.create(
                        order=order,
                        product=prod,
                        quantity=qty,
                        price_per_unit=prod.selling_price
                    )
                    order_total += (prod.selling_price * qty)
                    
                    InventoryLog.objects.create(
                        product=prod,
                        movement_type="OUT",
                        quantity=qty,
                        logged_at=order_time
                    )
                
                order.total_amount = order_total
                order.save()

                Payment.objects.create(
                    order=order,
                    payment_method=random.choice(pay_methods),
                    transaction_id=str(uuid.uuid4()),
                    gateway_response=random.choice(gateways) if order.status == 'completed' else 'FAILED',
                    processed_at=order_time
                )

        self.stdout.write(self.style.SUCCESS("Database populated with rich business data!"))