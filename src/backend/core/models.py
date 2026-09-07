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
    phone = models.CharField(max_length=30, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    joined_at = models.DateField(auto_now_add=True)
    social_links = models.JSONField(default=dict, blank=True)

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
    # A URL, not a stored file: either an external image link, or the URL of a file the
    # upload-image action saved to local disk (see that view for why MEDIA storage is
    # ephemeral on Railway -- URLField keeps the pointer separate from the storage backend).
    image_url = models.URLField(max_length=500, blank=True, null=True)

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
    STATUS_PREPARING = 'Preparing'
    STATUS_DELIVERED = 'Delivered'
    STATUS_DELAYED = 'Delayed'

    STATUS_CHOICES = [
        (STATUS_PREPARING, 'Preparing'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_DELAYED, 'Delayed'),
    ]

    po_id = models.AutoField(primary_key=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT)
    # Nullable for historical rows created before PO-per-branch existed; new orders
    # always set this (enforced in PurchaseOrderSerializer/perform_create).
    store = models.ForeignKey('Store', on_delete=models.PROTECT, null=True, blank=True)
    order_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=STATUS_PREPARING)

    def __str__(self):
        return f"PO {self.po_id} - {self.supplier.supplier_name} ({self.status})"

    @property
    def total_amount(self):
        return sum(item.order_qty * item.unit_cost for item in self.details.all())

    @property
    def is_overdue(self):
        from datetime import date
        if self.status == self.STATUS_PREPARING and self.expected_delivery_date:
            return self.expected_delivery_date < date.today()
        return False

    def check_and_update_overdue(self):
        if self.is_overdue:
            self.status = self.STATUS_DELAYED
            self.save(update_fields=['status'])
            return True
        return False

# 10. Bảng PURCHASE_ORDER_DETAIL
class PurchaseOrderDetail(models.Model):
    po = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='details')
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
    shift = models.ForeignKey('Shift', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
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
    DISCOUNT_PERCENT = 'percent'
    DISCOUNT_AMOUNT = 'amount'
    DISCOUNT_TYPE_CHOICES = [
        (DISCOUNT_PERCENT, 'Percent'),
        (DISCOUNT_AMOUNT, 'Amount'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    # Per-line discount the cashier applied at checkout (POS sales cart) --
    # independent of the whole-cart discount_percent on Order, and separate
    # from the catalog-wide Discount model (that one's for the Discounts
    # admin page, not applied automatically here). sub_total already has it
    # baked in; these two fields exist only so the receipt/reports can show
    # what was actually applied.
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, null=True, blank=True)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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

# 13. Bảng INVENTORY_ALERT
class InventoryAlert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='alerts')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')
    current_stock = models.IntegerField()
    min_threshold = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        store_str = self.store.store_name if self.store else 'All Stores'
        return f"Alert {self.alert_id} - {self.product.product_name} at {store_str} (Stock: {self.current_stock}/{self.min_threshold})"

# 14. Bảng STAFF_REVIEW
class StaffReview(models.Model):
    id = models.AutoField(primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.CharField(max_length=100)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review of {self.staff.full_name} by {self.reviewer} ({self.rating}/5)"

# 15. Bảng STAFF_DOCUMENT
class StaffDocument(models.Model):
    id = models.AutoField(primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='staff_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} ({self.staff.full_name})"

# 16. Bảng STAFF_CERTIFICATE
class StaffCertificate(models.Model):
    id = models.AutoField(primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='certificates')
    name = models.CharField(max_length=255)
    issued_by = models.CharField(max_length=255)
    issued_at = models.DateField()

    class Meta:
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.name} ({self.staff.full_name})"

# 17. Bảng SHIFT
class Shift(models.Model):
    STATUS_OPEN = 'Open'
    STATUS_CLOSED = 'Closed'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_CLOSED, 'Closed'),
    ]

    shift_id = models.AutoField(primary_key=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    staff = models.ForeignKey(Staff, on_delete=models.PROTECT)
    register = models.CharField(max_length=50, default='Register 1')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=10, decimal_places=2)
    closing_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OPEN)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f"Shift {self.shift_id} - {self.store.store_name} ({self.status})"

