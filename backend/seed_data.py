# Bilingual seed data for the Faiha Co-operative storefront (MongoDB fallback catalog)

FRUITS = "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
BAKERY = "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
DAIRY = "https://images.unsplash.com/photo-1552593050-477020c5af3f?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
MEAT = "https://images.unsplash.com/photo-1587593810167-a84920ea0781?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
BEV = "https://images.unsplash.com/photo-1625865019554-220ea80ea813?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
SNACKS = "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
PANTRY = "https://images.unsplash.com/photo-1597393353365-9d4366392fe9?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
HOUSE = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"

CATEGORIES = [
    {"slug": "fruits-vegetables", "name_en": "Fruits & Vegetables", "name_ar": "الخضار والفواكه", "image": FRUITS, "sort_order": 1},
    {"slug": "bakery", "name_en": "Bakery", "name_ar": "المخبوزات", "image": BAKERY, "sort_order": 2},
    {"slug": "dairy-eggs", "name_en": "Dairy & Eggs", "name_ar": "الألبان والبيض", "image": DAIRY, "sort_order": 3},
    {"slug": "meat-poultry", "name_en": "Meat & Poultry", "name_ar": "اللحوم والدواجن", "image": MEAT, "sort_order": 4},
    {"slug": "beverages", "name_en": "Beverages", "name_ar": "المشروبات", "image": BEV, "sort_order": 5},
    {"slug": "snacks-nuts", "name_en": "Snacks & Nuts", "name_ar": "الوجبات الخفيفة والمكسرات", "image": SNACKS, "sort_order": 6},
    {"slug": "pantry", "name_en": "Pantry Staples", "name_ar": "البقالة الأساسية", "image": PANTRY, "sort_order": 7},
    {"slug": "household", "name_en": "Household", "name_ar": "المنزل", "image": HOUSE, "sort_order": 8},
]


def _p(name_en, name_ar, cat, img, price, stock, unit_en, unit_ar, barcode, feat=False, promo=False, disc=0):
    return {
        "name_en": name_en, "name_ar": name_ar, "category": cat, "images": [img],
        "price": price, "stock": stock, "unit_en": unit_en, "unit_ar": unit_ar,
        "barcode": barcode, "is_featured": feat, "is_promotional": promo, "discount": disc,
        "source": "local", "is_active": True,
    }


