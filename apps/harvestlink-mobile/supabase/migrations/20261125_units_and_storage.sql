-- HarvestLink Mobile Migration: Units + Listing Photos Storage + Counterparty Order Contact
-- Apply this migration in Supabase SQL Editor before deploying clients that select/write `unit`
-- or upload photos to the `listing-photos` bucket.

-- 1. Add `unit` column to `public.listings` and `public.orders`
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'kg';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'kg';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_unit_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_unit_check
      CHECK (unit IN ('kg', 'Kilograms (kg)', 'Baskets (Big)', 'Baskets (Small)', 'Sacks', 'Crates'));
  END IF;
END $$;

-- 2. Backfill existing rows safely (idempotent)
UPDATE public.listings
SET unit = 'kg'
WHERE unit IS NULL OR btrim(unit) = '';

UPDATE public.orders o
SET unit = COALESCE(NULLIF(btrim(l.unit), ''), 'kg')
FROM public.listings l
WHERE o.listing_id = l.id
  AND (o.unit IS NULL OR btrim(o.unit) = '' OR o.unit = 'kg')
  AND l.unit <> 'kg';

-- 3. Update `place_order` RPC to snapshot `unit` from the listing into `orders.unit`
--    while keeping exact error codes expected by friendlyOrderError().
CREATE OR REPLACE FUNCTION public.place_order(
  p_listing_id uuid,
  p_quantity_kg numeric,
  p_delivery_window text,
  p_delivery_area text,
  p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_listing public.listings%ROWTYPE;
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR v_profile.role NOT IN ('buyer', 'both') THEN
    RAISE EXCEPTION 'buyer_profile_required';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'listing_unavailable';
  END IF;

  IF v_listing.is_demo THEN
    RAISE EXCEPTION 'sample_listing_not_orderable';
  END IF;

  IF v_listing.farmer_id = v_user_id THEN
    RAISE EXCEPTION 'cannot_order_own';
  END IF;

  IF p_quantity_kg IS NULL OR p_quantity_kg <= 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  IF v_listing.available_kg < p_quantity_kg THEN
    RAISE EXCEPTION 'insufficient_stock';
  END IF;

  UPDATE public.listings
  SET available_kg = available_kg - p_quantity_kg,
      status = CASE WHEN available_kg - p_quantity_kg <= 0 THEN 'sold' ELSE status END
  WHERE id = v_listing.id;

  INSERT INTO public.orders (
    listing_id,
    buyer_id,
    farmer_id,
    quantity_kg,
    unit_price_per_kg,
    unit,
    status,
    delivery_window,
    delivery_area,
    notes
  )
  VALUES (
    v_listing.id,
    v_user_id,
    v_listing.farmer_id,
    p_quantity_kg,
    v_listing.price_per_kg,
    v_listing.unit,
    'pending',
    COALESCE(NULLIF(btrim(p_delivery_window), ''), 'Today · 12–3 pm'),
    COALESCE(NULLIF(btrim(p_delivery_area), ''), v_profile.default_area, 'Lekki'),
    NULLIF(btrim(p_notes), '')
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

-- 4. Create `listing-photos` Supabase Storage bucket + RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read listing photos'
  ) THEN
    CREATE POLICY "Public read listing photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'listing-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload own listing photos'
  ) THEN
    CREATE POLICY "Authenticated upload own listing photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'listing-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete own listing photos'
  ) THEN
    CREATE POLICY "Authenticated delete own listing photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'listing-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- 5. Safe counterparty lookup for active/historical orders (call/WhatsApp handoff)
