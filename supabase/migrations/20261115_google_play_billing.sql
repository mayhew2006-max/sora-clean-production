-- Grace Field V12 Google Play Billing. REVIEW before running in Supabase SQL Editor.
-- This migration must run before the V12 website code is deployed.
ALTER TABLE public.grace_user_usage
  ADD COLUMN IF NOT EXISTS stripe_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS play_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_paid boolean NOT NULL DEFAULT false;

-- Preserve existing paid entitlements. Any paid record without Stripe identifiers
-- is retained as manual access rather than revoked by the new billing providers.
UPDATE public.grace_user_usage
SET stripe_paid = COALESCE(paid, false)
WHERE stripe_subscription_id IS NOT NULL OR stripe_customer_id IS NOT NULL;
UPDATE public.grace_user_usage
SET manual_paid = COALESCE(paid, false)
WHERE stripe_subscription_id IS NULL AND stripe_customer_id IS NULL;

CREATE TABLE IF NOT EXISTS public.grace_play_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_token text NOT NULL UNIQUE,
  product_id text NOT NULL,
  subscription_state text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grace_play_subscriptions ENABLE ROW LEVEL SECURITY;
-- No RLS policies: access restricted to server-side service_role.

CREATE OR REPLACE FUNCTION public.grace_sync_play_entitlement(
  p_user_id uuid,
  p_purchase_token text,
  p_product_id text,
  p_state text,
  p_expires_at timestamptz,
  p_active boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.grace_play_subscriptions
    (user_id, purchase_token, product_id, subscription_state, expires_at, last_checked_at)
  VALUES
    (p_user_id, p_purchase_token, p_product_id, p_state, p_expires_at, now())
  ON CONFLICT (user_id) DO UPDATE SET
    purchase_token = EXCLUDED.purchase_token,
    product_id = EXCLUDED.product_id,
    subscription_state = EXCLUDED.subscription_state,
    expires_at = EXCLUDED.expires_at,
    last_checked_at = now();
  INSERT INTO public.grace_user_usage
    (user_id, email, free_messages_used, play_paid, paid)
  VALUES (p_user_id, '', 0, p_active, p_active)
  ON CONFLICT (user_id) DO UPDATE SET
    play_paid = p_active,
    paid = public.grace_user_usage.stripe_paid OR public.grace_user_usage.manual_paid OR p_active,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.grace_sync_play_entitlement(uuid,text,text,text,timestamptz,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grace_sync_play_entitlement(uuid,text,text,text,timestamptz,boolean)
  TO service_role;
