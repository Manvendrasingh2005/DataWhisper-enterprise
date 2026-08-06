from django.db import models
from django.utils import timezone

class Supplier(models.Model):
    name = models.CharField(max_length=150)
    contact_email = models.EmailField()
    country = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    city = models.CharField(max_length=50)
    account_created = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default='active')

    def __str__(self):
        return self.name

class Product(models.Model):
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=50)
    sku = models.CharField(max_length=50, unique=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_count = models.IntegerField()
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.title

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order_date = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, default='completed')

    def __str__(self):
        return f"Order {self.id} by {self.user.name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.RESTRICT)
    quantity = models.IntegerField()
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product.title}"

class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=100, unique=True)
    gateway_response = models.CharField(max_length=20, default='SUCCESS')
    processed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Payment for Order {self.order.id}"

class InventoryLog(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=10)
    quantity = models.IntegerField()
    logged_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.movement_type} - {self.quantity} units for {self.product.title}"