PRODUCTS = [
    # Fruits & Vegetables
    _p("Bananas", "موز", "fruits-vegetables", FRUITS, 0.450, 120, "per kg", "للكيلو", "6291001000011", feat=True, promo=True, disc=10),
    _p("Tomatoes", "طماطم", "fruits-vegetables", FRUITS, 0.350, 90, "per kg", "للكيلو", "6291001000028"),
    _p("Cucumber", "خيار", "fruits-vegetables", FRUITS, 0.300, 80, "per kg", "للكيلو", "6291001000035", feat=True),
    _p("Red Apples", "تفاح أحمر", "fruits-vegetables", FRUITS, 0.750, 60, "per kg", "للكيلو", "6291001000042", promo=True, disc=15),
    _p("Carrots", "جزر", "fruits-vegetables", FRUITS, 0.280, 70, "per kg", "للكيلو", "6291001000059"),
    # Bakery
    _p("Arabic Bread (Large)", "خبز عربي كبير", "bakery", BAKERY, 0.250, 200, "pack of 5", "5 أرغفة", "6291002000016", feat=True),
    _p("Butter Croissant", "كرواسون بالزبدة", "bakery", BAKERY, 0.400, 50, "pack of 4", "4 قطع", "6291002000023", promo=True, disc=20),
    _p("Whole Wheat Loaf", "خبز القمح الكامل", "bakery", BAKERY, 0.550, 40, "loaf", "رغيف", "6291002000030"),
    _p("Cinnamon Rolls", "لفائف القرفة", "bakery", BAKERY, 0.900, 30, "pack of 6", "6 قطع", "6291002000047", feat=True),
    # Dairy & Eggs
    _p("Fresh Milk 1L", "حليب طازج 1 لتر", "dairy-eggs", DAIRY, 0.350, 150, "1 litre", "1 لتر", "6291003000013", feat=True),
    _p("Farm Eggs", "بيض المزرعة", "dairy-eggs", DAIRY, 0.850, 100, "30 pcs", "30 حبة", "6291003000020", promo=True, disc=10),
    _p("Cheddar Cheese", "جبنة شيدر", "dairy-eggs", DAIRY, 1.250, 45, "200g", "200 جرام", "6291003000037"),
    _p("Greek Yogurt", "زبادي يوناني", "dairy-eggs", DAIRY, 0.650, 70, "500g", "500 جرام", "6291003000044", feat=True),
    # Meat & Poultry
    _p("Fresh Chicken (Whole)", "دجاج طازج كامل", "meat-poultry", MEAT, 1.950, 40, "approx 1.2kg", "حوالي 1.2 كجم", "6291004000010", feat=True),
    _p("Chicken Breast", "صدور دجاج", "meat-poultry", MEAT, 2.250, 35, "per kg", "للكيلو", "6291004000027", promo=True, disc=12),
    _p("Lamb Cubes", "مكعبات لحم غنم", "meat-poultry", MEAT, 3.750, 25, "per kg", "للكيلو", "6291004000034"),
    _p("Minced Beef", "لحم بقري مفروم", "meat-poultry", MEAT, 2.850, 30, "per kg", "للكيلو", "6291004000041", feat=True),
    # Beverages
    _p("Orange Juice 1L", "عصير برتقال 1 لتر", "beverages", BEV, 0.750, 90, "1 litre", "1 لتر", "6291005000017", feat=True, promo=True, disc=15),
    _p("Mineral Water 1.5L", "مياه معدنية 1.5 لتر", "beverages", BEV, 0.150, 300, "1.5 litre", "1.5 لتر", "6291005000024"),
    _p("Arabic Coffee 250g", "قهوة عربية 250 جرام", "beverages", BEV, 1.500, 50, "250g", "250 جرام", "6291005000031", feat=True),
    _p("Green Tea (25 bags)", "شاي أخضر 25 كيس", "beverages", BEV, 0.900, 60, "25 bags", "25 كيس", "6291005000048"),
    # Snacks & Nuts
    _p("Mixed Nuts", "مكسرات مشكلة", "snacks-nuts", SNACKS, 2.500, 55, "500g", "500 جرام", "6291006000014", feat=True, promo=True, disc=10),
    _p("Potato Chips", "رقائق البطاطس", "snacks-nuts", SNACKS, 0.300, 150, "pack", "كيس", "6291006000021"),
    _p("Roasted Pistachios", "فستق محمص", "snacks-nuts", SNACKS, 3.250, 40, "500g", "500 جرام", "6291006000038", feat=True),
    _p("Dark Chocolate", "شوكولاتة داكنة", "snacks-nuts", SNACKS, 0.950, 80, "100g", "100 جرام", "6291006000045"),
    # Pantry
    _p("Basmati Rice 5kg", "أرز بسمتي 5 كجم", "pantry", PANTRY, 4.250, 70, "5 kg", "5 كجم", "6291007000011", feat=True, promo=True, disc=8),
    _p("Pasta Penne 500g", "معكرونة بيني 500 جرام", "pantry", PANTRY, 0.450, 120, "500g", "500 جرام", "6291007000028"),
    _p("Sunflower Oil 1.8L", "زيت دوار الشمس 1.8 لتر", "pantry", PANTRY, 1.650, 60, "1.8 litre", "1.8 لتر", "6291007000035", feat=True),
    _p("White Sugar 2kg", "سكر أبيض 2 كجم", "pantry", PANTRY, 0.750, 90, "2 kg", "2 كجم", "6291007000042"),
    _p("Sea Salt 1kg", "ملح بحري 1 كجم", "pantry", PANTRY, 0.250, 110, "1 kg", "1 كجم", "6291007000059"),
    # Household
    _p("Dish Soap 1L", "صابون الأطباق 1 لتر", "household", HOUSE, 0.850, 80, "1 litre", "1 لتر", "6291008000018", promo=True, disc=10),
    _p("Laundry Detergent 3kg", "مسحوق غسيل 3 كجم", "household", HOUSE, 2.950, 45, "3 kg", "3 كجم", "6291008000025", feat=True),
    _p("Tissue Box (5 pack)", "علبة مناديل 5 قطع", "household", HOUSE, 1.250, 100, "5 boxes", "5 علب", "6291008000032"),
    _p("Trash Bags (Large)", "أكياس قمامة كبيرة", "household", HOUSE, 0.650, 120, "30 pcs", "30 كيس", "6291008000049"),
]
