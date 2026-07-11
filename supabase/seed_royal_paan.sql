-- ============================================================================
-- Seed: Royal Paan (Humber) demo menu
-- Replaces the restaurant profile and ALL menu/order/payment data for the
-- test restaurant with Royal Paan's street-food menu (13 categories).
-- Tables are kept, so existing QR codes keep working.
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
  delete from public.server_calls       where restaurant_id = rid;
  delete from public.payments           where restaurant_id = rid;
  delete from public.orders             where restaurant_id = rid; -- cascades order_items
  delete from public.item_option_values where restaurant_id = rid;
  delete from public.item_options       where restaurant_id = rid;
  delete from public.menu_items         where restaurant_id = rid;
  delete from public.menu_categories    where restaurant_id = rid;

  -- --------------------------------------------------------------- profile --
  update public.restaurants set
    name        = 'Royal Paan (Humber)',
    cuisine     = 'Indian',
    description = 'Paan, chaat and Indian street food favourites, made fresh to order.',
    currency    = 'CAD',
    tax_rate    = 13.00
  where id = rid;

  -- ========================================================== 1. Paan ======
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Paan', 1) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Sweet Paan', 'Betel leaf wrap with gulkand, fennel and sweet chutneys.', 3.50, 1),
    (rid, v_cat, 'Savoury Paan', 'Classic betel leaf wrap with traditional savoury fillings.', 3.50, 2),
    (rid, v_cat, 'Chocolate Paan', 'Sweet paan finished with a chocolate coating.', 4.00, 3),
    (rid, v_cat, 'Fruit Paan', 'Sweet paan loaded with fresh fruit.', 3.50, 4),
    (rid, v_cat, 'Calcutta Paan', 'Made in the Calcutta style with premium betel leaf.', 4.00, 5);

  -- ===================================================== 2. Chaat Bar ======
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Chaat Bar', 2) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Pani Puri', 'Crisp puris with spiced water, potato and chickpeas.', 7.99, 1)
  returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Extras', 'multiple', false, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Extra puris', 1.99, 1), (rid, v_opt, 'Extra pani', 0.99, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Sev Batata Puri', 'Puris topped with potato, sev and tangy chutneys.', 7.99, 2),
    (rid, v_cat, 'Dahi Puri', 'Puris filled with yogurt, chutneys and sev.', 7.99, 3),
    (rid, v_cat, 'Samosa Chaat', 'Crushed samosa with chana, yogurt and chutneys.', 8.99, 4),
    (rid, v_cat, 'Ragda Patties', 'Potato patties smothered in white pea curry.', 8.99, 5),
    (rid, v_cat, 'Dahi Kachori', 'Kachori topped with yogurt, chutneys and sev.', 7.99, 6);

  -- ================================================ 3. Street Food Bar =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Street Food Bar', 3) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Vada Pav (2 pcs)', 'Mumbai-style spiced potato fritters in soft buns.', 7.99, 1),
    (rid, v_cat, 'Dabeli (2 pcs)', 'Kutchi-style sweet-spicy potato filling in buns.', 7.99, 2),
    (rid, v_cat, 'Pav Bhaji', 'Buttery mashed vegetable curry with toasted pav.', 9.99, 3),
    (rid, v_cat, 'Chole Bhature', 'Spiced chickpeas with fluffy fried bhature.', 10.99, 4),
    (rid, v_cat, 'Kothu Paratha', 'Chopped paratha stir-fried with vegetables and spices.', 9.99, 5),
    (rid, v_cat, 'Delhi Aloo Tikki', 'Crispy potato patties with chutneys, Delhi style.', 8.99, 6);

  -- ================================================== 4. Sandwich Bar ======
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Sandwich Bar', 4) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Bombay Sandwich', 'Classic street sandwich with veggies, chutney and masala.', 7.99, 1),
    (rid, v_cat, 'Grilled Cheese Sandwich', 'Golden grilled sandwich loaded with cheese.', 6.99, 2),
    (rid, v_cat, 'Paneer Sandwich', 'Grilled sandwich with spiced paneer filling.', 8.99, 3),
    (rid, v_cat, 'Triple Layer Veggie Sandwich', 'Three layers stacked with vegetables and chutney.', 9.99, 4),
    (rid, v_cat, 'Fruit Jam & Cheese Sandwich', 'Sweet-savoury combo of jam and cheese.', 7.99, 5);

  -- ==================================================== 5. Burger Bar ======
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Burger Bar', 5) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Paneer Burger', 'Crispy paneer patty with desi sauces.', 9.99, 1),
    (rid, v_cat, 'Aloo Tikki Burger', 'Spiced potato patty with chutneys and veggies.', 9.99, 2),
    (rid, v_cat, 'Hakka Tikki Burger', 'Indo-Chinese style patty with a spicy kick.', 9.99, 3);

  -- ================================================= 6. Kathi Roll Bar =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Kathi Roll Bar', 6) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Paneer Kathi Roll', 'Paneer tikka rolled in a paratha with onions and chutney.', 9.99, 1),
    (rid, v_cat, 'Hakka Chow Mein Roll', 'Hakka noodles wrapped in a paratha.', 9.99, 2),
    (rid, v_cat, 'Aloo Tikki Roll', 'Potato tikki rolled with chutneys and salad.', 8.99, 3);

  -- =================================================== 7. Indo-Chinese =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Indo-Chinese', 7) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Manchurian', 'Veggie balls tossed in classic Manchurian sauce.', 10.99, 1)
  returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Style', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, 'Dry', 0, 1), (rid, v_opt, 'Gravy', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Paneer Chilli', 'Paneer tossed with peppers in chilli sauce.', 10.99, 2),
    (rid, v_cat, 'Hakka Noodle Combo', 'Hakka noodles served with Manchurian.', 12.99, 3);

  -- ======================================================= 8. Dosa Bar =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Dosa Bar', 8) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Masala Dosa', 'Crisp dosa with spiced potato filling.', 9.99, 1),
    (rid, v_cat, 'Mysore Masala Dosa', 'Dosa spread with spicy Mysore chutney and potato.', 10.99, 2),
    (rid, v_cat, 'Garlic Butter Dosa', 'Dosa toasted with garlic butter.', 10.99, 3),
    (rid, v_cat, 'Veggie Dosa', 'Dosa loaded with mixed vegetables.', 10.99, 4),
    (rid, v_cat, 'Rava Dosa', 'Lacy semolina dosa, extra crisp.', 10.99, 5);

  -- ======================================================== 9. Uttapam =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Uttapam', 9) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Onion Uttapam', 'Thick savoury pancake topped with onions.', 9.99, 1),
    (rid, v_cat, 'Tomato Uttapam', 'Topped with fresh tomato and herbs.', 9.99, 2),
    (rid, v_cat, 'Mixed Veggie Uttapam', 'Loaded with mixed vegetables.', 10.99, 3);

  -- ============================================= 10. Indian-Style Pizza ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Indian-Style Pizza', 10) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Paneer Pizza', 'Desi-style pizza topped with spiced paneer.', 12.99, 1),
    (rid, v_cat, 'Veggie Pizza', 'Loaded vegetable pizza with an Indian twist.', 12.99, 2);

  -- ======================================================= 11. Milk Bar ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Milk Bar', 11) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order)
  values (rid, v_cat, 'Royal Falooda', 'Signature falooda with vermicelli, basil seeds and ice cream.', 6.99, 1)
  returning id into v_itm;
  insert into public.item_options (restaurant_id, item_id, name, selection_type, is_required, sort_order)
  values (rid, v_itm, 'Size', 'single', true, 1) returning id into v_opt;
  insert into public.item_option_values (restaurant_id, option_id, name, price_delta, sort_order)
  values (rid, v_opt, '12 oz', 0, 1), (rid, v_opt, '16 oz', 2.00, 2);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Mango Lassi', 'Thick yogurt drink blended with mango.', 4.99, 2),
    (rid, v_cat, 'Paan Milkshake', 'Milkshake blended with sweet paan flavours.', 5.99, 3),
    (rid, v_cat, 'Mango Juice', null, 4.99, 4),
    (rid, v_cat, 'Guava Juice', null, 4.99, 5);

  -- ====================================================== 12. Desserts =====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Desserts', 12) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Gulab Jamun with Rabri', 'Warm gulab jamun served with creamy rabri.', 5.99, 1),
    (rid, v_cat, 'Kulfi', 'Traditional Indian ice cream.', 4.99, 2);

  -- ================================================= 13. Sides & Drinks ====
  insert into public.menu_categories (restaurant_id, name, sort_order)
  values (rid, 'Sides & Drinks', 13) returning id into v_cat;

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rid, v_cat, 'Masala Fries', 'Fries tossed in a spiced masala mix.', 5.99, 1),
    (rid, v_cat, 'Soft Drinks', null, 2.50, 2),
    (rid, v_cat, 'Masala Chai', 'Spiced milk tea, brewed fresh.', 2.99, 3);
end $$;
