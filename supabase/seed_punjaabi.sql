-- ============================================================================
-- Seed: Punjaabi Indian Cuisine menu (second brand on the Royal Paan QR)
-- From the restaurant's own menu screenshots: 20 categories, ~195 items.
-- Tags the existing Royal Paan categories with their brand, then adds the
-- Punjaabi categories. Safe to re-run (removes previous Punjaabi data first).
-- ============================================================================

do $$
declare
  rid   uuid := '6c93c4fc-517d-4949-86b2-b0f07ae1e018';
  v_cat uuid;
  v_itm uuid;
  v_opt uuid;
begin
  -- Idempotency: clear any previous Punjaabi brand data (items first, since
  -- deleting a category sets its items' category_id to null rather than
  -- deleting them).
  delete from public.item_option_values where option_id in (
    select o.id from public.item_options o
    join public.menu_items i on i.id = o.item_id
    join public.menu_categories c on c.id = i.category_id
    where c.restaurant_id = rid and c.brand = 'Punjaabi Indian Cuisine');
  delete from public.item_options where item_id in (
    select i.id from public.menu_items i
    join public.menu_categories c on c.id = i.category_id
    where c.restaurant_id = rid and c.brand = 'Punjaabi Indian Cuisine');
  delete from public.menu_items where category_id in (
    select id from public.menu_categories
    where restaurant_id = rid and brand = 'Punjaabi Indian Cuisine');
  delete from public.menu_categories
    where restaurant_id = rid and brand = 'Punjaabi Indian Cuisine';

  -- Tag the existing menu as the Royal Paan brand.
  update public.menu_categories set brand = 'Royal Paan'
  where restaurant_id = rid and brand is null;

  -- 10. Signature Dishes ----------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Signature Dishes', 'Punjaabi Indian Cuisine', 10) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Paneer Kadhai', 17.00, 1),
    (rid, v_cat, 'Paneer Lababdar', 17.00, 2),
    (rid, v_cat, 'Garlic Naan', 5.00, 3),
    (rid, v_cat, 'Rara Chicken', 17.00, 4),
    (rid, v_cat, 'Chicken Tikka Masala', 17.00, 5),
    (rid, v_cat, 'Dal Dhabewali', 15.00, 6),
    (rid, v_cat, 'Tandoori Chicken - Half', 15.00, 7),
    (rid, v_cat, 'Tandoori Chicken - Full', 23.00, 8),
    (rid, v_cat, 'Special Murgh Tikka', 17.00, 9),
    (rid, v_cat, 'Goat Curry', 18.00, 11);
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order)
  values (rid, v_cat, 'Tandoori Momos (8 pcs)', 15.00, 10) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  -- 11. Combo Deals (11am-5pm) ----------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Combo Deals (11am-5pm)', 'Punjaabi Indian Cuisine', 11) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Butter Chicken + Garlic Naan + Pop', 15.00, 1),
    (rid, v_cat, 'Chicken Tikka Masala + Garlic Naan + Pop', 15.00, 2),
    (rid, v_cat, 'Kadhai Paneer + Garlic Naan + Pop', 15.00, 3),
    (rid, v_cat, 'Dal Dhabewali + Butter Roti + Pop', 15.00, 4),
    (rid, v_cat, 'Kadhi Pakoda + Rice + Pop', 15.00, 5),
    (rid, v_cat, 'Punjabi Goat Masala + Butter Naan + Pop', 15.00, 6),
    (rid, v_cat, 'Steam Rice with Manchurian + Pop', 15.00, 7),
    (rid, v_cat, 'Aloo Gobhi with Butter Roti + Pop', 15.00, 8),
    (rid, v_cat, 'Chicken Curry with Rice + Pop', 15.00, 9),
    (rid, v_cat, 'Choley with Rice + Pop', 15.00, 10);

  -- 12. Set Thali Meal (11am-5pm) ---------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Set Thali Meal (11am-5pm)', 'Punjaabi Indian Cuisine', 12) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Veg Thali', 18.00, 1),
    (rid, v_cat, 'Non Veg Thali', 20.00, 2),
    (rid, v_cat, 'Puri, Chole Bhatura', 15.00, 3),
    (rid, v_cat, 'Amritsari Chana Kulcha', 15.00, 4);

  -- 13. Rice Bowls -------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Rice Bowls', 'Punjaabi Indian Cuisine', 13) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Butter Chicken Rice Bowl', 15.00, 1),
    (rid, v_cat, 'Chicken Curry Rice Bowl', 14.00, 2),
    (rid, v_cat, 'Goat Curry Rice Bowl', 16.00, 3),
    (rid, v_cat, 'Kadhi Pakoda Rice', 14.00, 4),
    (rid, v_cat, 'Choley Chawal', 14.00, 5),
    (rid, v_cat, 'Veg Manchurian/Steam Rice', 14.00, 6);

  -- 14. Appetizers Veg -----------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Appetizers Veg', 'Punjaabi Indian Cuisine', 14) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Veg Pakora', 12.00, 1),
    (rid, v_cat, 'Punjaabi Paneer Tikka (6 pcs)', 18.00, 2),
    (rid, v_cat, 'Hara Bhara Kebab (8 pcs)', 12.00, 3),
    (rid, v_cat, 'Chilli Paneer', 16.00, 4),
    (rid, v_cat, 'Veg Noodle Spring Roll', 12.00, 5),
    (rid, v_cat, 'Paneer Kurkurey (8 pcs)', 12.00, 6),
    (rid, v_cat, 'Dahi Kebab (8 pcs)', 12.00, 7),
    (rid, v_cat, 'Soya Malai Chaap', 14.00, 8);

  -- 15. Appetizers Non Veg ----------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Appetizers Non Veg', 'Punjaabi Indian Cuisine', 15) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Amritsari Fish Pakora', 16.00, 1),
    (rid, v_cat, 'Peshawari Chicken Tikka', 18.00, 2),
    (rid, v_cat, 'Murgh Malai Tikka', 18.00, 3),
    (rid, v_cat, 'Special Murgh Tikka', 18.00, 4),
    (rid, v_cat, 'Chicken Pakora', 16.00, 5),
    (rid, v_cat, 'Reshmi Seekh Kabab', 18.00, 6),
    (rid, v_cat, 'Tandoori Chicken - Half', 15.00, 7),
    (rid, v_cat, 'Tandoori Chicken - Full', 23.00, 8),
    (rid, v_cat, 'Desi Tandoori Wings (8 pcs)', 12.00, 9),
    (rid, v_cat, 'Chilli Chicken Dry', 16.00, 10),
    (rid, v_cat, 'Chilli Fish Dry', 16.00, 11);

  -- 16. Momo's ------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Momo''s', 'Punjaabi Indian Cuisine', 16) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order)
  values (rid, v_cat, 'Steamed Momo''s (8 pcs)', 12.00, 1) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order)
  values (rid, v_cat, 'Tandoori Momos (8 pcs)', 15.00, 2) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order)
  values (rid, v_cat, 'Malai Momos (8 pcs)', 15.00, 3) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order)
  values (rid, v_cat, 'Jole Momos (8 pcs)', 15.00, 4) returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Filling', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Veg', 0, 1), (rid, v_opt, 'Chicken', 0, 2);

  -- 17. Tandoori Platter -------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Tandoori Platter', 'Punjaabi Indian Cuisine', 17) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Veg Platter', 25.00, 1),
    (rid, v_cat, 'Non Veg Platter', 28.00, 2);

  -- 18. Chaat & Savouries ---------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Chaat & Savouries', 'Punjaabi Indian Cuisine', 18) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Vegetable Samosa (3 pcs)', 5.00, 1),
    (rid, v_cat, 'Aloo Tikki Chaat', 9.00, 2),
    (rid, v_cat, 'Dahi Bhalla', 9.00, 3),
    (rid, v_cat, 'Bhel Puri', 9.00, 4),
    (rid, v_cat, 'Pani Puri', 9.00, 5),
    (rid, v_cat, 'Chaat Papdi', 9.00, 6),
    (rid, v_cat, 'Dahi Kachori Puri', 9.00, 7),
    (rid, v_cat, 'Masala Pav Bhaji', 11.00, 8);

  -- 19. Curries & Mains Veg -----------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Curries & Mains Veg', 'Punjaabi Indian Cuisine', 19) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Paneer Lababdar', 18.00, 1),
    (rid, v_cat, 'Paneer Tikka Masala', 18.00, 2),
    (rid, v_cat, 'Paneer Butter Masala', 18.00, 3),
    (rid, v_cat, 'Amritsari Paneer Kadhai', 18.00, 4),
    (rid, v_cat, 'Shahi Paneer', 18.00, 5),
    (rid, v_cat, 'Punjaabi Paneer Bhurji', 18.00, 6),
    (rid, v_cat, 'Palak Paneer', 18.00, 7),
    (rid, v_cat, 'Methi Malai Mutter', 17.00, 8),
    (rid, v_cat, 'Malai Kofta', 18.00, 9),
    (rid, v_cat, 'Lehsuni Saag', 16.00, 10),
    (rid, v_cat, 'Baingan Bharta', 16.00, 11),
    (rid, v_cat, 'Aloo Gobhi', 16.00, 12),
    (rid, v_cat, 'Soya Chaap Kadhai', 16.00, 13),
    (rid, v_cat, 'Mix Veg', 16.00, 14),
    (rid, v_cat, 'Bhindi Masala', 16.00, 15),
    (rid, v_cat, 'Dal Amritsari', 15.00, 16),
    (rid, v_cat, 'Dal Makhani', 15.00, 17),
    (rid, v_cat, 'Dal Dhabewali', 16.00, 18),
    (rid, v_cat, 'Daal Patiala', 15.00, 19),
    (rid, v_cat, 'Chana Masala', 15.00, 20),
    (rid, v_cat, 'Mattar Paneer', 18.00, 21),
    (rid, v_cat, 'Kadhi Pakoda', 15.00, 22);

  -- 20. Curries & Mains Non Veg --------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Curries & Mains Non Veg', 'Punjaabi Indian Cuisine', 20) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Butter Chicken', 18.00, 1),
    (rid, v_cat, 'Chicken Tariwala', 16.00, 2),
    (rid, v_cat, 'Chicken Tikka Masala', 18.00, 3),
    (rid, v_cat, 'Kadhai Chicken', 18.00, 4),
    (rid, v_cat, 'Rara Chicken', 18.00, 5),
    (rid, v_cat, 'Saag Chicken', 18.00, 6),
    (rid, v_cat, 'Chicken Lababdar', 18.00, 7),
    (rid, v_cat, 'Goat Curry', 18.00, 8),
    (rid, v_cat, 'Lamb Kadhai', 20.00, 9),
    (rid, v_cat, 'Rara Gosht', 20.00, 10),
    (rid, v_cat, 'Chicken Vindaloo', 16.00, 11);

  -- 21. Chinese -----------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Chinese', 'Punjaabi Indian Cuisine', 21) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Fried Rice Chicken', 16.00, 1),
    (rid, v_cat, 'Veg Fried Rice', 16.00, 2),
    (rid, v_cat, 'Veg Manchurian', 16.00, 3),
    (rid, v_cat, 'Chicken Manchurian', 16.00, 4),
    (rid, v_cat, 'Chilli Chicken', 16.00, 5),
    (rid, v_cat, 'Chilli Paneer', 16.00, 6),
    (rid, v_cat, 'Hakka Chowmien Chicken', 16.00, 7),
    (rid, v_cat, 'Hakka Chowmien Veg', 16.00, 8),
    (rid, v_cat, 'Fish Chilli', 16.00, 9);

  -- 22. Breads -------------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Breads', 'Punjaabi Indian Cuisine', 22) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Tandoori Naan', 4.00, 1),
    (rid, v_cat, 'Butter Naan', 4.50, 2),
    (rid, v_cat, 'Garlic Naan', 5.00, 3),
    (rid, v_cat, 'Chilli Naan', 5.00, 4),
    (rid, v_cat, 'Tawa Roti', 2.00, 5),
    (rid, v_cat, 'Tandoori Roti', 3.00, 6),
    (rid, v_cat, 'Butter Roti', 4.00, 7),
    (rid, v_cat, 'Onion Kulcha', 6.00, 8),
    (rid, v_cat, 'Lacha Parantha', 6.00, 9),
    (rid, v_cat, 'Amritsari Kulcha', 8.00, 10),
    (rid, v_cat, 'Paneer Kulcha', 8.00, 11);

  -- 23. Biryani & Rice --------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Biryani & Rice', 'Punjaabi Indian Cuisine', 23) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Veg Biryani', 15.00, 1),
    (rid, v_cat, 'Chicken Biryani', 17.00, 2),
    (rid, v_cat, 'Lamb Biryani', 18.00, 3),
    (rid, v_cat, 'Steam Rice', 6.00, 4),
    (rid, v_cat, 'Mutter Pulao', 8.00, 5),
    (rid, v_cat, 'Jeera Rice', 8.00, 6),
    (rid, v_cat, 'Tawa Pulao', 12.00, 7),
    (rid, v_cat, 'Biryani Rice', 12.00, 8),
    (rid, v_cat, 'Desi Ghee Rice', 10.00, 9);

  -- 24. Kids Menu ---------------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Kids Menu', 'Punjaabi Indian Cuisine', 24) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Chota Fries', 6.00, 1),
    (rid, v_cat, 'Grilled Cheese', 6.00, 2),
    (rid, v_cat, 'Chicken Nuggets', 6.00, 3),
    (rid, v_cat, 'Chota Maggie', 6.00, 4),
    (rid, v_cat, 'Jam Sandwich', 6.00, 5),
    (rid, v_cat, 'Golden Chicken Strips', 6.00, 6),
    (rid, v_cat, 'Nutella Shakes', 6.00, 7),
    (rid, v_cat, 'Brownie with Ice Cream', 6.00, 8),
    (rid, v_cat, 'Mac and Cheese', 6.00, 9),
    (rid, v_cat, 'Chota Burger', 6.00, 10);

  -- 25. Raita/Salad --------------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Raita/Salad', 'Punjaabi Indian Cuisine', 25) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Boondi Raita', 5.00, 1),
    (rid, v_cat, 'Mix Veg Raita', 5.00, 2),
    (rid, v_cat, 'Plain Raita', 5.00, 3),
    (rid, v_cat, 'Cucumber Raita', 5.00, 4),
    (rid, v_cat, 'Onion Salad', 5.00, 5),
    (rid, v_cat, 'Green Salad', 5.00, 6);

  -- 26. Desserts ------------------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Desserts', 'Punjaabi Indian Cuisine', 26) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Ice Cream', 6.00, 1),
    (rid, v_cat, 'Gajar Ka Halwa', 7.00, 2),
    (rid, v_cat, 'Gulab Jamun with Rabri', 9.00, 3),
    (rid, v_cat, 'Kulfi Falooda', 10.00, 4),
    (rid, v_cat, 'Rasmalai', 7.00, 5),
    (rid, v_cat, 'Moong Dal Halwa', 7.00, 6),
    (rid, v_cat, 'Maharaja Gulab Jamun', 10.00, 7),
    (rid, v_cat, 'Royal Rabri (10 oz)', 8.00, 8),
    (rid, v_cat, 'Jalebi with Rabri', 10.00, 9),
    (rid, v_cat, 'Chocolate Brownie with Ice Cream', 10.00, 10),
    (rid, v_cat, 'Tilli Wali Kulfi', 4.00, 11),
    (rid, v_cat, 'Matka Kulfi', 5.00, 12),
    (rid, v_cat, 'Soft Serve Ice Cream', 5.00, 13);

  -- 27. Drinks ---------------------------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Drinks', 'Punjaabi Indian Cuisine', 27) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Fresh Lemonade', 5.00, 1),
    (rid, v_cat, 'Masala Soda (12 oz)', 5.00, 2),
    (rid, v_cat, 'Masala Jeera', 5.00, 3),
    (rid, v_cat, 'Fruit Juices', 4.00, 4),
    (rid, v_cat, 'Limca', 4.00, 5),
    (rid, v_cat, 'Fanta', 4.00, 6),
    (rid, v_cat, 'Thums Up', 4.00, 7),
    (rid, v_cat, 'Canned Pop', 3.00, 8),
    (rid, v_cat, 'Energy Drinks', 5.00, 9),
    (rid, v_cat, 'Water Bottle', 3.00, 10),
    (rid, v_cat, 'Royal Shakes', 7.00, 11),
    (rid, v_cat, 'Royal Falooda', 8.00, 12),
    (rid, v_cat, 'Royal Lassi (12 oz)', 7.00, 13),
    (rid, v_cat, 'Royal Kulfi Falooda', 10.00, 14),
    (rid, v_cat, 'Nescafe Coffee', 4.00, 15),
    (rid, v_cat, 'Masala Chai (10 Oz)', 4.00, 16),
    (rid, v_cat, 'Royal Kashmiri Chai', 5.00, 17);

  -- 28. Sharabiya Layi (cocktails) ----------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Sharabiya Layi', 'Punjaabi Indian Cuisine', 28) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Classic Caesar', 14.00, 1),
    (rid, v_cat, 'Fuzzy Malibu', 14.00, 2),
    (rid, v_cat, 'Amli Siyappa', 14.00, 3),
    (rid, v_cat, 'Muscow Mule', 14.00, 4),
    (rid, v_cat, 'Rose-Tini', 14.00, 5),
    (rid, v_cat, 'Classic Martini', 14.00, 6),
    (rid, v_cat, 'Sex On The Beach', 14.00, 7),
    (rid, v_cat, 'Cosmopolitan', 14.00, 8),
    (rid, v_cat, 'True Gentleman', 14.00, 9),
    (rid, v_cat, 'Late Night Mimosa', 14.00, 10),
    (rid, v_cat, 'B52', 14.00, 11),
    (rid, v_cat, 'Hidden Khazana', 14.00, 12),
    (rid, v_cat, 'Adrakh Ke Panjay', 14.00, 13),
    (rid, v_cat, 'Purple Bliss', 14.00, 14),
    (rid, v_cat, 'Pina Colada', 14.00, 15);

  -- 29. Sufiya Layi (mocktails) -----------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, brand, sort_order)
  values (rid, 'Sufiya Layi', 'Punjaabi Indian Cuisine', 29) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Vermillion', 7.00, 1),
    (rid, v_cat, 'Kanta Laga', 7.00, 2),
    (rid, v_cat, 'Paan Rasiya', 7.00, 3),
    (rid, v_cat, 'Thandai Cream', 7.00, 4),
    (rid, v_cat, 'Hera''s Crown', 7.00, 5),
    (rid, v_cat, 'Cinderella''s Gingerella', 7.00, 6),
    (rid, v_cat, 'Kamali Da Jeera', 7.00, 7),
    (rid, v_cat, 'Hadwana Shikanjwi', 7.00, 8);
end $$;