# 18. Bảng CUSTOMER
class Customer(models.Model):
    TIER_BRONZE = 'Bronze'
    TIER_SILVER = 'Silver'
    TIER_GOLD = 'Gold'
    TIER_VIP = 'VIP'
    TIER_CHOICES = [
        (TIER_BRONZE, 'Bronze'),
        (TIER_SILVER, 'Silver'),
        (TIER_GOLD, 'Gold'),
        (TIER_VIP, 'VIP'),
    ]

    STATUS_ACTIVE = 'Active'
    STATUS_INACTIVE = 'Inactive'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    customer_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default=TIER_BRONZE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    last_contacted_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

# 19. Bảng DISCOUNT
class Discount(models.Model):
    TYPE_PERCENTAGE = 'percentage'
    TYPE_PRICE = 'price'
    TYPE_CHOICES = [
        (TYPE_PERCENTAGE, 'Percentage'),
        (TYPE_PRICE, 'Price'),
    ]

    discount_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='discounts')
    discount_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    applied_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"Discount {self.discount_id} - {self.product.product_name} ({self.discount_type}: {self.value})"

# 20. Bảng BUSINESS_PROFILE (singleton -- always accessed/created at pk=1; chain-wide
# business info for Settings > Store, deliberately not tied to any one Store row since
# it represents chain-wide config, not a specific branch's data).
class BusinessProfile(models.Model):
    SECTOR_CHOICES = [
        ('Grocery Store', 'Grocery Store'),
        ('Convenience Store', 'Convenience Store'),
        ('Supermarket', 'Supermarket'),
        ('Minimart', 'Minimart'),
        ('Pharmacy', 'Pharmacy'),
        ('Restaurant / F&B', 'Restaurant / F&B'),
        ('Bakery', 'Bakery'),
        ('Electronics', 'Electronics'),
        ('Fashion & Apparel', 'Fashion & Apparel'),
        ('Other', 'Other'),
    ]

    store_name = models.CharField(max_length=150, blank=True)
    business_sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, default='Other')
    tax_id = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    currency = models.CharField(max_length=10, default='VND')
    timezone = models.CharField(max_length=50, default='Asia/Ho_Chi_Minh (GMT+7)')
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    logo_url = models.TextField(blank=True)

    def __str__(self):
        return self.store_name or 'Business Profile'

# 21. Bảng PAYMENT_METHOD_SETTING
class PaymentMethodSetting(models.Model):
    method = models.CharField(max_length=50, unique=True)
    enabled = models.BooleanField(default=True)
    account_detail = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['method']

    def __str__(self):
        return self.method

# 22. Bảng MARKETPLACE_CHANNEL_SETTING
class MarketplaceChannelSetting(models.Model):
    channel = models.CharField(max_length=50, unique=True)
    connected = models.BooleanField(default=False)
    store_partner_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['channel']

    def __str__(self):
        return self.channel

# 23. Bảng NOTIFICATION -- một dòng riêng cho mỗi người nhận (không phải bảng
# join has-read chung), vì mỗi người cần trạng thái đã-đọc độc lập. Người
# tạo hiện tại là PayOSWebhookView (pos/views.py) khi 1 đơn QR thanh toán
# thành công; type là string mở, không phải enum cứng, để thêm loại thông
# báo khác sau này không cần đổi schema.
class Notification(models.Model):
    TYPE_QR_PAYMENT_SUCCESS = 'qr_payment_success'
    TYPE_CASH_PAYMENT_SUCCESS = 'cash_payment_success'

    recipient = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, default=TYPE_QR_PAYMENT_SUCCESS)
    message = models.CharField(max_length=255)
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.message}"
