-- ============================================================================
-- Seed: Mumbaikar (Yonge St) — REAL menu
--
-- Source: "Yonge St Dine-in Menu | Mumbaikar.pdf" (mumbaikar.ca/yonge-st-dine-in-menu,
-- captured 2026-07-31). 23 categories, 170 items, 48 option groups, 122 option
-- values — exact prices as printed.
--
-- Transactional and safe to re-run: it clears its own previous menu data before
-- re-inserting. Orders are NOT touched — order_items.menu_item_id is
-- `on delete set null` and past lines keep their name_snapshot.
--
-- See the notes at the bottom of this file for the judgment calls made while
-- transcribing (variant pricing, duplicate names, two price conflicts).
--
-- ---------------------------------------------------------------------------
-- TARGET: restaurant d47e7243-95a9-4b2f-8efa-6ec3def03287 ("Mumbaikar",
-- slug mumbaikar-ey2d), owned by ckokil57@gmail.com.
--
-- Onboarding created two empty "Mumbaikar" rows 20 seconds apart under the same
-- owner, so neither the name nor the owner email identifies the account. The
-- UUID above is the one profiles.restaurant_id references — the account the
-- owner's dashboard loads. Before deleting anything the seed prints the name it
-- resolved, so the target is visible in the output.
-- ---------------------------------------------------------------------------
-- ============================================================================

begin;

-- Helpers: cut ~400 lines of repetition on option groups. pg_temp is dropped
-- automatically at the end of the session.
create function pg_temp.mk_opt(p_item uuid, p_name text, p_req boolean, p_type text, p_sort int)
returns uuid language plpgsql as $f$
declare v_id uuid; v_rid uuid;
begin
  select restaurant_id into v_rid from public.menu_items where id = p_item;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (v_rid, p_item, p_name, p_type, p_req, p_sort)
  returning id into v_id;
  return v_id;
end $f$;

create function pg_temp.mk_val(p_opt uuid, p_name text, p_delta numeric, p_sort int)
returns void language plpgsql as $f$
declare v_rid uuid;
begin
  select restaurant_id into v_rid from public.item_options where id = p_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (v_rid, p_opt, p_name, p_delta, p_sort);
end $f$;

do $$
declare
  -- Onboarding created TWO empty "Mumbaikar" restaurants 20s apart, both owned
  -- by ckokil57@gmail.com, so neither name nor owner email is unique. This is
  -- the one profiles.restaurant_id points at — i.e. the one the owner's
  -- dashboard actually loads. The other (6577bddd-…) is an orphan duplicate.
  rid constant uuid := 'd47e7243-95a9-4b2f-8efa-6ec3def03287';
  v_name text;
  v_cat uuid;
  v_itm uuid;
  v_opt uuid;
