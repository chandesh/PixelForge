"""Management command to seed ResizePreset fixtures."""
from django.core.management.base import BaseCommand
from apps.images.models import ResizePreset

LABELS = {
    "WALLPAPER": "Wallpaper",
    "THUMBNAIL": "Thumbnail",
    "SOCIAL": "Social",
    "LOGO": "Logo",
    "ICON": "Icon",
    "DOCUMENT": "Document",
    "CUSTOM": "Custom",
}

PRESETS = {
    "WALLPAPER": [
        ("Desktop HD", "desktop-hd", 1920, 1080, "Standard HD desktop wallpaper"),
        ("Desktop 4K", "desktop-4k", 3840, 2160, "Ultra HD 4K desktop wallpaper"),
        ("Desktop Ultrawide", "desktop-ultrawide", 3440, 1440, "Ultrawide monitor wallpaper"),
        ("Mobile", "mobile", 1080, 1920, "Standard mobile wallpaper"),
        ("Tablet", "tablet", 1668, 2388, "iPad/tablet wallpaper"),
    ],
    "THUMBNAIL": [
        ("YouTube", "youtube", 1280, 720, "Standard YouTube thumbnail"),
        ("Blog", "blog", 800, 450, "Blog post thumbnail"),
        ("Article Card", "article-card", 600, 400, "Article card thumbnail"),
        ("YouTube Mini", "youtube-mini", 320, 180, "Small YouTube thumbnail"),
    ],
    "SOCIAL": [
        ("Instagram Post", "instagram-post", 1080, 1080, "Square Instagram post"),
        ("Instagram Story", "instagram-story", 1080, 1920, "Instagram story/reel"),
        ("Facebook Post", "facebook-post", 1200, 630, "Standard Facebook post"),
        ("Twitter/X Post", "twitter-post", 1200, 675, "Standard Twitter/X post"),
        ("LinkedIn Post", "linkedin-post", 1200, 627, "Standard LinkedIn post image"),
        ("TikTok", "tiktok", 1080, 1920, "TikTok video/post"),
        ("WhatsApp DP", "whatsapp-dp", 500, 500, "WhatsApp display picture"),
        ("Open Graph", "open-graph", 1200, 630, "Open Graph social share image"),
    ],
    "LOGO": [
        ("Standard", "logo-standard", 512, 512, "Standard logo size"),
        ("Small", "logo-small", 256, 256, "Small logo size"),
        ("Favicon", "favicon", 32, 32, "Standard favicon"),
        ("Favicon HD", "favicon-hd", 64, 64, "High-DPI favicon"),
        ("Apple Touch Icon", "apple-touch-icon", 180, 180, "Apple touch icon for home screen"),
    ],
    "ICON": [
        ("App Icon iOS", "app-icon-ios", 1024, 1024, "iOS app store icon"),
        ("App Icon Android", "app-icon-android", 512, 512, "Android app icon"),
        ("Notification Icon", "notification-icon", 96, 96, "Notification icon"),
    ],
    "DOCUMENT": [
        ("A4 72dpi", "a4-72dpi", 595, 842, "A4 document at 72 DPI"),
        ("A4 300dpi", "a4-300dpi", 2480, 3508, "A4 document at 300 DPI"),
        ("Letter 72dpi", "letter-72dpi", 612, 792, "US Letter at 72 DPI"),
    ],
    "CUSTOM": [
        ("Custom", "custom", 0, 0, "User-defined custom dimensions"),
    ],
}


class Command(BaseCommand):
    help = "Seed ResizePreset fixtures into the database."

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for category, items in PRESETS.items():
            label = LABELS.get(category, category)
            for name, slug, width, height, description in items:
                _, is_new = ResizePreset.objects.get_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "width": width,
                        "height": height,
                        "category": category,
                        "label": label,
                        "description": description,
                        "is_active": True,
                        "is_predefined": True,
                        "user": None,
                    },
                )
                if is_new:
                    created += 1
                else:
                    skipped += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} presets ({skipped} already existed)."))
