-- ============================================================================
-- Stock images for menu items (Unsplash, free license, hotlinked CDN).
-- Every photo ID below was downloaded and visually verified to show the dish
-- type it is mapped to. Rules run most-specific first and only fill items
-- whose image_url is NULL, so restaurant-uploaded photos are never touched.
-- Paan items are intentionally left without stock photos (no good match
-- exists) — the restaurant's own photos belong there.
-- ============================================================================

do $$
declare
  rid uuid := '6c93c4fc-517d-4949-86b2-b0f07ae1e018';

  -- verified images
  u_biryani  text := 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop&q=60';
  u_creamy   text := 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop&q=60';
  u_noodles  text := 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop&q=60';
  u_tandoori text := 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop&q=60';
  u_momo     text := 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop&q=60';
  u_samosa   text := 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop&q=60';
  u_thali    text := 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&h=300&fit=crop&q=60';
  u_vegcurry text := 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop&q=60';
  u_dosa     text := 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop&q=60';
  u_naan     text := 'https://images.unsplash.com/photo-1617692855027-33b14f061079?w=400&h=300&fit=crop&q=60';
  u_burger   text := 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=60';
  u_fries    text := 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop&q=60';
  u_paneer   text := 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop&q=60';
  u_pizza    text := 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop&q=60';
  u_sandwich text := 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop&q=60';
  u_wrap     text := 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop&q=60';
  u_rice     text := 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop&q=60';
  u_pavbhaji text := 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop&q=60';
  u_combo    text := 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=60';
  u_salad    text := 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&q=60';
  u_shake    text := 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop&q=60';
  u_icecream text := 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=300&fit=crop&q=60';
  u_chai     text := 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop&q=60';
  u_dal      text := 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop&q=60';
  u_fish     text := 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop&q=60';
  u_kebab    text := 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop&q=60';
  u_brownie  text := 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop&q=60';
  u_cola     text := 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop&q=60';
  u_coffee   text := 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop&q=60';
  u_cocktail text := 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop&q=60';
  u_mocktail text := 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400&h=300&fit=crop&q=60';
  u_lemonade text := 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop&q=60';
  u_water    text := 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop&q=60';
  u_juice    text := 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop&q=60';
  u_mithai   text := 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&q=60';