begin
  -- ---- confirm the target still exists, and name it before deleting --------
  select name into v_name from public.restaurants where id = rid;
  if v_name is null then
    raise exception 'No restaurant with id % — re-check the account in the admin dashboard.', rid;
  end if;
  raise notice 'Seeding menu for "%" (%)', v_name, rid;

  -- ---- idempotency: clear the existing menu --------------------------------
  -- Items first: deleting a category only nulls its items' category_id.
  delete from public.item_option_values where restaurant_id = rid;
  delete from public.item_options       where restaurant_id = rid;
  delete from public.menu_items         where restaurant_id = rid;
  delete from public.menu_categories    where restaurant_id = rid;

  -- =========================================================================
  -- 1. THALIS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Thalis', 10) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Seasonal Veg Thali',
     'Veg Kolhapuri, Batata Bhaaji, Matar Paneer, Kothimbir Wadi, Dal, Rice, Poori, Aamras, Papad', 26.99, 'veg', 10),
    (rid, v_cat, 'Malvani Chicken Thali',
     'Malvani Chicken Curry, Kombdi Vade, Rice, Solkadhi, Gulab Jamun', 24.99, 'non_veg', 20),
    (rid, v_cat, 'Mumbaikar Chicken Thali',
     'Kala Chicken Rassa, Thecha Chicken Sukka (Spicy), Chicken Kheema, Alani Paani, Rice, Chapati, Papad, Gulab Jamun', 25.99, 'non_veg', 30),
    (rid, v_cat, 'Mumbaikar Mutton Thali',
     'Kala Mutton Rassa, Thecha Chicken Sukka (Spicy), Chicken Kheema, Alani Paani, Rice, Chapati, Papad, Gulab Jamun', 27.99, 'non_veg', 40);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Maharashtrian Fish Thali',
     'Malvani Surmai Curry, Fried Surmai, Tisrya Masala, Dal, Rice, Chapati, Solkadhi, Gulab Jamun', 28.99, 'non_veg', 50)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Upgrade', false, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Pomfret Thali', 7.00, 10);

  -- =========================================================================
  -- 2. VEG APPETIZERS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Veg Appetizers', 20) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Mumbaikar Vada Pav', 'Spiced potato sliders, peanut & green chutney', 12.99, 'veg', 10)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Add-ons', false, 'multiple', 10);
  perform pg_temp.mk_val(v_opt, 'Butter toasted pav', 1.00, 10);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Sabudana Vada', 'Tapioca pearls, roasted peanuts, sweet yogurt & green chutney', 12.99, 'veg', 20),
    (rid, v_cat, 'Station Dabeli', 'Potato sliders, spicy peanuts, sev', 12.99, 'veg', 30),
    (rid, v_cat, 'Kanda Bhajji', 'Onion fritters, mint & tamarind chutneys', 11.99, 'veg', 40),
    (rid, v_cat, 'Pani Puri', 'Hollow puffed shells, potatoes, flavored water', 12.99, 'veg', 50),
    (rid, v_cat, 'Sev Puri', 'Indian Nachos, sev, tangy chutneys', 12.99, 'veg', 60),
    (rid, v_cat, 'Dahi Batata Puri', 'Sweet yogurt, sev, tangy chutneys', 12.99, 'veg', 70),
    (rid, v_cat, 'Gobi Manchurian', 'Crunchy Cauliflower - Hakka style', 15.99, 'veg', 80),
    (rid, v_cat, 'Veg Machurian', null, 15.99, 'veg', 90),
    (rid, v_cat, 'Ragada Pattice', 'Potato patties, white pea curry, tangy chutneys, crunchy sev', 12.99, 'veg', 110),
    (rid, v_cat, 'Samosa Chaat', 'Crispy samosa, tangy chutneys', 12.99, 'veg', 120),
    (rid, v_cat, 'Bombay Double Decker Sandwich', null, 16.99, 'veg', 130);

  -- Veg/Chicken Momos: two required choices (protein + sauce). Left unmarked
  -- for diet since the guest picks veg or chicken at order time.
  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Veg / Chicken Momos', 'Dumplings in choice of sauce', 15.99, null, 100)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Filling', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Veg', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Chicken', 0, 20);
  v_opt := pg_temp.mk_opt(v_itm, 'Sauce', true, 'single', 20);
  perform pg_temp.mk_val(v_opt, 'Masala', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Chili', 0, 20);
  perform pg_temp.mk_val(v_opt, 'Schezwan', 0, 30);

  -- =========================================================================
  -- 3. NON-VEG APPETIZERS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Non-Veg Appetizers', 30) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Surmai / Pomfret Fry', 'Semolina crusted fried King fish', 15.99, 'non_veg', 10)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of fish', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Surmai (King fish)', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Whole Pomfret', 6.00, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Chicken Lollipop', 'Frenched chicken wings', 17.99, 'non_veg', 20)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Upgrade', false, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Masala Lollipop', 2.00, 10);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Chicken Chilli / 65', 'Hakka style appetizer made with lightly battered boneless chicken', 17.99, 'non_veg', 30)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Preparation', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Chicken Chilli', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Chicken 65', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Bawa Kheema Pav', 'Minced Lamb, Buttered pav', 18.99, 'non_veg', 40)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Add-ons', false, 'multiple', 10);
  perform pg_temp.mk_val(v_opt, 'Sunny side up', 2.00, 10);

  -- =========================================================================
  -- 4. TANDOORI APPETIZERS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Tandoori Appetizers', 40) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Classic Paneer Tikka', 'Fresh Indian Cottage Cheese', 18.99, 'veg', 10),
    (rid, v_cat, 'Truffle Malai Tikka', 'Tender Chicken, Cheese, mild spiced', 18.99, 'non_veg', 20),
    (rid, v_cat, 'Tandoori Chicken Tikka', null, 18.99, 'non_veg', 40),
    (rid, v_cat, 'Tawa Seekh Kebab', 'Juicy, spiced minced lamb kebabs', 20.99, 'non_veg', 50),
    (rid, v_cat, 'Tandoori Lamb Chops', null, 32.99, 'non_veg', 60),
    (rid, v_cat, 'Mix Tandoori Platter', null, 35.99, 'non_veg', 70);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Mumbaikar Special Tandoori', null, 18.99, 'non_veg', 30)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Bone-in half chicken', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Salmon', 3.00, 20);

  -- =========================================================================
  -- 5. SIGNATURE SMALL PLATES
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Signature Small Plates', 50) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Kothimbir Wadi', 'Gram Flour, Loaded cilantro', 12.99, 'veg', 10),
    (rid, v_cat, 'Bombay Soya Chaap', 'Soy-protein skewers, house special sauce', 16.99, 'veg', 20),
    (rid, v_cat, 'Karwari Jhinga', 'Desi Shrimp Popcorn, Thecha Aioli', 17.99, 'non_veg', 50),
    (rid, v_cat, 'Goan Ros Omlette', 'Classic Goan Brunch preparation!', 16.99, 'non_veg', 70);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Mumbaikar Misal Pav', 'Moth Beans, Spicy curry', 16.99, 'veg', 30)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Add-ons', false, 'multiple', 10);
  perform pg_temp.mk_val(v_opt, 'Butter toasted pav', 1.00, 10);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Chefs Spl Pav Bhaaji', 'Spiced potato mixed veg curry', 17.99, 'veg', 40)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Style', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Classic', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Butter Pav Bhaaji', 1.01, 20);   -- 19.00
  perform pg_temp.mk_val(v_opt, 'Cheese Pav Bhaaji', 2.01, 30);   -- 20.00

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Mumbaikar Ghee Roast', null, 17.99, 'non_veg', 60)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of protein', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Chicken', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Mutton', 1.00, 20);
  perform pg_temp.mk_val(v_opt, 'Shrimp', 2.00, 30);

  -- =========================================================================
  -- 6-11. CURRIES (one category per protein, mirroring the printed menu)
  -- Names carry the protein because the kitchen ticket prints the item name
  -- alone, with no category context — see notes at the bottom of this file.
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Veg Curries', 60) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Dal Tadkevali', 16.99, 'veg', 10),
    (rid, v_cat, 'Truffle Dal Makhani', 17.99, 'veg', 20),
    (rid, v_cat, 'Bhindi Kokum Masala', 17.99, 'veg', 30),
    (rid, v_cat, 'Mix Veg Korma', 17.99, 'veg', 40),
    (rid, v_cat, 'Aloo Gobi', 17.99, 'veg', 50),
    (rid, v_cat, 'Chana Masala', 17.99, 'veg', 60);

  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Paneer Curries', 70) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Paneer Tikka Masala', 19.99, 'veg', 10),
    (rid, v_cat, 'Paneer Methi Malai', 19.99, 'veg', 20),
    (rid, v_cat, 'Paneer Palak (Spinach)', 18.99, 'veg', 30),
    (rid, v_cat, 'Paneer Butter Masala', 19.99, 'veg', 40);

  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Chicken Curries', 80) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Chicken Tikka Masala', 19.99, 'non_veg', 10),
    (rid, v_cat, 'Chicken Lapeta', 19.99, 'non_veg', 20),
    (rid, v_cat, 'Chicken Malvani Sukka', 19.99, 'non_veg', 30),
    (rid, v_cat, 'Chef Salian''s Special Butter Chicken', 19.99, 'non_veg', 40);

  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Lamb Curries', 90) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Lamb MH-04 Masala', 22.99, 'non_veg', 10),
    (rid, v_cat, 'Lamb Spinach', 22.99, 'non_veg', 20),
    (rid, v_cat, 'Rara Lamb', 22.99, 'non_veg', 30),
    (rid, v_cat, 'Lamb Malvani Sukka', 22.99, 'non_veg', 40);

  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Goat Curries (Bone-in)', 100) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Goat MH-04 Masala', 22.99, 'non_veg', 10),
    (rid, v_cat, 'Goat Spinach', 22.99, 'non_veg', 20),
    (rid, v_cat, 'Goat Rara', 22.99, 'non_veg', 30);

  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Seafood Curries', 110) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Goan Shrimp Curry', null, 24.99, 'non_veg', 10),
    (rid, v_cat, 'Salmon Fish Curry', 'Coconut milk base', 25.99, 'non_veg', 20);

  -- =========================================================================
  -- 12. SIGNATURE CURRIES
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Signature Curries', 120) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Bharali Vangi', 'Whole Indian Eggplant, Peanut spice mix', 17.99, 'veg', 10),
    (rid, v_cat, 'Veg Maratha Kofta', 'Mix veg kofta, velvety rich curry', 19.99, 'veg', 20),
    (rid, v_cat, 'Veg Kolhapuri', 'Fiery mix veg curry, regional spices', 18.99, 'veg', 30),
    (rid, v_cat, 'Parsi Salli Murg', 'Flavorful chicken topped with crunchy potato sticks', 18.99, 'non_veg', 40),
    (rid, v_cat, 'Saoji Chicken Curry', 'Hot n Spicy; Traditional Maharashtrian preparation', 20.99, 'non_veg', 50),
    (rid, v_cat, 'Chicken Xacuti', 'Regional Goan preparation', 20.99, 'non_veg', 60),
    (rid, v_cat, 'Tisrya Masala', 'Clams cooked with regional spices; a semi-dry preparation', 19.99, 'non_veg', 70);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Malvani Fish Curry',
     'Maharashtrian fish curry made with freshly ground coconut and Malvani masala; spicy & tangy', 22.99, 'non_veg', 80)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of fish', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Bone-in king fish steak', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Bone-in whole pomfret', 3.00, 20);
  perform pg_temp.mk_val(v_opt, 'Salmon', 3.00, 30);

  -- =========================================================================
  -- 13. RICE & NOODLES
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Rice & Noodles', 130) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Bombay Biryani',
     'Long grain basmati rice slow cooked with saffron & other aromatics', 18.99, null, 10)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of protein', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Veg', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Paneer Tikka', 1.00, 20);
  perform pg_temp.mk_val(v_opt, 'Chicken', 3.00, 30);
  perform pg_temp.mk_val(v_opt, 'Chicken Tikka', 3.00, 40);
  perform pg_temp.mk_val(v_opt, 'Goat', 5.00, 50);
  perform pg_temp.mk_val(v_opt, 'Lamb', 5.00, 60);
  perform pg_temp.mk_val(v_opt, 'Shrimp', 6.00, 70);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Ghee Roast Biryani',
     'Tangy and spicy; Basmati rice slow cooked with ghee and roasted spices', 20.99, null, 20)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of protein', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Paneer', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Chicken', 2.00, 20);
  perform pg_temp.mk_val(v_opt, 'Goat', 4.00, 30);
  perform pg_temp.mk_val(v_opt, 'Lamb', 4.00, 40);
  perform pg_temp.mk_val(v_opt, 'Shrimp', 5.00, 50);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Triple Schezwan Rice',
     'Hakka style rice & noodles specialty; served with Manchurian gravy', 19.99, null, 30)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of protein', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Paneer', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Egg & Chicken', 2.00, 20);
  perform pg_temp.mk_val(v_opt, 'Egg & Shrimp', 4.00, 30);
  v_opt := pg_temp.mk_opt(v_itm, 'Add-ons', false, 'multiple', 20);
  perform pg_temp.mk_val(v_opt, 'Extra egg', 2.99, 10);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Mumbaikar Chow Mein', 'Hakka style stir fried noodles', 19.99, null, 60)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice of protein', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Paneer', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Chicken', 2.00, 20);
  perform pg_temp.mk_val(v_opt, 'Shrimp', 4.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Kheema Pulao', 'Rice cooked with minced meat & spices', 19.99, 'non_veg', 40),
    (rid, v_cat, 'Tawa Pulao', 'Rice cooked with mix veg & spices', 18.99, 'veg', 50),
    (rid, v_cat, 'Dal Khichdi / Bombay Risotto', 'Hearty Indian dish consisting of rice & lentils', 16.99, 'veg', 70),
    (rid, v_cat, 'Jeera Rice', 'Cumin flavored Basmati Rice', 5.99, 'veg', 80);

  -- =========================================================================
  -- 14. BREADS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Breads', 140) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Chapati', 'Thin whole wheat flatbread - 2pcs', 2.99, 'veg', 10),
    (rid, v_cat, 'Crispy Lachha Paratha', null, 5.99, 'veg', 60);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Pav', '2 Pcs', 2.99, 'veg', 20)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Style', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Plain', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Butter toasted', 1.00, 20);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Whole Wheat Tandoori Roti', 3.49, 'veg', 30)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Add', false, 'multiple', 10);
  perform pg_temp.mk_val(v_opt, 'Butter', 1.00, 10);
  perform pg_temp.mk_val(v_opt, 'Garlic', 1.00, 20);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Naan', 3.99, 'veg', 40)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Add', false, 'multiple', 10);
  perform pg_temp.mk_val(v_opt, 'Butter', 1.00, 10);
  perform pg_temp.mk_val(v_opt, 'Garlic', 1.00, 20);
  perform pg_temp.mk_val(v_opt, 'Green chilli', 1.00, 30);
  perform pg_temp.mk_val(v_opt, 'Cheese chilli garlic', 2.00, 40);
  perform pg_temp.mk_val(v_opt, 'Truffle paneer', 3.00, 50);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order)
  values (rid, v_cat, 'Kulcha', 'Naan with your choice of stuffing', 5.99, 'veg', 50)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Stuffing', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Onion', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Spiced potato', 0, 20);
  perform pg_temp.mk_val(v_opt, 'Paneer', 0, 30);
  perform pg_temp.mk_val(v_opt, 'Cheese', 0, 40);

  -- =========================================================================
  -- 15. ACCOMPANIMENTS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Accompaniments', 150) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Lachha Onion', 4.99, 'veg', 10),
    (rid, v_cat, 'Onion Tomato Raita', 5.99, 'veg', 20),
    (rid, v_cat, 'Assorted Papad Basket', 6.99, 'veg', 30),
    (rid, v_cat, 'Cheese Masala Fries', 7.99, 'veg', 60);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Mango Chutney / Pickle', 3.99, 'veg', 40)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Mango chutney', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Pickle', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Green Chutney / Schezwan', 3.99, 'veg', 50)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Green chutney', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Schezwan', 0, 20);

  -- =========================================================================
  -- 16. KIDS MENU
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Kids Menu', 160) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order) values
    (rid, v_cat, 'Chicken Fingers & Fries', 9.99, 'non_veg', 10),
    (rid, v_cat, 'Dal Khichdi', 10.99, 'veg', 20),
    (rid, v_cat, 'Noodles', 10.99, 'veg', 30);

  -- =========================================================================
  -- 17. DESSERTS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Desserts', 170) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Kulfi Falooda', 'Rose syrup, Traditional Indian icecream', 9.99, 'veg', 10),
    (rid, v_cat, 'Pistachio Tres Leches', 'A crowd favorite..', 9.99, 'veg', 20),
    (rid, v_cat, 'Sizzling Brownie', 'Decadent brownie + Icecream scoop + Melted chocolate + sizzle!', 9.99, 'veg', 30),
    (rid, v_cat, 'Pan Kulfi', 'Betel nut flavored Indian icecream', 6.99, 'veg', 40),
    (rid, v_cat, 'Gulab Jamun & Rabri', null, 9.99, 'veg', 50);

  -- =========================================================================
  -- 18. DRINKS (non-alcoholic)
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Drinks', 180) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Masala Chai', null, 5.99, 'veg', 10),
    (rid, v_cat, 'Kokum Sherbet', null, 5.99, 'veg', 20),
    (rid, v_cat, 'Solkadhi', null, 6.99, 'veg', 30),
    (rid, v_cat, 'Mango Lassi', null, 6.99, 'veg', 40),
    (rid, v_cat, 'Boozy Mango Lassi', 'With Alcohol', 9.99, null, 50),
    (rid, v_cat, 'Jeera Soda', null, 5.99, 'veg', 90),
    (rid, v_cat, 'Masala Coke', null, 5.99, 'veg', 100);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Coke / Diet / Zero', 3.99, 'veg', 60)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Coke', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Diet Coke', 0, 20);
  perform pg_temp.mk_val(v_opt, 'Coke Zero', 0, 30);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Fanta / Ginger Ale / Iced Tea', 3.99, 'veg', 70)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Fanta', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Ginger Ale', 0, 20);
  perform pg_temp.mk_val(v_opt, 'Iced Tea', 0, 30);

  insert into public.menu_items (restaurant_id, category_id, name, price, diet, sort_order)
  values (rid, v_cat, 'Thums Up / Limca', 4.99, 'veg', 80)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Thums Up', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Limca', 0, 20);

  -- =========================================================================
  -- 19. MOCKTAILS — all 12.99
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Mocktails', 190) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, diet, sort_order) values
    (rid, v_cat, 'Virgin Pina Colada', 'Coconut cream + Pineapple juice', 12.99, 'veg', 10),
    (rid, v_cat, 'Virgin Blueberry Mojito', 'Lime juice + Blueberry + Mint', 12.99, 'veg', 20),
    (rid, v_cat, 'Spicy Ananas Margarita', 'Spice Mix + Pineapple juice', 12.99, 'veg', 30),
    (rid, v_cat, 'Shirley Temple', 'Orange Juice + Grenadine', 12.99, 'veg', 40);

  -- =========================================================================
  -- 20. COCKTAILS — signature 12.50, classic 11.50
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Cocktails', 200) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Muchhadvala', 'Paan Liqueur + Malibu + Rooh Afza (1.5 oz)', 12.50, 10),
    (rid, v_cat, 'Old Bombay', 'Maple syrup + Bourbon Whiskey + Curry Leaves (1 oz)', 12.50, 20),
    (rid, v_cat, 'Kokumtini', 'Kokum syrup + Vodka + Vermouth (2 oz)', 12.50, 30),
    (rid, v_cat, 'Mango Bite', 'Pineapple Juice + Mango Pulp + Mango Liqueur (2 oz)', 12.50, 40),
    (rid, v_cat, 'Orange Banta Soda', 'Aperol + Masala Soda + Orange Juice (1.5 oz)', 12.50, 50),
    (rid, v_cat, 'Chili Ananas Margarita', 'Tequila + Pineapple Juice + Spice Mix (1.5 oz)', 12.50, 60),
    (rid, v_cat, 'Caesar', 'Clamato + Vodka + Tabasco', 11.50, 70),
    (rid, v_cat, 'Long Island Iced Tea', 'Iced Tea + Classic Long Island mix', 11.50, 80),
    (rid, v_cat, 'Cosmopolitan', 'Vodka + Triple Sec + Lime juice + Cranberry juice', 11.50, 90),
    (rid, v_cat, 'Lime Margarita', 'Tequila + Lime juice + Simple syrup', 11.50, 100),
    (rid, v_cat, 'Tequila Sunrise', 'Tequila + Orange Juice + Grenadine', 11.50, 110),
    (rid, v_cat, 'Classic Mojito', 'White Rum + Club Soda + Lime juice + Mint', 11.50, 120),
    (rid, v_cat, 'Pina Colada', 'White Rum + Coconut cream + Pineapple juice', 11.50, 130),
    (rid, v_cat, 'Old Fashion', 'Rye + Bitters + Simple syrup', 11.50, 140),
    (rid, v_cat, 'Dirty Martini', 'Vodka + Dry Vermouth + Green olive', 11.50, 150),
    (rid, v_cat, 'Manhattan', 'Rye Whiskey + Sweet Vermouth + Bitters', 11.50, 160);

  -- =========================================================================
  -- 21. BEER & CIDERS
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Beer & Ciders', 210) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Belgian Moon White', 'Local / domestic', 7.50, 20),
    (rid, v_cat, 'Creemore Lager', 'Local / domestic', 7.50, 30),
    (rid, v_cat, 'Amsterdam 3 Speed Lager', 'Local / domestic', 9.00, 40),
    (rid, v_cat, 'Kingfisher', 'India', 8.00, 70),
    (rid, v_cat, 'Utsav', 'India', 7.50, 80),
    (rid, v_cat, 'Maka Goa Honey Ale', 'Belgian', 8.00, 90),
    (rid, v_cat, 'Heineken', 'Amsterdam', 7.00, 100),
    (rid, v_cat, 'Tuborg', 'Denmark', 7.00, 110),
    (rid, v_cat, 'Erdinger', 'Germany', 8.00, 120),
    (rid, v_cat, 'Corona', 'Mexico', 7.00, 130),
    (rid, v_cat, 'Sapporo', 'Japan', 8.00, 150),
    (rid, v_cat, 'Guinness', 'Ireland', 8.00, 160),
    (rid, v_cat, 'Smirnoff Ice', 'Cooler / cider', 7.00, 180),
    (rid, v_cat, 'Heineken 0.0', 'Non-alcoholic', 4.50, 200);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Woodhouse Lager / IPA', 'Local / domestic', 7.00, 10)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Lager', 0, 10);
  perform pg_temp.mk_val(v_opt, 'IPA', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Budweiser / Canadian Molson', 'Local / domestic', 7.00, 50)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Budweiser', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Canadian Molson', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Moosehead / Dollar Bill', 'Local / domestic', 7.00, 60)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Moosehead', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Dollar Bill', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Stella / Hoegaarden', 'Belgium', 7.00, 140)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Stella', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Hoegaarden', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'White Claw', 'Cooler / cider', 7.00, 170)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Flavour', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Mango', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Raspberry', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Becks / Budweiser Zero', 'Non-alcoholic', 4.50, 190)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Becks', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Budweiser Zero', 0, 20);

  -- =========================================================================
  -- 22. WHISKY & SPIRITS — all priced per 1 oz
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Whisky & Spirits', 220) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Bulleit Bourbon', 'Whisky / Rye / Bourbon — 1 oz', 8.50, 30),
    (rid, v_cat, 'Chivas Regal 12 yrs', 'Scotch - blended — 1 oz', 9.50, 40),
    (rid, v_cat, 'Johnny Walker Black', 'Scotch - blended — 1 oz', 9.50, 60),
    (rid, v_cat, 'Antiquity Blue', 'Scotch - blended — 1 oz', 7.50, 70),
    (rid, v_cat, 'Amrut Fusion', 'Scotch - single malt — 1 oz', 12.50, 80),
    (rid, v_cat, 'Glenfiddich 12 yrs', 'Scotch - single malt — 1 oz', 12.00, 90),
    (rid, v_cat, 'Paul John Nirvana Indian Single Malt', 'Scotch - single malt — 1 oz', 9.00, 110),
    (rid, v_cat, 'Glenmorangie 10 yrs', 'Scotch - single malt — 1 oz', 10.00, 120),
    (rid, v_cat, 'Hennessy VS', 'Cognac — 1 oz', 10.00, 130),
    (rid, v_cat, 'Hennessy VSOP', 'Cognac — 1 oz', 13.00, 140);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Crown Royal / Royal Challenge', 'Whisky / Rye / Bourbon — 1 oz', 7.00, 10)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Crown Royal', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Royal Challenge', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Jack Daniels / Jameson', 'Whisky / Rye / Bourbon — 1 oz', 8.00, 20)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Jack Daniels', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Jameson', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Teachers / Ballantine''s', 'Scotch - blended — 1 oz', 7.00, 50)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Teachers', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Ballantine''s', 0, 20);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Glenlivet 15 yrs / Macallan 12 yrs', 'Scotch - single malt — 1 oz', 13.00, 100)
  returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Choice', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, 'Glenlivet 15 yrs', 0, 10);
  perform pg_temp.mk_val(v_opt, 'Macallan 12 yrs', 0, 20);

  -- =========================================================================
  -- 23. WINE — base price is the 6 oz pour; 9 oz and bottle are options
  -- =========================================================================
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Wine', 230) returning id into v_cat;

  -- Red
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Jackson Triggs Shiraz', 'Red — CAD', 8.00, 10) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 24.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Wolf Blass Cab Sauvignon', 'Red — AUS', 9.00, 20) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 25.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Wayne Gretzky Merlot', 'Red — CAD', 9.00, 30) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 25.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chateau Timberlay Bordeaux', 'Red — FRA', 9.00, 40) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 25.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Masi Campofiorin', 'Red — ITL', 10.00, 50) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 28.00, 30);

  -- White / rosé / sparkling
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Jackson Triggs Chardonnay', 'White — CAD', 8.00, 60) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 24.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Kim Crawford Sauv Blanc', 'White — NZ', 10.00, 70) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 28.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Masi Masianco Pinot Grigio', 'White — ITL', 10.00, 80) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 28.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Jacob''s Creek Moscato', 'White — AUS', 10.00, 90) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 28.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'White Hill Rose', 'Rose — NZ', 9.00, 100) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 25.00, 30);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Zonin Prosecco', 'Sparkling', 9.00, 110) returning id into v_itm;
  v_opt := pg_temp.mk_opt(v_itm, 'Size', true, 'single', 10);
  perform pg_temp.mk_val(v_opt, '6 oz', 0, 10);
  perform pg_temp.mk_val(v_opt, '9 oz', 4.00, 20);
  perform pg_temp.mk_val(v_opt, 'Bottle', 25.00, 30);

  raise notice '--------------------------------------------------------------';
  raise notice 'Menu seeded for "%" (%).', v_name, rid;
  raise notice '  categories    : %', (select count(*) from public.menu_categories    where restaurant_id = rid);
  raise notice '  items         : %', (select count(*) from public.menu_items         where restaurant_id = rid);
  raise notice '  option groups : %', (select count(*) from public.item_options       where restaurant_id = rid);
  raise notice '  option values : %', (select count(*) from public.item_option_values where restaurant_id = rid);
  raise notice '--------------------------------------------------------------';
