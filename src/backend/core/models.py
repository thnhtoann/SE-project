from datetime import date, timedelta
from django.utils import timezone
import random
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

# 1. Bảng ROLE
class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.role_name

# 2. Bảng STORE
class Store(models.Model):
    store_id = models.AutoField(primary_key=True)
    store_name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)

    def __str__(self):
        return self.store_name

# 3. Bảng STAFF
class StaffManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        """
        Creates and saves a superuser with the given username and password.
        """
        # We simply pass the fields straight to create_user.
        # Django will automatically prompt for 'full_name' and 'role_id' 
        # because they are in REQUIRED_FIELDS.
        return self.create_user(username, password, **extra_fields)

class Staff(AbstractBaseUser):
    staff_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=100)
    role = models.ForeignKey('Role', on_delete=models.PROTECT)
    store = models.ForeignKey('Store', on_delete=models.SET_NULL, null=True, blank=True)
    email = models.EmailField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    objects = StaffManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['full_name', 'role_id']

    def __str__(self):
        return self.full_name

    @property
    def role_name(self):
        return self.role.role_name

    @property
    def is_staff(self):
        # Allow all staff members to access the admin panel
        return True 

    @property
    def is_superuser(self):
        # Treat them as a superuser if they have the Admin role
        return self.role.role_name.lower() == "admin"

    def has_perm(self, perm, obj=None):
        # Required by Django Admin to check permissions
        return self.is_superuser

    def has_module_perms(self, app_label):
        # Required by Django Admin to check app access
        return self.is_superuser

# 4. Bảng CATEGORY
class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100)

    def __str__(self):
        return self.category_name

# 5. Bảng PRODUCT
class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    barcode = models.CharField(max_length=50, unique=True)
    product_name = models.CharField(max_length=255)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    min_threshold = models.IntegerField()
    category = models.ForeignKey(Category, on_delete=models.PROTECT)

    def __str__(self):
        return self.product_name

    def is_low_stock(self, quantity):
        return quantity <= self.min_threshold

# 6. Bảng BATCH
class Batch(models.Model):
    batch_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    manufacture_date = models.DateField()
    expiration_date = models.DateField()

    def __str__(self):
        return f"{self.product.product_name} - Batch {self.batch_id}"

    def is_expiring_soon(self, days=7, as_of_date=None):
        reference_date = as_of_date or date.today()
        return reference_date <= self.expiration_date <= reference_date + timedelta(days=days)

# 7. Bảng STORE_INVENTORY
class StoreInventory(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)
    quantity = models.IntegerField()

    class Meta:
        unique_together = (('store', 'batch'),)

    def __str__(self):
        return f"{self.store.store_name} - {self.batch.product.product_name}: {self.quantity}"

# 8. Bảng SUPPLIER
class Supplier(models.Model):
    supplier_id = models.AutoField(primary_key=True)
    supplier_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    email = models.CharField(max_length=100, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.supplier_name

# 9. Bảng PURCHASE_ORDER
class PurchaseOrder(models.Model):
    po_id = models.AutoField(primary_key=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT)
    order_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50)

    def __str__(self):
        return f"PO {self.po_id} - {self.supplier.supplier_name} ({self.status})"

# 10. Bảng PURCHASE_ORDER_DETAIL
class PurchaseOrderDetail(models.Model):
    po = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    order_qty = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = (('po', 'product'),)

    def __str__(self):
        return f"PO {self.po.po_id} - {self.product.product_name}: {self.order_qty}"

# 11. Bảng ORDER
class Order(models.Model):
    order_id = models.AutoField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    staff = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True)
    order_date = models.DateTimeField()
    order_type = models.CharField(max_length=50)
    payment_method = models.CharField(max_length=50)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)
    external_order_id = models.CharField(max_length=100, null=True, blank=True)  # Webhook idempotency key

    class Meta:
        unique_together = (('order_type', 'external_order_id'),)

    def __str__(self):
        return f"Order {self.order_id} - {self.store.store_name} ({self.status})"

# 12. Bảng ORDER_DETAIL
class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    sub_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = (('order', 'product'),)

    def __str__(self):
        return f"Order {self.order.order_id} - {self.product.product_name}: {self.quantity}"

class OTPRecord(models.Model):
    # Liên kết với model Staff của bạn
    user = models.OneToOneField('Staff', on_delete=models.CASCADE, related_name='otp_record')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now=True) # Tự cập nhật thời gian mỗi lần sinh OTP mới

    def generate_otp(self):
        # Sinh mã 6 số ngẫu nhiên
        self.otp = str(random.randint(100000, 999999))
        self.save()
        return self.otp
    
    def is_valid(self):
        # Hạn sử dụng OTP là 300 giây (5 phút)
        time_diff = (timezone.now() - self.created_at).total_seconds()
        return time_diff <= 300