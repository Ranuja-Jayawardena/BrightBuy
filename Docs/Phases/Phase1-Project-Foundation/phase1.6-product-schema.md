# Phase 1.6: Product Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the core product tables (products, variants, images) and seed the 40-product catalog.

---

## Tables Owned

`products`, `product_variants`, `product_images`

---

## Tasks

### Migrations
- [x] `V9__create_products.sql` — `products` table, unique `base_sku`
- [x] `V10__create_product_variants.sql` — unique `variant_sku`, CHECK `price >= 0`, CHECK `stock_quantity >= 0`
- [x] `V11__create_product_images.sql` — `image_data BYTEA`, `ON DELETE CASCADE` from `products`
- [x] Ensure at most one primary image per product (partial unique index on `product_images(product_id) WHERE is_primary`)
- [x] Indexes: `product_variants(product_id)`, `product_images(product_id, sort_order)`, index supporting product name search

### Seed — `04_products.sql`
- [x] 40 products across the 10 categories (as per SRS)
- [x] Variants for each product with prices and stock levels (include some low-stock and zero-stock variants for testing)
- [x] At least one image per product stored as BYTEA (e.g. via `decode('<base64>', 'base64')` or a small seed helper script)
- [x] **Early:** publish the full `base_sku` / `variant_sku` list in this doc's notes so A, B, and D can write their seed files in parallel

### Documentation
- [x] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V9–V11 run cleanly in the full migration sequence.
- 40 active products with variants and images exist after seeding.
- SKU list is published for other members.

---

## Key Decisions & Notes

### Implementation Decisions
- **Binary Image Storage:** Implemented strictly using PostgreSQL `BYTEA` with base64 decoded PNG binaries (`decode('<base64>', 'base64')`) in `04_products.sql` per project constraints.
- **Constraints & Indexes:**
  - `idx_products_product_name` on `products(product_name)` for text search.
  - `idx_product_variants_product_id` on `product_variants(product_id)` with `ON DELETE CASCADE`.
  - Check constraints `price >= 0` and `stock_quantity >= 0` on `product_variants`.
  - `idx_product_images_single_primary` as a partial unique index on `product_images(product_id) WHERE is_primary = true` ensuring strictly at most one primary image per product.
  - `idx_product_images_product_sort` on `product_images(product_id, sort_order)`.
- **Database Schema Sync:** Added all indexes and constraint annotations into `DB_Schema.md`.

### Published SKU & Catalog Matrix (For Members A, B, and D)

The following 40 products and 70 variants have been seeded in `backend/db/seed/04_products.sql`. Members can link to these using natural key lookups:
- `(SELECT product_id FROM products WHERE base_sku = '...')`
- `(SELECT variant_id FROM product_variants WHERE variant_sku = '...')`