end $$;

commit;

-- ============================================================================
-- TRANSCRIPTION NOTES — please review before going live
--
-- 1. Variant pricing. Where the printed menu lists one dish at several prices
--    (Bombay Biryani VEG 18.99 … SHRIMP 24.99), the item is stored at the
--    LOWEST printed price and the rest are option price_deltas. Every final
--    price still lands exactly on a printed number.
--
-- 2. Curry names carry their protein. The menu prints "TIKKA MASALA" under both
--    CHICKEN and PANEER, and "MH-04 MASALA" under both LAMB and GOAT. Kitchen
--    tickets print the item name with no category, so these are stored as
--    "Chicken Tikka Masala" / "Paneer Tikka Masala" / "Lamb MH-04 Masala" /
--    "Goat MH-04 Masala" to keep tickets unambiguous.
--
-- 3. TWO PRICE CONFLICTS in the source PDF — I used the food-menu page in both
--    cases but you should confirm which is current:
--      a. Non-alcoholic beer: drinks card (p1) says $4.50; food menu (p6) says
--         $6.99. Seeded at 4.50.
--      b. Mocktails: both say 12.99, but the drinks card lists "Virgin Mojito /
--         Virgin Margarita" where the food menu lists "Virgin Blueberry Mojito /
--         Spicy Ananas Margarita". Seeded with the food-menu names.
--
-- 4. Beer sizes. The drinks card heads the tap section "12oz $7 / 18oz $8.99"
--    but then prints a different per-beer price for each ($7–$9). I seeded the
--    per-beer prices with NO size option, since guessing a size upcharge would
--    overcharge guests. Add a size option group if the tap pricing is real.
--
-- 5. Diet marks. Left NULL (unmarked) on alcohol, on Boozy Mango Lassi, and on
--    dishes where the guest picks the protein (Biryani, Chow Mein, Momos,
--    Triple Schezwan Rice). Goan Ros Omlette is marked non_veg (egg).
--
-- 6. Accents dropped for printer safety: "Virgin Pina Colada", "White Hill Rose"
--    — the 58mm thermal path is plain ASCII.
--
-- 7. NOT seeded from the PDF: the p7 house rules (45-min-before-close arrival,
--    15% gratuity on tables of 5+, allergen and halal notices). Those belong in
--    restaurant settings, not menu items.
-- ============================================================================
