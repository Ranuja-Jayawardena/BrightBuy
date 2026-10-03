# Phase 4.3: Product Listing, Search & Category Navigation UI

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Not Started
> **Assigned To:** A
> **Depends On:** 4.1, 4.2 (can start with mock data based on the contracts)
> **Blocks:** 10.1

---

## Goal

Build the storefront browsing experience: product grid, search, filters, and category navigation.

---

## Tasks

- [ ] Product listing page (`/products`) — responsive grid of product cards (primary image, name, brand, price range)
- [ ] Category navigation sidebar — renders the tree from `GET /api/categories`
- [ ] Search component — live search with debounced input
- [ ] Filter and sort controls (brand, price sort) synced to URL query params
- [ ] Pagination controls
- [ ] Fetch data with `fetch`/Axios inside `useEffect` (no TanStack Query)
- [ ] Responsive layout from mobile to desktop

---

## Definition of Done

- Users can browse, search, filter by category/brand, sort, and paginate products against the real API.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

