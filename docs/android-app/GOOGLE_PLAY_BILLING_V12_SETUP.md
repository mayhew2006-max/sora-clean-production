# Grace Field V12 — Google Play subscription backend

This is a **staged code change**, not a production deployment. The Android V12 AAB
is already in Play Console's internal testing track, and website Stripe checkout
continues to operate on the production site's main branch.

## What the code does

- The existing Android WebView bridge calls native Google Play Billing.
- `/pay` uses Play Billing for the installed V12 Android app. Web browsers keep Stripe.
- `/api/google-play/verify` verifies receipts using the Google Play Android Publisher API.
  Google-signed account identity must match the signed-in Supabase Grace user UUID hash.
- Purchase acknowledgement happens before Premium is granted.
- Supabase keeps `play_paid`, `stripe_paid`, `manual_paid`, and the existing `paid`
  flag in sync, without accidentally revoking access paid for on another channel.
- Billing is refreshed on paid actions and when the account page opens.

## Before deployment — required manual account configuration

1. **Supabase**: Review and execute
   `supabase/migrations/20261115_google_play_billing.sql` in the SQL Editor.
   Verify the new fields and the `grace_play_subscriptions` table exist.
   Never run on an unexpected Supabase project.
2. **Google Cloud**: Android Publisher API must be enabled and the
   `grace-play-billing` service account must have Play Console app access
   for Grace Field with *View financial data* and *Manage orders/subscriptions*.
3. **Vercel**: In the actual `grace-assistant` website project, add a server-only
   environment variable named `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` whose value is
   the *entire* service-account JSON, stored privately (not NEXT_PUBLIC).
   Generate the JSON in Google Cloud and **never post it in chat, GitHub, or a screenshot**.
4. After steps 1–3 are complete, review and deploy this branch first to a safe
   preview and then to production. Do not merge it until build checks pass.
5. Play Console: activate the `grace_premium_monthly` / `monthly` base plan,
   confirm the desired $14.99 US price, set up license testers and install the
   V12 build via its internal testing opt-in link.
6. Verify a test purchase, receipt acknowledgement, account unlock, restore
   purchases, canceled/expired subscription behavior, plus website Stripe checkout
   and founder access. **Do not promote V12 to Production before these tests pass.**

## Operation

The integration queries Google periodically while customers use Grace. Before
a broader production launch, configure **Real-time developer notifications**
and an authenticated subscriber update webhook/worker so renewals, refunds,
revocations, and holds are processed proactively, even while the app is closed.

## Security

The Google service-account JSON stays only in Vercel's server-side environment.
The Android AAB contains no private key. Do not post Google credentials, signing
keys, Supabase service role keys, or private tokens in any conversation.