CREATE OR REPLACE FUNCTION public.get_order_contacts(p_order_ids uuid[])
RETURNS TABLE (
  order_id uuid,
  buyer_name text,
  buyer_phone text,
  farmer_name text,
  farmer_phone text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    b.display_name AS buyer_name,
    b.phone AS buyer_phone,
    f.display_name AS farmer_name,
    f.phone AS farmer_phone
  FROM public.orders o
  LEFT JOIN public.profiles b ON b.id = o.buyer_id
  LEFT JOIN public.profiles f ON f.id = o.farmer_id
  WHERE o.id = ANY(p_order_ids)
    AND (o.buyer_id = auth.uid() OR o.farmer_id = auth.uid());
$$;

-- 6. Advance order status (farmer only: pending → accepted → ready → out_for_delivery → delivered)
CREATE OR REPLACE FUNCTION public.advance_order_status(
  p_order_id uuid,
  p_next_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_statuses text[] := ARRAY['pending','accepted','ready','out_for_delivery','delivered'];
  v_cur_idx int;
  v_next_idx int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.farmer_id <> v_user_id THEN
    RAISE EXCEPTION 'not_order_farmer';
  END IF;

  SELECT i INTO v_cur_idx FROM generate_subscripts(v_statuses, 1) g(i) WHERE v_statuses[i] = v_order.status;
  SELECT i INTO v_next_idx FROM generate_subscripts(v_statuses, 1) g(i) WHERE v_statuses[i] = p_next_status;

  IF v_next_idx IS NULL OR v_next_idx <> v_cur_idx + 1 THEN
    RAISE EXCEPTION 'invalid_status_transition';
  END IF;

  UPDATE public.orders SET status = p_next_status WHERE id = p_order_id;

  -- Notify counterparty
  INSERT INTO public.harvest_notifications (user_id, kind, title, message, order_id)
  VALUES (
    CASE WHEN v_order.buyer_id = v_user_id THEN v_order.farmer_id ELSE v_order.buyer_id END,
    'order_status',
    'Order status updated',
    format('Your order is now %s.', p_next_status),
    p_order_id
  );
END;
$$;

-- 7. Create activity_report_tokens table if missing (for signed report links)
CREATE TABLE IF NOT EXISTS public.activity_report_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.activity_report_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_report_tokens_user_id_key'
  ) THEN
    ALTER TABLE public.activity_report_tokens
      ADD CONSTRAINT activity_report_tokens_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 8. Create activity report token (farmer / both)
CREATE OR REPLACE FUNCTION public.create_activity_report()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_token text := gen_random_uuid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR v_profile.role NOT IN ('farmer', 'both') THEN
    RAISE EXCEPTION 'farmer_profile_required';
  END IF;

  INSERT INTO public.activity_report_tokens (user_id, token, created_at, expires_at)
  VALUES (v_user_id, v_token, now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET token = v_token,
        created_at = now(),
        expires_at = now() + interval '30 days';

  RETURN v_token;
END;
$$;

-- 9. Public read-only report lookup (used by /report/[token])
CREATE OR REPLACE FUNCTION public.get_public_activity_report(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.activity_report_tokens%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_since timestamptz := now() - interval '90 days';
  v_listings_created int := 0;
  v_active_listings int := 0;
  v_orders_received int := 0;
  v_orders_delivered int := 0;
  v_sales_value_ngn numeric := 0;
  v_scans_completed int := 0;
BEGIN
  SELECT * INTO v_row
  FROM public.activity_report_tokens
  WHERE token = p_token AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_row.user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'active' AND available_kg > 0)
  INTO v_listings_created, v_active_listings
  FROM public.listings
  WHERE farmer_id = v_row.user_id AND created_at >= v_since;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'delivered'),
         coalesce(sum(quantity_kg * unit_price_per_kg) FILTER (WHERE status = 'delivered'), 0)
  INTO v_orders_received, v_orders_delivered, v_sales_value_ngn
  FROM public.orders
  WHERE farmer_id = v_row.user_id AND created_at >= v_since;

  SELECT count(*) INTO v_scans_completed
  FROM public.produce_scans
  WHERE user_id = v_row.user_id AND created_at >= v_since;

  RETURN jsonb_build_object(
    'farmer_name', v_profile.display_name,
    'farm_name', coalesce(v_profile.farm_name, 'Independent farm'),
    'generated_at', v_row.created_at,
    'expires_at', v_row.expires_at,
    'period_days', 90,
    'listings_created', v_listings_created,
    'active_listings', v_active_listings,
    'orders_received', v_orders_received,
    'orders_delivered', v_orders_delivered,
    'sales_value_ngn', v_sales_value_ngn,
    'scans_completed', v_scans_completed
  );
END;
$$;

-- 10. Rate a delivered order (buyer only)
CREATE OR REPLACE FUNCTION public.rate_delivered_order(
  p_order_id uuid,
  p_rating int,
  p_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.buyer_id <> v_user_id THEN
    RAISE EXCEPTION 'not_order_buyer';
  END IF;

  IF v_order.status <> 'delivered' THEN
    RAISE EXCEPTION 'order_not_rateable';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  UPDATE public.orders
  SET rating = p_rating, rating_note = NULLIF(btrim(p_note), '')
  WHERE id = p_order_id;
END;
$$;

-- 11. RLS for activity_report_tokens
ALTER TABLE public.activity_report_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_report_tokens' AND policyname = 'Users read own report tokens'
  ) THEN
    CREATE POLICY "Users read own report tokens"
      ON public.activity_report_tokens FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verification check to run in Supabase SQL Editor after applying migration:
-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND proname IN ('place_order','advance_order_status','rate_delivered_order','get_order_contacts','create_activity_report','get_public_activity_report');
