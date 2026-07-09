-- ============================================================================
-- Seed: Angara Indian & Hakka Cuisine (Toronto) demo menu
-- Replaces ALL menu data, tables and orders for the test restaurant, then
-- loads the Angara downtown menu (13 categories, ~140 items) and 10 tables.
-- Run in the Supabase SQL editor. Safe to re-run (it wipes first).
-- ============================================================================

do $$
declare
  rid   uuid := '6c93c4fc-517d-4949-86b2-b0f07ae1e018'; -- test restaurant
  v_cat uuid;
  v_itm uuid;
  v_opt uuid;
begin
  -- ------------------------------------------------------------------ wipe --
  delete from public.server_calls      where restaurant_id = rid;
  delete from public.orders            where restaurant_id = rid; -- cascades order_items
  delete from public.item_option_values where restaurant_id = rid;
  delete from public.item_options      where restaurant_id = rid;
  delete from public.menu_items        where restaurant_id = rid;
  delete from public.menu_categories   where restaurant_id = rid;
  delete from public.tables            where restaurant_id = rid;

  -- --------------------------------------------------------------- profile --
  update public.restaurants set
    name        = 'Angara Indian & Hakka Cuisine',
    cuisine     = 'Indian',
    description = 'Indian classics and Hakka street favourites, fresh from the tandoor.',
    currency    = 'CAD',
    tax_rate    = 13.00
  where id = rid;

  -- ---------------------------------------------------------------- tables --
  insert into public.tables (restaurant_id, label)
  select rid, 'Table ' || i from generate_series(1, 10) as i;

  -- ===================================================== 1. Appetizers =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Appetizers', 1) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Masala French Fries', 'Crispy fries tossed in a spiced masala mix.', 8.99, 1),
    (rid, v_cat, 'Masala Papad', 'Roasted lentil crisps topped with a spiced onion-tomato salad.', 10.99, 2),
    (rid, v_cat, 'Hara Bhara Kabab (6 pcs)', 'Lightly spiced mixed-vegetable patties, batter-fried.', 13.99, 3),
    (rid, v_cat, 'Paneer Ke Gulguley (6 pcs)', 'Crisp-fried cottage cheese balls.', 13.99, 4),
    (rid, v_cat, 'Onion Bhaji', 'Golden batter-fried onion fritters.', 9.99, 6),
    (rid, v_cat, 'Chicken Pakora (8 pcs)', 'Batter-fried chicken bites.', 13.99, 7),
    (rid, v_cat, 'Veggie Mix Pakora (8 pcs)', 'Assorted vegetable fritters.', 12.99, 8),
    (rid, v_cat, 'Honey Chilli Potato', 'Crispy potatoes glazed in honey-chilli sauce.', 11.99, 9),
    (rid, v_cat, 'Veg Samosa (2 pcs)', 'Handmade pastry stuffed with spiced potatoes.', 6.99, 10),
    (rid, v_cat, 'Tandoori Wings (8 pcs)', 'Marinated chicken wings finished in the tandoor.', 15.99, 11),
    (rid, v_cat, 'Bombay Chicken', 'Boneless chicken tossed dry with red onion, green chilli and curry leaves. Medium-hot.', 16.99, 12),
    (rid, v_cat, 'Bombay Paneer', 'Paneer tossed dry with red onion, green chilli and curry leaves. Medium-hot.', 16.99, 13),
    (rid, v_cat, 'Angara Veg Platter', 'Veggie pakora, paneer gulguley, hara bhara kabab and samosa.', 15.99, 14),
    (rid, v_cat, 'Butter Chicken Poutine', 'Desi-style poutine smothered in butter chicken sauce.', 13.99, 15),
    (rid, v_cat, 'Drums of Heaven', 'Chicken lollipops tossed in house chilli sauce.', 18.99, 16),
    (rid, v_cat, 'Chicken Lollipop (8 pcs)', 'Crispy fried chicken lollipops.', 17.99, 17),
    (rid, v_cat, 'Amritsari Macchi (8 pcs)', 'Batter-fried fish fillet, Amritsar style.', 17.99, 18);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Khatti Mithi', 'Your choice, battered and tossed in a tangy-sweet sauce.', 14.99, 5)
  returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order) values
    (rid, v_opt, 'Cauliflower', 0, 1), (rid, v_opt, 'Paneer', 1.00, 2), (rid, v_opt, 'Chicken', 2.00, 3);

  -- ==================================================== 2. Street Food =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Street Food', 2) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Bhel Puri', 'Puffed rice, sev, onion and coriander in tangy chutneys.', 9.99, 1),
    (rid, v_cat, 'Chaat Paapdi', 'Flour crisps with chickpeas and potato in chutneys and yogurt.', 10.49, 2),
    (rid, v_cat, 'Samosa Chaat', 'Crushed samosa with chickpeas, chutney and yogurt.', 11.99, 3),
    (rid, v_cat, 'Dahi Bhalla Chaat', 'Soft lentil dumplings in chutney and yogurt.', 10.99, 4),
    (rid, v_cat, 'Aloo Tikki Chaat', 'Potato patties topped with chutneys and yogurt.', 11.99, 5),
    (rid, v_cat, 'Dahi Puri Chaat', 'Mumbai-style puri shells with yogurt and sev.', 12.99, 6);

  -- ========================================================== 3. Momos =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Momos', 3) returning id into v_cat;

  -- helper pattern: each momo gets a Veg/Chicken filling choice
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Steam Momo', 'Classic steamed dumplings.', 14.99, 1) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Fried Momo', 'Crisp-fried dumplings.', 14.99, 2) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Tandoori Momo', 'Momos marinated in house red sauce and grilled in the tandoor.', 16.99, 3) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chilli Momo (Spicy)', 'Momos tossed with peppers in chilli sauce.', 15.99, 4) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 2) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Afghani Momo', 'Momos tossed in a mild creamy sauce.', 17.99, 5) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Butter Chicken Momo', 'Chicken momos in butter chicken sauce. Mild.', 16.99, 6),
    (rid, v_cat, 'Paneer Makhni Veg Momo', 'Veggie momos in paneer makhni sauce. Mild.', 16.99, 7);

  -- ================================================= 4. Soups & Salads =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Soups & Salads', 4) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Hot and Sour Soup', 'Peppery Indo-Chinese classic.', 7.99, 1) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Manchow Soup', 'Spicy soup topped with crispy noodles.', 7.99, 2) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Sweet Corn Soup', 'Silky corn soup.', 8.99, 3) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Kuchumber Salad', 'Cucumber, tomato, onion and carrot, lightly spiced.', 8.99, 4),
    (rid, v_cat, 'Peanut Masala', 'Peanuts with chaat masala, cucumber, onion, tomato and green chilli.', 9.99, 5),
    (rid, v_cat, 'Green Salad', 'Fresh garden salad.', 9.99, 6);

  -- ================================================== 5. Tandoor Grills ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Tandoor Grills', 5) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Kashmiri Paneer Tikka', 'Cottage cheese marinated in ginger, garlic and yogurt.', 17.99, 1),
    (rid, v_cat, 'Paneer Mint Tikka', 'Cottage cheese marinated in fresh mint, chilli and garlic.', 17.99, 2),
    (rid, v_cat, 'Malaiwala Paneer Tikka', 'Cottage cheese in a creamy, lightly spiced marinade.', 17.99, 3),
    (rid, v_cat, 'Tandoori Masala Chaap', 'Soya chaap marinated in ginger, garlic and spices.', 16.99, 4),
    (rid, v_cat, 'Paneer Tikka Trio', 'Kashmiri, mint and malaiwala paneer tikka together.', 18.99, 5),
    (rid, v_cat, 'Tandoori Wild Mushrooms', 'Wild mushrooms in house red-sauce marinade, tandoor-grilled.', 17.99, 6),
    (rid, v_cat, 'Soya Malai Chaap', 'Soya chaap in a creamy spiced marinade.', 17.99, 7),
    (rid, v_cat, 'Veg Mix Grill', 'A grand platter of grilled vegetable and paneer specialties.', 28.99, 8),
    (rid, v_cat, 'Tandoori Chicken', 'Half chicken, marinated and roasted in the tandoor.', 17.99, 9),
    (rid, v_cat, 'Hariyali Chicken', 'Boneless chicken tikka in mint, coriander and chilli marinade.', 17.99, 10),
    (rid, v_cat, 'Chicken Tikka Trio', 'Three chicken tikka preparations on one platter.', 18.99, 11),
    (rid, v_cat, 'Adraki Lamb Chops', 'Lamb chops marinated in ginger and spices.', 26.99, 12),
    (rid, v_cat, 'Tandoori Jungli Jhinga', 'Shrimp marinated in ginger and spices, tandoor-grilled.', 24.99, 13),
    (rid, v_cat, 'Chicken Tikka', 'Boneless chicken cubes, marinated and tandoor-grilled.', 17.99, 14),
    (rid, v_cat, 'Afghani Chicken Tikka', 'Boneless chicken in a cashew and malai marinade.', 17.99, 15),
    (rid, v_cat, 'Chicken Kali Mirch Tikka', 'Boneless chicken in black pepper and spices.', 17.99, 16),
    (rid, v_cat, 'Salmon Tikka (Jal Ki Rani Tandoor Mein)', 'Thick-cut salmon tikka from the tandoor.', 25.99, 17),
    (rid, v_cat, 'Angara Non-Veg Mix Grill', 'Chicken, lamb and shrimp grills on one platter.', 34.99, 19);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Luckhnowi Sheekh Kabab', 'Spiced minced kabab, cooked in the tandoor.', 17.99, 18) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Chicken', 0, 1), (rid, v_opt, 'Lamb', 0, 2);

  -- ============================================ 6. Hakka (Indo-Chinese) ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Hakka (Indo-Chinese)', 6) returning id into v_cat;

  -- gravy/dry items
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Veg Manchurian', 'Vegetable balls in classic Manchurian sauce.', 15.95, 1) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Gobi Manchurian', 'Crispy cauliflower in Manchurian sauce.', 15.95, 2) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chilli Paneer', 'Paneer tossed with peppers in chilli sauce.', 16.95, 3) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chilli Chicken', 'Chicken tossed with peppers in chilli sauce.', 16.95, 4) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chicken Manchurian', 'Chicken in classic Manchurian sauce.', 16.95, 5) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chilli Fish', 'Fish tossed with peppers in chilli sauce.', 16.95, 6) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Szechuan Chicken', 'Chicken in fiery Szechuan sauce.', 16.95, 7) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Beef Manchurian', 'Beef in classic Manchurian sauce.', 16.95, 8) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Gravy', 0, 1), (rid, v_opt, 'Dry', 1.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Triple Schezwan', 'Loaded triple Szechuan — rice, noodles and crispy toppings.', 20.99, 9) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Paneer', 1.00, 2), (rid, v_opt, 'Chicken', 2.00, 3);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Mix Noodles/Rice', 'House mix of noodles and rice with your choice of protein.', 21.95, 10) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2), (rid, v_opt, 'Beef', 0, 3), (rid, v_opt, 'Shrimp', 0, 4);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Hakka Fried Rice', 'Wok-fried rice, Hakka style.', 15.95, 11) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2), (rid, v_opt, 'Beef', 1.00, 3), (rid, v_opt, 'Shrimp', 2.00, 4);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Road Side Hakka Noodle', 'Street-style Hakka noodles.', 15.95, 12) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2), (rid, v_opt, 'Beef', 1.00, 3), (rid, v_opt, 'Shrimp', 2.00, 4);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Szechuan Rice', 'Spicy Szechuan fried rice.', 15.95, 13) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2), (rid, v_opt, 'Beef', 1.00, 3), (rid, v_opt, 'Shrimp', 2.00, 4);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Szechuan Noodle (Spicy)', 'Fiery Szechuan noodles.', 15.95, 14) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2), (rid, v_opt, 'Beef', 1.00, 3), (rid, v_opt, 'Shrimp', 2.00, 4);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Tandoori Chicken Fried Rice/Chowmein', 'Tandoori chicken over your choice of base.', 16.95, 15) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Base', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Fried Rice', 0, 1), (rid, v_opt, 'Chow Mein', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'House Special Veg Manchurian', 'Spicy fried rice or chow mein topped with Manchurian balls.', 19.95, 16) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Base', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Fried Rice', 0, 1), (rid, v_opt, 'Chow Mein', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Chef Special Dry Fish', 'Chef style crispy dry fish.', 17.95, 17);

  -- ==================================================== 7. Veg Curries =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Veg Curries', 7) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Angara Paneer', 'Spicy yet creamy chef-special curry, served on a sizzling plate.', 18.99, 1),
    (rid, v_cat, 'Bhindi Do Pyaza', 'Okra fried and sauteed with tomato and onion.', 15.99, 2),
    (rid, v_cat, 'Chana Masala', 'Chickpeas cooked with onion, garlic and tomato.', 15.99, 3),
    (rid, v_cat, 'Aloo Gobhi', 'Cauliflower and potato cooked with spices.', 16.99, 4),
    (rid, v_cat, 'Veg Jhalfrezi', 'Mixed vegetables sauteed with spices.', 16.99, 5),
    (rid, v_cat, 'Veg Kohlapuri', 'Mixed vegetables with spices and coconut. Spicy.', 17.99, 6),
    (rid, v_cat, 'Mushroom Takatak', 'Mushrooms sauteed in a rich tomato masala.', 16.99, 7),
    (rid, v_cat, 'Saag Aloo', 'Spinach and potato cooked with spices.', 17.99, 8),
    (rid, v_cat, 'Malai Kofta', 'Paneer-potato dumplings in a creamy sauce.', 17.99, 9),
    (rid, v_cat, 'Palak Paneer', 'Paneer and spinach in a rich creamy sauce.', 17.99, 10),
    (rid, v_cat, 'Daal Makhni', 'Black lentils slow-cooked in tomato and cream.', 17.99, 11),
    (rid, v_cat, 'Navaratna Veg Korma', 'Mixed vegetables in a mild creamy sauce.', 17.99, 12),
    (rid, v_cat, 'Mutter Paneer', 'Green peas and cottage cheese in creamy sauce.', 17.99, 13),
    (rid, v_cat, 'Khumb Mutter Paneer', 'Mushroom, peas and cottage cheese in creamy sauce.', 17.99, 14),
    (rid, v_cat, 'Methi Malai Mutter', 'Green peas and cream with a fenugreek note.', 17.99, 15),
    (rid, v_cat, 'Dal Tadka', 'Yellow lentils tempered with ginger and garlic.', 15.99, 16),
    (rid, v_cat, 'Paneer Makhani', 'Paneer in tomato and cream sauce.', 17.99, 17),
    (rid, v_cat, 'Paneer Tikka Masala', 'Paneer with peppers, tomato and cream sauce.', 17.99, 18),
    (rid, v_cat, 'Kadhai Paneer', 'Paneer with peppers, onion and garlic sauce.', 17.99, 19),
    (rid, v_cat, 'Paneer Butter Masala', 'Cottage cheese in rich butter sauce.', 17.99, 20),
    (rid, v_cat, 'Tawa Paneer Masala', 'Cottage cheese in cream sauce with peppers.', 17.99, 21),
    (rid, v_cat, 'Shahi Paneer', 'Cottage cheese in a royal creamy sauce.', 17.99, 22),
    (rid, v_cat, 'Achari Paneer', 'Cottage cheese with pickling spices. Spicy.', 17.99, 23),
    (rid, v_cat, 'Cheese Butter Masala', 'Cheese in rich butter sauce.', 17.99, 24),
    (rid, v_cat, 'Kaju Masala', 'Cashews in rich kadhai sauce with fenugreek.', 18.99, 25),
    (rid, v_cat, 'Kaju Khoya Curry', 'Cashews in creamy khoya sauce with tossed jeera.', 18.99, 26),
    (rid, v_cat, 'Kaju Makhaney Ki Sabji', 'Cashews and fox nuts in rich butter sauce.', 17.99, 27),
    (rid, v_cat, 'Kadai Soya Chaap', 'Soya chaap in rich kadhai sauce.', 15.99, 28),
    (rid, v_cat, 'Tawa Soya Chaap', 'Mashed soya chaap with onion and cashew.', 17.99, 29),
    (rid, v_cat, 'Chaap Makhan Wala', 'Soya chaap in cream and butter sauce.', 17.99, 30),
    (rid, v_cat, 'Anda Curry', 'Boiled eggs simmered in a spiced curry.', 17.99, 31),
    (rid, v_cat, 'Paneer Lababdar', 'Paneer in rich butter sauce with a hint of cardamom.', 17.99, 32);

  -- ============================================== 8. Chicken, Lamb & Beef ==
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Chicken, Lamb & Beef', 8) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Butter Chicken', 'The North Indian favourite — lightly spiced tomato and cream sauce.', 19.99, 1),
    (rid, v_cat, 'Chicken Tikka Masala', 'Chicken tikka with peppers in masala sauce.', 19.99, 2),
    (rid, v_cat, 'Chicken Korma', 'Chicken in a mild cream and cashew sauce.', 19.99, 3),
    (rid, v_cat, 'Chicken Lababdar', 'Chicken in cream, onion and tomato sauce.', 19.99, 4),
    (rid, v_cat, 'Chicken Curry', 'Chicken cubes in a traditional Indian curry.', 18.99, 5),
    (rid, v_cat, 'Chicken Vindaloo (Spicy)', 'Goan specialty in a hot chilli sauce.', 18.99, 6),
    (rid, v_cat, 'Chicken Madras', 'Chicken with coconut milk, mustard seeds and curry leaves.', 18.99, 7),
    (rid, v_cat, 'Saag Chicken', 'Chicken cooked with spinach.', 18.99, 8),
    (rid, v_cat, 'Chicken Jalfrezi', 'Chicken sauteed with fresh vegetables and spices.', 18.99, 9),
    (rid, v_cat, 'Chicken Bhuna', 'Well-spiced chicken curry with a thick sauce.', 18.99, 10),
    (rid, v_cat, 'Chicken Kadhai', 'Chicken with tomatoes and peppers, lightly spiced.', 18.99, 11),
    (rid, v_cat, 'Chicken Choosa', 'Bone-in tandoori chicken in tikka masala sauce.', 25.99, 12),
    (rid, v_cat, 'Methi Malai Chicken', 'Chicken in creamy sauce with a hint of fenugreek.', 18.99, 13),
    (rid, v_cat, 'Chef Special Chicken Angara', 'Spicy yet creamy chef-special curry on a sizzling plate.', 20.99, 14),
    (rid, v_cat, 'Dilliwala Butter Chicken', 'Delhi-style spicy butter chicken.', 20.99, 24);

  -- lamb/beef combos: one item, protein choice
  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Curry', 'Cooked in ginger, garlic, tomato and onion sauce.', 19.99, 15) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Kadhai', 'With black pepper, onion, green pepper and spices.', 19.99, 16) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Korma', 'Cooked with cashew and cream.', 19.99, 17) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Vindaloo (Spicy)', 'Cooked in a hot chilli sauce.', 19.99, 18) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Bhuna', 'Well-spiced curry with a thick sauce.', 19.99, 19) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Saag', 'Cooked with spinach.', 19.99, 20) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Rogan Josh', 'Cooked with yogurt, onion, ginger and garlic.', 19.99, 21) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Methi Malai', 'Creamy sauce with a hint of fenugreek.', 19.99, 22) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Lamb/Beef Angara', 'Spicy yet creamy chef-special curry on a sizzling plate.', 20.99, 23) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Lamb', 0, 1), (rid, v_opt, 'Beef', 0, 2);

  -- ================================================ 9. Seafood Curries =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Seafood Curries', 9) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Fish Malabari', 'Fish curry with ground coconut.', 19.99, 1),
    (rid, v_cat, 'Fish Tikka Masala', 'Fish cooked tikka masala style.', 19.99, 2),
    (rid, v_cat, 'Fish Kadhai', 'Fish in tomato sauce with peppers.', 19.99, 3),
    (rid, v_cat, 'Shrimp Korma', 'Shrimp in a mild cream and cashew sauce.', 20.99, 4),
    (rid, v_cat, 'Shrimp Vindaloo (Spicy)', 'Shrimp in a hot chilli sauce.', 20.99, 5),
    (rid, v_cat, 'Shrimp Kadhai', 'Shrimp in tomato sauce with peppers.', 20.99, 6),
    (rid, v_cat, 'Shrimp Makhani', 'Shrimp cooked butter-chicken style.', 20.99, 7),
    (rid, v_cat, 'Shrimp Makhan Masala', 'Shrimp cooked tikka masala style.', 20.99, 8),
    (rid, v_cat, 'Fish Angara', 'Spicy yet creamy chef-special curry on a sizzling plate.', 20.99, 9),
    (rid, v_cat, 'Shrimp Angara', 'Spicy yet creamy chef-special curry on a sizzling plate.', 20.99, 10);

  -- ========================================================= 10. Breads ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Breads', 10) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Plain Naan', null, 3.99, 1),
    (rid, v_cat, 'Butter Naan', null, 4.99, 2),
    (rid, v_cat, 'Garlic Naan', null, 4.49, 3),
    (rid, v_cat, 'Cheese Garlic Naan', null, 6.99, 4),
    (rid, v_cat, 'Angara Naan', 'Stuffed with minced chicken.', 7.99, 5),
    (rid, v_cat, 'Methi Mirchi Naan', 'With fenugreek and chilli.', 7.49, 6),
    (rid, v_cat, 'Amritshari Kulcha', 'Stuffed with lightly spiced onion.', 7.49, 7),
    (rid, v_cat, 'Peshawari Naan', 'With cherry, cashew and coconut.', 6.49, 8),
    (rid, v_cat, 'Tandoori Roti', null, 3.49, 9),
    (rid, v_cat, 'Lacha Paratha', 'Flaky layered bread.', 5.99, 10),
    (rid, v_cat, 'Pudina Paratha', 'With fresh mint.', 6.49, 11),
    (rid, v_cat, 'Methi Mirchi Paratha', 'With fenugreek and chilli.', 6.49, 12),
    (rid, v_cat, 'Aloo Paratha', 'Stuffed with spiced potatoes.', 7.49, 13),
    (rid, v_cat, 'Bullet Naan', 'With green chilli and garlic.', 6.49, 14);

  -- ================================================= 11. Rice & Biryani ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Rice & Biryani', 11) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Plain Basmati Rice', null, 4.49, 1),
    (rid, v_cat, 'Jeera Rice', 'Basmati rice tossed in cumin.', 7.99, 2),
    (rid, v_cat, 'Saffron Mutter Pulao', 'Tossed with saffron, cream and peas.', 8.99, 3),
    (rid, v_cat, 'Veg Navratna Pulao', 'Tossed with veggies, saffron and cream.', 11.99, 4),
    (rid, v_cat, 'Masala Khichdi', 'Comforting spiced rice and lentils.', 21.99, 5),
    (rid, v_cat, 'Hyderabadi Pulao', null, 11.99, 6);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Dum-a-dum Mast Biryani', 'Slow-cooked dum biryani with your choice of protein.', 17.99, 7) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Choice of', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order) values
    (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 1.00, 2), (rid, v_opt, 'Lamb', 2.00, 3),
    (rid, v_opt, 'Beef', 2.00, 4), (rid, v_opt, 'Shrimp', 3.00, 5);

  -- ========================================================== 12. Sides ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Sides', 12) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Cucumber Raita', null, 4.99, 1),
    (rid, v_cat, 'Mango Chutney', null, 3.99, 2),
    (rid, v_cat, 'Mint Chutney', null, 1.99, 3),
    (rid, v_cat, 'Papad (2 pcs)', null, 3.49, 4),
    (rid, v_cat, 'Chutney Trio', null, 5.99, 5),
    (rid, v_cat, 'Mixed Hot Pickle', null, 3.49, 6),
    (rid, v_cat, 'Onion Salad', null, 3.49, 7);

  -- ======================================================= 13. Desserts ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Desserts', 13) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Hot Gulab Jamun', 'Warm syrup-soaked dumplings.', 6.99, 1) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Serving', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Plain', 0, 1), (rid, v_opt, 'With ice cream', 2.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Gajar Halwa', 'Warm carrot pudding.', 8.99, 2),
    (rid, v_cat, 'Matka Kulfi', 'Traditional kulfi served in a clay pot.', 8.99, 3),
    (rid, v_cat, 'Rasmalai (3 pcs)', 'Soft cheese patties in saffron milk.', 7.99, 4),
    (rid, v_cat, 'Raja Shahi Kheer', 'Rice pudding.', 7.99, 5),
    (rid, v_cat, 'Chocolate Brownie', 'Hot brownie with a scoop of vanilla ice cream.', 11.99, 6);
end $$;