| Base SKU | Product Name | Brand | Suggested Category | Variant SKU | Variant Name | Price | Stock |
|----------|--------------|-------|--------------------|-------------|--------------|-------|-------|
| `ELC-001` | OmniCharge 65W GaN Fast Charger | PowerPulse | Electronics | `ELC-001-WHT` | Glacier White | $39.99 | 75 |
|  |  |  |  | `ELC-001-BLK` | Midnight Black | $39.99 | 50 |
| `ELC-002` | StreamDeck Creator Hub | NovaTech | Electronics | `ELC-002-STD` | Standard Matte Black | $149.99 | 28 |
| `ELC-003` | ViewMaster 4K Action Camera | ViewMaster | Electronics | `ELC-003-STD` | Standard Pack | $249.00 | 19 |
|  |  |  |  | `ELC-003-ADV` | Adventure Bundle | $299.00 | 3 |
| `ELC-004` | SmartTrack GPS Tag 4-Pack | Aura | Electronics | `ELC-004-1PK` | Single Tag White | $29.99 | 100 |
|  |  |  |  | `ELC-004-4PK` | 4-Pack Multipack | $89.99 | 40 |
| `SPH-001` | Lumina Pro 5G | Lumina | Smartphones | `SPH-001-BLK-128` | Space Black / 128GB | $799.00 | 45 |
|  |  |  |  | `SPH-001-SLV-256` | Titanium Silver / 256GB | $899.00 | 20 |
| `SPH-002` | Lumina Ultra Max | Lumina | Smartphones | `SPH-002-GLD-256` | Champagne Gold / 256GB | $1099.00 | 15 |
|  |  |  |  | `SPH-002-BLK-512` | Phantom Black / 512GB | $1249.00 | 2 |
| `SPH-003` | Aura Mini 5G | Aura | Smartphones | `SPH-003-BLU-64` | Sky Blue / 64GB | $499.00 | 30 |
|  |  |  |  | `SPH-003-GRN-128` | Sage Green / 128GB | $549.00 | 0 |
| `SPH-004` | Vortex Fold Z | Vortex | Smartphones | `SPH-004-BLK-256` | Obsidian Black / 256GB | $1399.00 | 12 |
|  |  |  |  | `SPH-004-SLV-512` | Mirror Silver / 512GB | $1599.00 | 5 |
| `LAP-001` | ZenithBook Pro 15 | Zenith | Laptops | `LAP-001-16G-512` | 16GB RAM / 512GB SSD | $1299.00 | 25 |
|  |  |  |  | `LAP-001-32G-1TB` | 32GB RAM / 1TB SSD | $1699.00 | 10 |
| `LAP-002` | ZenithBook Air 13 | Zenith | Laptops | `LAP-002-8G-256` | 8GB RAM / 256GB SSD | $899.00 | 35 |
|  |  |  |  | `LAP-002-16G-512` | 16GB RAM / 512GB SSD | $1099.00 | 0 |
| `LAP-003` | Titan Gaming Blade 16 | Titan | Laptops | `LAP-003-16G-1TB` | RTX 4070 / 16GB / 1TB | $1799.00 | 18 |
|  |  |  |  | `LAP-003-32G-2TB` | RTX 4080 / 32GB / 2TB | $2399.00 | 4 |
| `LAP-004` | NovaFlex 2-in-1 Touch | NovaTech | Laptops | `LAP-004-8G-512` | 8GB RAM / 512GB SSD | $749.00 | 22 |
|  |  |  |  | `LAP-004-16G-1TB` | 16GB RAM / 1TB SSD | $949.00 | 14 |
| `AUD-001` | Sonus QuietComfort Elite | Sonus | Audio | `AUD-001-BLK` | Matte Black | $299.00 | 50 |
|  |  |  |  | `AUD-001-WHT` | Ivory White | $299.00 | 3 |
| `AUD-002` | Pulse True Wireless Earbuds | Sonus | Audio | `AUD-002-BLK` | Graphite Black | $149.00 | 60 |
|  |  |  |  | `AUD-002-BLU` | Deep Navy | $149.00 | 40 |
| `AUD-003` | BassBoom 360 Bluetooth Speaker | BassBoom | Audio | `AUD-003-BLK` | Charcoal Black | $99.00 | 40 |
|  |  |  |  | `AUD-003-RED` | Crimson Red | $99.00 | 0 |
| `AUD-004` | StudioMaster Reference Monitor Pair | Sonus | Audio | `AUD-004-PAIR` | Matched Studio Pair | $399.00 | 15 |
| `HAP-001` | PureAir HEPA Smart Purifier | PureHome | Home Appliances | `HAP-001-WHT` | Glacier White | $179.99 | 32 |
|  |  |  |  | `HAP-001-SLV` | Brushed Silver | $199.99 | 0 |
| `HAP-002` | BreezeCool Ceramic Tower Heater | PureHome | Home Appliances | `HAP-002-BLK` | Matte Black | $89.99 | 24 |
| `HAP-003` | AeroMist Ultrasonic Humidifier | PureHome | Home Appliances | `HAP-003-4L` | 4L Standard White | $59.99 | 45 |
| `HAP-004` | DeconDehumidifier 50-Pint | AirPro | Home Appliances | `HAP-004-WHT` | Arctic White | $229.00 | 16 |
| `KIT-001` | ChefAir Digital 6-Quart Air Fryer | ChefCraft | Kitchen | `KIT-001-BLK` | Onyx Black | $99.99 | 55 |
|  |  |  |  | `KIT-001-SS` | Stainless Steel | $119.99 | 20 |
| `KIT-002` | BaristaTouch Espresso Machine | BaristaPro | Kitchen | `KIT-002-SS` | Brushed Stainless | $549.99 | 12 |
|  |  |  |  | `KIT-002-BLK` | Cast Iron Black | $549.99 | 4 |
| `KIT-003` | PowerBlend 1200W Blender | ChefCraft | Kitchen | `KIT-003-GRY` | Slate Gray | $79.99 | 38 |
| `KIT-004` | SmartSous Precision Immersion Cooker | ChefCraft | Kitchen | `KIT-004-BLK` | Stainless & Black | $129.99 | 26 |
| `CLN-001` | RoboVac Ultra LiDAR Robot Vacuum | CleanBot | Cleaning | `CLN-001-WHT` | Pearl White | $399.00 | 22 |
|  |  |  |  | `CLN-001-BLK` | Midnight Black | $399.00 | 0 |
| `CLN-002` | Cyclone Cordless Stick Vacuum | CleanBot | Cleaning | `CLN-002-BLU` | Cobalt Blue | $199.99 | 35 |
|  |  |  |  | `CLN-002-RED` | Ruby Red | $199.99 | 18 |
| `CLN-003` | HydroSteam Sanitizing Floor Mop | SteamClean | Cleaning | `CLN-003-WHT` | White & Cyan | $69.99 | 42 |
| `CLN-004` | DusterPro Handheld Car Vacuum | CleanBot | Cleaning | `CLN-004-GRY` | Space Gray | $49.99 | 50 |
| `APP-001` | BrightBuy Urban Commuter Backpack | ApexGear | Apparel | `APP-001-BLK` | Jet Black / 24L | $69.00 | 60 |
|  |  |  |  | `APP-001-GRY` | Slate Heather / 24L | $69.00 | 3 |
| `APP-002` | Apex All-Weather Travel Duffel | ApexGear | Apparel | `APP-002-OLV` | Olive Green / 45L | $89.00 | 25 |
| `APP-003` | Merino Wool Thermal Beanie | ApexGear | Apparel | `APP-003-BLK` | Classic Black | $24.99 | 80 |
|  |  |  |  | `APP-003-NVY` | Heather Navy | $24.99 | 65 |
| `APP-004` | Polarized Sports Sunglasses | ApexGear | Apparel | `APP-004-BLK` | Black Frame / Smoke Lens | $45.00 | 40 |
|  |  |  |  | `APP-004-TOR` | Tortoise / Bronze Lens | $45.00 | 0 |
| `MCL-001` | Classic Oxford Cotton Button-Down | Heritage | Men's Clothing | `MCL-001-WHT-M` | White / Size M | $49.50 | 40 |
|  |  |  |  | `MCL-001-BLU-L` | Sky Blue / Size L | $49.50 | 35 |
| `MCL-002` | Tech Stretch Chino Trousers | Heritage | Men's Clothing | `MCL-002-KHK-32` | Khaki / 32W 32L | $59.50 | 30 |
|  |  |  |  | `MCL-002-NVY-34` | Navy / 34W 32L | $59.50 | 2 |
| `MCL-003` | Merino Wool Crewneck Sweater | Heritage | Men's Clothing | `MCL-003-CHL-M` | Charcoal / Size M | $79.00 | 28 |
|  |  |  |  | `MCL-003-CAM-L` | Camel Tan / Size L | $79.00 | 15 |
| `MCL-004` | Lightweight Windbreaker Running Jacket | PeakAthletics | Men's Clothing | `MCL-004-BLK-L` | Stealth Black / Size L | $65.00 | 32 |
|  |  |  |  | `MCL-004-BLU-M` | Electric Blue / Size M | $65.00 | 0 |
| `WCL-001` | Tailored Silk-Blend Blouse | Elegance | Women's Clothing | `WCL-001-CRM-S` | Cream Ivory / Size S | $64.00 | 30 |
|  |  |  |  | `WCL-001-BLS-M` | Blush Pink / Size M | $64.00 | 25 |
| `WCL-002` | High-Rise Stretch Skinny Denim | DenimCo | Women's Clothing | `WCL-002-IND-28` | Dark Indigo / Size 28 | $68.00 | 40 |
|  |  |  |  | `WCL-002-BLK-30` | Washed Black / Size 30 | $68.00 | 4 |
| `WCL-003` | Cashmere Open-Front Cardigan | Elegance | Women's Clothing | `WCL-003-OAT-M` | Oatmeal Heather / Size M | $119.00 | 20 |
|  |  |  |  | `WCL-003-GRY-L` | Dove Gray / Size L | $119.00 | 15 |
| `WCL-004` | Breathable Flex Yoga Leggings | PeakAthletics | Women's Clothing | `WCL-004-BLK-S` | Classic Black / Size S | $48.00 | 55 |
|  |  |  |  | `WCL-004-SGE-M` | Sage Green / Size M | $48.00 | 0 |
