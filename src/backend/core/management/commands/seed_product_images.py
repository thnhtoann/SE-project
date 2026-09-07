"""One-time backfill giving every existing Product without a photo a generic,
category-colored placeholder image (via placehold.co) so the catalog isn't a wall
of blank icons. Deliberately NOT real brand photography -- no reliable way to
source/verify exact product photos, and real product-package images are the
manufacturer's copyrighted material. A user can still replace any of these with
a real photo via Product.upload_image."""
from urllib.parse import quote_plus

from django.core.management.base import BaseCommand

from core.models import Product

# category_name -> (background hex, text hex), no leading '#' (placehold.co's format).
CATEGORY_COLORS = {
    'Beverages': ('0EA5E9', 'ffffff'),
    'Snacks': ('F59E0B', 'ffffff'),
    'Household': ('10B981', 'ffffff'),
    'Dairy': ('8B5CF6', 'ffffff'),
}
DEFAULT_COLORS = ('64748B', 'ffffff')


class Command(BaseCommand):
    help = "Sets Product.image_url to a category-colored placehold.co placeholder for every product that doesn't have an image yet."

    def handle(self, *args, **options):
        updated = 0
        for product in Product.objects.select_related('category').filter(image_url__isnull=True):
            bg, fg = CATEGORY_COLORS.get(product.category.category_name, DEFAULT_COLORS)
            text = quote_plus(product.product_name)
            product.image_url = f'https://placehold.co/400x400/{bg}/{fg}?text={text}'
            product.save(update_fields=['image_url'])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f'Set a placeholder image_url on {updated} product(s).'))
