import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function GET(req: Request) {
  try {
    const auth =
      req.headers.get("authorization") || "";

    const expected =
      process.env.CRON_SECRET || "";

    if (
      !expected ||
      auth !== `Bearer ${expected}`
    ) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      return Response.json(
        { error: "NEXT_PUBLIC_SITE_URL missing." },
        { status: 500 }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { error: "Supabase server configuration missing." },
        { status: 500 }
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const easternDate =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

    const researchRes = await fetch(
      `${siteUrl}/api/sports-research`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "Give me today's full sports report. Scan every sport and every market you can verify. Show PLAY, LEAN, WATCH, or PASS. Do not force a pick. Prioritize events that have not started.",
        }),
        cache: "no-store",
      }
    );

    if (!researchRes.ok) {
      const text = await researchRes.text();

      return Response.json(
        {
          error:
            "Sports research failed: " + text,
        },
        { status: 500 }
      );
    }

    const researchData =
      await researchRes.json();

    const report =
      String(researchData?.reply || "").trim();

    if (!report) {
      return Response.json(
        { error: "Sports report came back empty." },
        { status: 500 }
      );
    }

    const {
      data: subscriptions,
      error: subError,
    } = await admin
      .from("grace_push_subscriptions")
      .select(
        "user_id, endpoint, p256dh, auth"
      );

    if (subError) {
      console.error(
        "Push subscriptions load failed:",
        subError
      );
    }

    const users = [
      ...new Set(
        (subscriptions || []).map(
          (row: any) => row.user_id
        )
      ),
    ];

    for (const userId of users) {
      await admin
        .from("grace_sports_reports")
        .upsert(
          {
            user_id: userId,
            report_date: easternDate,
            report_text: report,
          },
          {
            onConflict: "user_id,report_date",
          }
        );
    }

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (publicKey && privateKey) {
      webpush.setVapidDetails(
        "mailto:grace@grace-assistant.app",
        publicKey,
        privateKey
      );

      const firstLine =
        report
          .split("\n")
          .find((line) =>
            line.trim().length > 5
          )
          ?.trim()
          .slice(0, 180) ||
        "Grace finished today's sports scan.";

      for (const sub of subscriptions || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            } as any,
            JSON.stringify({
              title:
                "Grace Sports Report",
              body: firstLine,
              url: "/chat",
            })
          );
        } catch (error: any) {
          const status =
            error?.statusCode;

          if (
            status === 404 ||
            status === 410
          ) {
            await admin
              .from(
                "grace_push_subscriptions"
              )
              .delete()
              .eq(
                "endpoint",
                sub.endpoint
              );
          } else {
            console.error(
              "Push send failed:",
              error
            );
          }
        }
      }
    }

    return Response.json({
      ok: true,
      reportDate: easternDate,
      reportSavedForUsers: users.length,
      pushSubscriptions:
        subscriptions?.length || 0,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message ||
          "Daily sports scan failed.",
      },
      { status: 500 }
    );
  }
}
