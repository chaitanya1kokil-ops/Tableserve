-- ============================================================================
-- Seed: Royal Paan — REAL menu from the restaurant's own screenshots
-- (9 categories, 76 items, exact prices). Replaces all menu/order/payment
-- data for the restaurant; tables are kept so QR codes keep working.
-- Duplicate items across categories (e.g. Pav Bhaji in Signatures and
-- Street Food) mirror the restaurant's own menu structure.
-- ============================================================================

do $$
declare
  rid   uuid := '6c93c4fc-517d-4949-86b2-b0f07ae1e018';
  v_cat uuid;
begin
  -- wipe -----------------------------------------------------------------
  delete from public.server_calls       where restaurant_id = rid;
  delete from public.payments           where restaurant_id = rid;
  delete from public.orders             where restaurant_id = rid;
  delete from public.item_option_values where restaurant_id = rid;
  delete from public.item_options       where restaurant_id = rid;
  delete from public.menu_items         where restaurant_id = rid;
  delete from public.menu_categories    where restaurant_id = rid;

  -- 1. Signature Dishes ----------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Signature Dishes', 1) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Paneer Kathi Roll', 10.00, 1),
    (rid, v_cat, 'Noodle Burger', 10.00, 2),
    (rid, v_cat, 'Bombay Grill', 10.00, 3),
    (rid, v_cat, 'Vada Pav', 9.00, 4),
    (rid, v_cat, 'Pav Bhaji', 10.00, 5),
    (rid, v_cat, 'Royal Kulfi Falooda', 10.00, 6),
    (rid, v_cat, 'Royal Falooda', 8.00, 7),
    (rid, v_cat, 'Chaat Papdi', 9.00, 8),
    (rid, v_cat, 'Masala Soda', 5.00, 9),
    (rid, v_cat, 'Royal Lassi', 7.00, 10);

  -- 2. In Store Specials ----------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'In Store Specials', 2) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Schezwan Maharaja Grill', 10.00, 1),
    (rid, v_cat, 'Aloo Tikki Wrap', 10.00, 2),
    (rid, v_cat, 'Dahi Bhallay', 12.00, 3),
    (rid, v_cat, 'Gulab Jamun with Rabri', 9.00, 4);

  -- 3. Chaat Bar -------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Chaat Bar', 3) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Bhel Puri', 9.00, 1),
    (rid, v_cat, 'Pani Puri', 9.00, 2),
    (rid, v_cat, 'Ragda Patties', 9.00, 3),
    (rid, v_cat, 'Delhi Chaat Papdi', 9.00, 4),
    (rid, v_cat, 'Aloo Tikki Chaat', 9.00, 5),
    (rid, v_cat, 'Samosa Chaat', 9.00, 6),
    (rid, v_cat, 'Sev Batata Puri', 9.00, 7),
    (rid, v_cat, 'Dahi Kachori Puri', 9.00, 8),
    (rid, v_cat, 'Stuffed Kulcha Chana', 10.00, 9);

  -- 4. Street Food Bar --------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Street Food Bar', 4) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Pav Bhaji', 10.00, 1),
    (rid, v_cat, 'Bombay Burger', 8.00, 2),
    (rid, v_cat, 'Paneer Burger', 10.00, 3),
    (rid, v_cat, 'Bombay Vada Pav', 9.00, 4),
    (rid, v_cat, 'Masala Fries', 7.00, 5),
    (rid, v_cat, 'Noodle Burger', 10.00, 6),
    (rid, v_cat, 'Momo''s (5 pcs)', 10.00, 7);

  -- 5. Sandwich Bar ------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Sandwich Bar', 5) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Bombay Chutney', 8.00, 1),
    (rid, v_cat, 'Bombay Grill', 10.00, 2),
    (rid, v_cat, 'Paneer Kathi Roll', 10.00, 3),
    (rid, v_cat, 'Paneer Sandwich', 9.00, 4),
    (rid, v_cat, 'Grilled Cheese', 8.00, 5),
    (rid, v_cat, 'Jam Sandwich', 7.00, 6);

  -- 6. Beverage Bar --------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Beverage Bar', 6) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Fresh Lemonade', 5.00, 1),
    (rid, v_cat, 'Masala Soda (12 oz)', 5.00, 2),
    (rid, v_cat, 'Bottled Pop', 4.00, 3),
    (rid, v_cat, 'Limca', 4.00, 4),
    (rid, v_cat, 'Fanta', 4.00, 5),
    (rid, v_cat, 'Thums Up', 4.00, 6),
    (rid, v_cat, 'Canned Pop', 3.00, 7),
    (rid, v_cat, 'Energy Drinks', 5.00, 8),
    (rid, v_cat, 'Water Bottle', 3.00, 9);

  -- 7. Milk Bar ---------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Milk Bar', 7) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Royal Shakes', 7.00, 1),
    (rid, v_cat, 'Royal Falooda', 8.00, 2),
    (rid, v_cat, 'Royal Lassi (12 oz)', 7.00, 3),
    (rid, v_cat, 'Royal Kulfi Falooda', 10.00, 4),
    (rid, v_cat, 'Tilli Wali Kulfi', 4.00, 5),
    (rid, v_cat, 'Soft Serve Ice Cream', 5.00, 6),
    (rid, v_cat, 'Nescafe Coffee', 4.00, 7),
    (rid, v_cat, 'Masala Chai (10 Oz)', 4.00, 8),
    (rid, v_cat, 'Royal Kashmiri Chai', 5.00, 9);

  -- 8. Dosa Bar -----------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Dosa Bar', 8) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Sada Dosa', 10.00, 1),
    (rid, v_cat, 'Masala Dosa', 12.00, 2),
    (rid, v_cat, 'Mysore Special Dosa', 14.00, 3),
    (rid, v_cat, 'Mysore Masala Dosa', 15.00, 4),
    (rid, v_cat, 'Paneer Bhurji Dosa', 15.00, 5),
    (rid, v_cat, 'Amritsari Masala Dosa', 15.00, 6),
    (rid, v_cat, 'Pav Bhaji Dosa', 15.00, 7),
    (rid, v_cat, 'Szechuan Spring Dosa', 15.00, 8),
    (rid, v_cat, 'Butter Garlic Masala', 14.00, 9),
    (rid, v_cat, 'Onion Masala', 13.00, 10),
    (rid, v_cat, 'Spring Dosa', 14.00, 11);

  -- 9. The Paan Bar -----------------------------------------------------------------------
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'The Paan Bar', 9) returning id into v_cat;
  insert into public.menu_items (restaurant_id, category_id, name, price, sort_order) values
    (rid, v_cat, 'Calcutta Mitha Paan', 4.00, 1),
    (rid, v_cat, 'Bombay Sada Khushbu', 4.00, 2),
    (rid, v_cat, 'Zafrani Zadra Paan', 5.00, 3),
    (rid, v_cat, 'Navrattan Sada Paan', 5.00, 4),
    (rid, v_cat, 'Navrattan Zarda Paan', 5.00, 5),
    (rid, v_cat, 'Lahori Mix Patti Paan', 5.00, 6),
    (rid, v_cat, 'Chocolate Dry Fruit Paan', 5.00, 7),
    (rid, v_cat, 'Fruit Flavoured Paan', 5.00, 8),
    (rid, v_cat, 'Kashmiri Mitha Paan', 5.00, 9),
    (rid, v_cat, 'Milan Mitha Masala', 5.00, 10),
    (rid, v_cat, 'Gulabi Mogra Masala', 5.00, 11);
end $$;
