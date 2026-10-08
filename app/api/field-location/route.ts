import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return NextResponse.json(
        { error: "Invalid GPS coordinates" },
        { status: 400 }
      );
    }

    const url = new URL(
      "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
    );

    url.searchParams.set("x", String(lng));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("vintage", "Current_Current");
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Census location lookup failed");
    }

    const data = await response.json();
    const geo = data?.result?.geographies || {};

    const county = geo.Counties?.[0];
    const state = geo.States?.[0];

    return NextResponse.json({
      lat,
      lng,
      county: county?.NAME || null,
      state: state?.NAME || null,
      verified: Boolean(county && state),
      source: "US Census Geocoder",
    });
  } catch {
    return NextResponse.json({
      verified: false,
      error: "Location could not be verified",
    });
  }
}
