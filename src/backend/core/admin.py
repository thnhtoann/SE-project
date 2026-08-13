from django.contrib import admin
from .models import Store, Product, StoreInventory, Staff, Role, Category, Batch

# Register your models so they show up in the admin dashboard
admin.site.register(Store)
admin.site.register(Product)
admin.site.register(StoreInventory)
admin.site.register(Staff)
admin.site.register(Role)
admin.site.register(Category)
admin.site.register(Batch)