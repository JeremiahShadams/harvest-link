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
