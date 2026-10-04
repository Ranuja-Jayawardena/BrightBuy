CREATE TABLE variant_attribute_values (
  value_id serial PRIMARY KEY,
  variant_id int REFERENCES product_variants(variant_id) ON DELETE CASCADE NOT NULL,
  attribute_id int REFERENCES variant_attributes(attribute_id) NOT NULL,
  attribute_value varchar(100) NOT NULL,
  UNIQUE (variant_id, attribute_id)
);
