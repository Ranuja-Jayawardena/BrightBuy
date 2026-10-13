// Media evidence note: Verified live on brightbuy_dev and brightbuy_prod (2026-10-13).
// V26 is applied on both targets; product_images schema contains image_url VARCHAR(500) NOT NULL.
// All 52 seed/catalog images verified accessible (200 OK) in AWS S3.
// [Fix 6.2 cutover complete](../Fixes/Fix6-Cloud-Media-Storage-S3/fix6.2-s3-schema-migration-seed-cutover.md)
Table users {
  user_id serial [pk]
  email varchar(100) [unique, not null]
  password_hash varchar(255) [not null]
  email_verified_at timestamp
  role varchar(20) [not null, default: 'customer']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table customers {
  customer_id serial [pk]
  user_id int [unique, not null, ref: - users.user_id]
  first_name varchar(50) [not null]
  last_name varchar(50) [not null]
  phone varchar(20)
  updated_at timestamp [default: `now()`]
}

Table employees {
  employee_id serial [pk]
  user_id int [unique, not null, ref: - users.user_id]
  first_name varchar(50) [not null]
  last_name varchar(50) [not null]
  phone varchar(20)
  role varchar(30) [not null, default: 'super_admin', note: 'super_admin | inventory_manager | order_dispatcher | catalog_manager | analyst']
  is_active boolean [not null, default: true]

  indexes {
    (is_active) [name: 'idx_employees_active']
  }
  note: 'Guarded by V32: At least one active super_admin must always exist. Triggers: trg_protect_super_admin_row, trg_protect_super_admin_statement.'
}

Table super_admin_guard {
  id int [pk, note: 'Dedicated serialization row (id = 1) for concurrent super admin mutation gate']
  last_action timestamp [not null, default: `now()`]
}

Table addresses {
  address_id serial [pk]
  customer_id int [ref: > customers.customer_id, not null]
  address_line1 varchar(255) [not null]
  address_line2 varchar(255)
  city_id int [ref: > cities.city_id, not null]
  zip_code varchar(10) [not null]
  is_default boolean [default: false]

  indexes {
    (customer_id) [name: 'idx_addresses_customer_id']
    (customer_id) [unique, name: 'idx_addresses_default', note: 'WHERE is_default = true']
  }
}

Table cities {
  city_id serial [pk]
  city_name varchar(100) [not null]
  state varchar(100) [default: 'Texas']
  is_main_city boolean [not null, default: false]
}

Table categories {
  category_id serial [pk]
  category_name varchar(100) [not null]
  parent_category_id int [ref: > categories.category_id]
  is_active boolean [not null, default: true]
  note: 'V33 prevents parent cycles on INSERT/UPDATE and rejects category_id changes. Category writes use READ COMMITTED and a transaction advisory lock; the statement result is checked after multi-row writes.'

  indexes {
    parent_category_id
  }
}

Table products {
  product_id serial [pk]
  product_name varchar(100) [not null]
  brand varchar(100)
  description text
  base_sku varchar(50) [unique, not null]
  is_active boolean [not null, default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`, note: 'V27 row trigger sets transaction timestamp on every UPDATE, including no-op updates']

  indexes {
    product_name
    product_name [name: 'idx_products_name_trgm', note: 'GIN gin_trgm_ops, WHERE is_active = true']
    brand [name: 'idx_products_brand_trgm', note: 'GIN gin_trgm_ops, WHERE is_active = true']
    description [name: 'idx_products_description_trgm', note: 'GIN gin_trgm_ops, WHERE is_active = true']
  }
}

Table product_images {
  image_id serial [pk]
  product_id int [ref: > products.product_id, delete: cascade, not null]
  image_url varchar(500) [not null, note: 'Permanent AWS S3 object URL (V26); current backend requires configured bucket/product prefix; CDN support needs a contract change']
  sort_order int [not null, default: 0]
  is_primary boolean [not null, default: false]
  created_at timestamp [default: `now()`]

  indexes {
    (product_id) [unique, note: 'partial unique index WHERE is_primary = true']
    (product_id, sort_order)
  }
}

Table product_variants {
  variant_id serial [pk]
  product_id int [ref: > products.product_id, delete: cascade, not null]
  variant_sku varchar(50) [unique, not null]
  variant_name varchar(100)
  price decimal(10,2) [not null, note: 'CHECK price >= 0']
  stock_quantity int [not null, default: 0, note: 'CHECK stock_quantity >= 0']
  is_active boolean [not null, default: true]
  updated_at timestamp [default: `now()`, note: 'V27 row trigger sets transaction timestamp on every UPDATE, including no-op updates']

  indexes {
    product_id
    (product_id, price) [note: 'partial index WHERE is_active = true']
    price [note: 'partial index WHERE is_active = true']
  }
}

Table variant_attributes {
  attribute_id serial [pk]
  attribute_name varchar(50) [unique, not null]
}

Table variant_attribute_values {
  value_id serial [pk]
  variant_id int [ref: > product_variants.variant_id, delete: cascade, not null]
  attribute_id int [ref: > variant_attributes.attribute_id, not null]
  attribute_value varchar(100) [not null]

  indexes {
    (variant_id, attribute_id) [unique]
  }
}

Table carts {
  cart_id serial [pk]
  customer_id int [unique, ref: > customers.customer_id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    (customer_id) [unique, name: 'idx_carts_customer_id_unique']
  }
  note: 'Guarded by V29: Exactly one active cart per customer (D3).'
}

Table cart_items {
  cart_item_id serial [pk]
  cart_id int [ref: > carts.cart_id, not null]
  variant_id int [ref: > product_variants.variant_id, not null]
  quantity int [not null, note: 'CHECK (quantity > 0)']

  indexes {
    (cart_id, variant_id) [unique]
  }
}

Table orders {
  order_id serial [pk]
  customer_id int [ref: > customers.customer_id, not null]
  order_date timestamp [default: `now()`]
  status varchar(20) [not null, default: 'pending', note: 'CHECK status IN (pending, paid, shipped, delivered, cancelled)']
  total_amount decimal(10,2) [not null, note: 'CHECK total_amount >= 0']
  updated_at timestamp [default: `now()`]

  indexes {
    customer_id
    (status, order_date)
  }
}

Table order_idempotency_keys {
  key_id serial [pk]
  customer_id int [ref: > customers.customer_id, delete: cascade, not null]
  idempotency_key varchar(255) [not null]
  request_hash varchar(64) [not null]
  order_id int [ref: > orders.order_id, delete: set null]
  response_body jsonb [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (customer_id, idempotency_key) [unique, name: 'uq_order_idempotency_customer_key']
    (customer_id, idempotency_key) [name: 'idx_order_idempotency_lookup']
  }
  note: 'Introduced in V29: Durable idempotency mapping for checkout requests (D3).'
}

Table order_items {
  order_item_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  variant_id int [ref: > product_variants.variant_id, not null]
  quantity int [not null, note: 'CHECK quantity > 0']
  unit_price decimal(10,2) [not null, note: 'CHECK unit_price >= 0 (V31: chk_order_items_unit_price_nonnegative)']

  indexes {
    order_id
    variant_id
  }
}

Table product_categories {
  category_id int [ref: > categories.category_id, not null]
  product_id int [ref: > products.product_id, delete: cascade, not null]

  indexes {
    (product_id, category_id) [pk]
    category_id
  }
}

Table payments {
  payment_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  payment_method varchar(20) [not null, note: 'CHECK payment_method IN (card, cod)']
  payment_status varchar(20) [not null, default: 'pending', note: 'CHECK payment_status IN (pending, cod_pending, completed, failed)']
  amount decimal(10,2) [not null, note: 'CHECK amount >= 0 (V31: chk_payments_amount_nonnegative)']
  transaction_id varchar(100)
  payment_date timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    order_id [unique, name: 'idx_payments_order_id_unique', note: 'V30: Enforces 1:1 payment per order (D1)']
    transaction_id [unique, name: 'idx_payments_transaction_id_unique', note: 'V30: Non-null unique provider transaction index']
  }
}

Table deliveries {
  delivery_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  delivery_mode varchar(30) [not null, note: 'CHECK delivery_mode IN (home_delivery, store_pickup)']
  delivery_address_line1 varchar(255) [not null]
  delivery_address_line2 varchar(255)
  delivery_city_id int [ref: > cities.city_id, not null]
  delivery_zip_code varchar(10) [not null]
  estimated_delivery_days int
  tracking_number varchar(100)
  delivery_status varchar(30) [not null, default: 'pending', note: 'CHECK chk_deliveries_mode_status (V31: mode/status union consistency)']
  updated_at timestamp [default: `now()`]

  indexes {
    order_id [unique, name: 'idx_deliveries_order_id_unique', note: 'V31: Enforces 1:1 delivery per order (D4)']
  }
}

Table webhook_events {
  event_id varchar(255) [pk]
  event_name varchar(100) [not null]
  order_id int [ref: > orders.order_id]
  transaction_id varchar(100)
  processed_at timestamp [default: `now()`]
  payload jsonb

  indexes {
    order_id
  }
  note: 'Introduced in V30: Durable webhook deduplication store.'
}

Table payment_reconciliation_logs {
  log_id serial [pk]
  order_id int [ref: > orders.order_id]
  event_id varchar(255)
  event_name varchar(100)
  transaction_id varchar(100)
  discrepancy_type varchar(100) [not null]
  expected_value text
  received_value text
  payload jsonb
  created_at timestamp [default: `now()`]

  indexes {
    order_id
  }
  note: 'Introduced in V30: Durable audit log for late money, amount discrepancies, and refunds.'
}

Table refresh_tokens {
  token_id serial [pk]
  user_id int [ref: > users.user_id, not null]
  token_hash varchar(255) [not null]
  expires_at timestamp [not null]
  created_at timestamp [default: `now()`]
}

Table auth_email_tokens {
  token_id bigserial [pk]
  user_id int [ref: > users.user_id, not null]
  purpose varchar(20) [not null, note: 'verify | reset']
  token_hash char(64) [unique, not null]
  expires_at timestamp [not null]
  used_at timestamp
  created_at timestamp [not null, default: `now()`]

  indexes {
    (user_id, purpose)
  }
}

Table email_jobs {
  job_id bigserial [pk]
  event_key varchar(150) [unique]
  recipient varchar(254) [not null]
  subject text [not null]
  html text [not null]
  plain_text text [not null]
  status varchar(20) [not null, default: 'pending', note: 'pending | sending | sent | failed']
  attempts int [not null, default: 0]
  next_attempt_at timestamp [not null, default: `now()`]
  locked_at timestamp
  sent_at timestamp
  last_error text
  created_at timestamp [not null, default: `now()`]

  indexes {
    (next_attempt_at, job_id)
  }
}
