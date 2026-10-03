Table users {
  user_id serial [pk]
  email varchar(100) [unique, not null]
  password_hash varchar(255) [not null]
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
}

Table products {
  product_id serial [pk]
  product_name varchar(100) [not null]
  brand varchar(100)
  description text
  base_sku varchar(50) [unique, not null]
  is_active boolean [not null, default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table product_images {
  image_id serial [pk]
  product_id int [ref: > products.product_id, not null]
  image_data bytea [not null]
  sort_order int [not null, default: 0]
  is_primary boolean [not null, default: false]
  created_at timestamp [default: `now()`]
}

Table product_variants {
  variant_id serial [pk]
  product_id int [ref: > products.product_id, not null]
  variant_sku varchar(50) [unique, not null]
  variant_name varchar(100)
  price decimal(10,2) [not null]
  stock_quantity int [not null, default: 0]
  is_active boolean [not null, default: true]
  updated_at timestamp [default: `now()`]
}

Table variant_attributes {
  attribute_id serial [pk]
  attribute_name varchar(50) [unique, not null]
}

Table variant_attribute_values {
  value_id serial [pk]
  variant_id int [ref: > product_variants.variant_id, not null]
  attribute_id int [ref: > variant_attributes.attribute_id, not null]
  attribute_value varchar(100) [not null]

  indexes {
    (variant_id, attribute_id) [unique]
  }
}

Table carts {
  cart_id serial [pk]
  customer_id int [ref: > customers.customer_id, not null]
  created_at timestamp [default: `now()`]
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
  status varchar(20) [not null, default: 'pending']
  total_amount decimal(10,2) [not null]
  updated_at timestamp [default: `now()`]
}

Table order_items {
  order_item_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  variant_id int [ref: > product_variants.variant_id, not null]
  quantity int [not null]
  unit_price decimal(10,2) [not null]
}

Table product_categories {
  category_id int [ref: > categories.category_id, not null]
  product_id int [ref: > products.product_id, not null]

  indexes {
    (product_id, category_id) [pk]
  }
}

Table payments {
  payment_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  payment_method varchar(20) [not null]
  payment_status varchar(20) [not null, default: 'pending']
  amount decimal(10,2) [not null]
  transaction_id varchar(100)
  payment_date timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table deliveries {
  delivery_id serial [pk]
  order_id int [ref: > orders.order_id, not null]
  delivery_mode varchar(30) [not null]
  delivery_address_line1 varchar(255) [not null]
  delivery_address_line2 varchar(255)
  delivery_city_id int [ref: > cities.city_id, not null]
  delivery_zip_code varchar(10) [not null]
  estimated_delivery_days int
  tracking_number varchar(100)
  delivery_status varchar(30) [not null, default: 'pending']
  updated_at timestamp [default: `now()`]
}

Table refresh_tokens {
  token_id serial [pk]
  user_id int [ref: > users.user_id, not null]
  token_hash varchar(255) [not null]
  expires_at timestamp [not null]
  created_at timestamp [default: `now()`]
}