begin
  -- Whole categories first -------------------------------------------------
  update public.menu_items i set image_url = u_cocktail
    from public.menu_categories c
    where i.category_id = c.id and c.restaurant_id = rid
      and i.image_url is null and c.name = 'Sharabiya Layi';
  update public.menu_items i set image_url = u_mocktail
    from public.menu_categories c
    where i.category_id = c.id and c.restaurant_id = rid
      and i.image_url is null and c.name = 'Sufiya Layi';

  -- Specific dishes ---------------------------------------------------------
  update public.menu_items set image_url = u_dosa     where restaurant_id = rid and image_url is null and name ilike '%dosa%';
  update public.menu_items set image_url = u_momo     where restaurant_id = rid and image_url is null and name ilike '%momo%';
  update public.menu_items set image_url = u_pizza    where restaurant_id = rid and image_url is null and name ilike '%pizza%';
  update public.menu_items set image_url = u_pavbhaji where restaurant_id = rid and image_url is null and (name ilike '%pav bhaji%' or name ilike '%bhatura%');
  update public.menu_items set image_url = u_burger   where restaurant_id = rid and image_url is null and (name ilike '%burger%' or name ilike '%vada pav%' or name ilike '%dabeli%');
  update public.menu_items set image_url = u_sandwich where restaurant_id = rid and image_url is null and (name ilike '%sandwich%' or name ilike '%grilled cheese%' or name ilike '%bombay chutney%' or name ilike '%grill%');
  update public.menu_items set image_url = u_wrap     where restaurant_id = rid and image_url is null and (name ilike '%kathi roll%' or name ilike '%roll%' or name ilike '%wrap%');
  update public.menu_items set image_url = u_fries    where restaurant_id = rid and image_url is null and (name ilike '%fries%' or name ilike '%nugget%' or name ilike '%strips%');
  update public.menu_items set image_url = u_noodles  where restaurant_id = rid and image_url is null and (name ilike '%noodle%' or name ilike '%chowmien%' or name ilike '%chow mein%' or name ilike '%maggie%' or name ilike '%mac and cheese%');
  update public.menu_items set image_url = u_biryani  where restaurant_id = rid and image_url is null and name ilike '%biryani%';
  update public.menu_items set image_url = u_thali    where restaurant_id = rid and image_url is null and name ilike '%thali%';
  update public.menu_items set image_url = u_combo    where restaurant_id = rid and image_url is null and name ilike '%+ pop%';

  -- Grills, kebabs, curries -------------------------------------------------
  update public.menu_items set image_url = u_tandoori where restaurant_id = rid and image_url is null and (name ilike '%tandoori chicken%' or name ilike '%wings%' or name ilike '%choosa%' or name ilike '%platter%');
  update public.menu_items set image_url = u_creamy   where restaurant_id = rid and image_url is null and (name ilike '%tikka masala%' or name ilike '%butter chicken%' or name ilike '%korma%' or name ilike '%makhani%' or name ilike '%makhan%');
  update public.menu_items set image_url = u_fish     where restaurant_id = rid and image_url is null and (name ilike '%fish%' or name ilike '%macchi%' or name ilike '%jhinga%' or name ilike '%salmon%');
  update public.menu_items set image_url = u_kebab    where restaurant_id = rid and image_url is null and (name ilike '%kebab%' or name ilike '%kabab%' or name ilike '%tikka%' or name ilike '%seekh%');
  update public.menu_items set image_url = u_paneer   where restaurant_id = rid and image_url is null and name ilike '%paneer%';
  update public.menu_items set image_url = u_dal      where restaurant_id = rid and image_url is null and (name ilike '%dal%' or name ilike '%daal%' or name ilike '%kadhi%');
  update public.menu_items set image_url = u_creamy   where restaurant_id = rid and image_url is null and (name ilike '%chicken%' or name ilike '%goat%' or name ilike '%lamb%' or name ilike '%gosht%' or name ilike '%murgh%' or name ilike '%vindaloo%' or name ilike '%anda%');
  update public.menu_items set image_url = u_vegcurry where restaurant_id = rid and image_url is null and (name ilike '%masala%' and name not ilike '%masala soda%' and name not ilike '%masala chai%' and name not ilike '%masala fries%' and name not ilike '%masala jeera%');
  update public.menu_items set image_url = u_vegcurry where restaurant_id = rid and image_url is null and (name ilike '%saag%' or name ilike '%bharta%' or name ilike '%gobhi%' or name ilike '%kofta%' or name ilike '%mutter p%' or name ilike '%methi%' or name ilike '%mix veg%' or name ilike '%manchurian%' or name ilike '%chaap%' or name ilike '%kaju%' or name ilike '%takatak%' or name ilike '%jhalfrezi%' or name ilike '%kohlapuri%' or name ilike '%bhurji%' or name ilike '%choley%' or name ilike '%chana%' or name ilike '%chilli%');

  -- Chaat & fried snacks ----------------------------------------------------
  update public.menu_items set image_url = u_samosa where restaurant_id = rid and image_url is null and (
    name ilike '%samosa%' or name ilike '%pakora%' or name ilike '%chaat%' or name ilike '%puri%'
    or name ilike '%papad%' or name ilike '%papdi%' or name ilike '%bhalla%' or name ilike '%bhallay%'
    or name ilike '%kachori%' or name ilike '%ragda%' or name ilike '%tikki%' or name ilike '%bhel%'
    or name ilike '%kurkurey%' or name ilike '%hara bhara%' or name ilike '%spring roll%' or name ilike '%kulcha chana%');

  -- Breads & rice -----------------------------------------------------------
  update public.menu_items set image_url = u_naan where restaurant_id = rid and image_url is null and (name ilike '%naan%' or name ilike '%roti%' or name ilike '%paratha%' or name ilike '%parantha%' or name ilike '%kulcha%');
  update public.menu_items set image_url = u_rice where restaurant_id = rid and image_url is null and (name ilike '%rice%' or name ilike '%pulao%' or name ilike '%khichdi%' or name ilike '%chawal%');

  -- Sides, desserts, drinks ---------------------------------------------------
  update public.menu_items set image_url = u_salad    where restaurant_id = rid and image_url is null and (name ilike '%salad%' or name ilike '%raita%' or name ilike '%kuchumber%' or name ilike '%peanut%' or name ilike '%pickle%' or name ilike '%chutney%');
  update public.menu_items set image_url = u_icecream where restaurant_id = rid and image_url is null and (name ilike '%kulfi%' or name ilike '%ice cream%' or name ilike '%soft serve%');
  update public.menu_items set image_url = u_mithai   where restaurant_id = rid and image_url is null and (name ilike '%gulab%' or name ilike '%jalebi%' or name ilike '%halwa%' or name ilike '%rasmalai%' or name ilike '%kheer%' or name ilike '%rabri%' or name ilike '%rabdi%');
  update public.menu_items set image_url = u_brownie  where restaurant_id = rid and image_url is null and name ilike '%brownie%';
  update public.menu_items set image_url = u_shake    where restaurant_id = rid and image_url is null and (name ilike '%falooda%' or name ilike '%shake%');
  update public.menu_items set image_url = u_juice    where restaurant_id = rid and image_url is null and (name ilike '%lassi%' or name ilike '%juice%');
  update public.menu_items set image_url = u_chai     where restaurant_id = rid and image_url is null and (name ilike '%chai%' or name ilike '%tea%');
  update public.menu_items set image_url = u_coffee   where restaurant_id = rid and image_url is null and (name ilike '%coffee%' or name ilike '%nescafe%');
  update public.menu_items set image_url = u_lemonade where restaurant_id = rid and image_url is null and (name ilike '%lemonade%' or name ilike '%shikanjwi%' or name ilike '%soda%' or name ilike '%jeera%');
  update public.menu_items set image_url = u_cola     where restaurant_id = rid and image_url is null and (name ilike '%pop%' or name ilike '%limca%' or name ilike '%fanta%' or name ilike '%thums%' or name ilike '%energy%');
  update public.menu_items set image_url = u_water    where restaurant_id = rid and image_url is null and name ilike '%water%';
  update public.menu_items set image_url = u_icecream where restaurant_id = rid and image_url is null and name ilike '%nutella%';
end $$;
