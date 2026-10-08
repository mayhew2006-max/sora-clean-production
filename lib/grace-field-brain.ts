type FieldLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

type FieldContext = {
  source?: string;
  mode?: string;
  capturedAt?: string;
  location?: FieldLocation | null;
  weather?: Record<string, unknown> | null;
  savedSpots?: Array<Record<string, unknown>>;
};

function validCoordinates(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function parseFieldContext(raw: string): FieldContext | null {
  try {
    const data = JSON.parse(raw);

    if (!data || typeof data !== "object") return null;

    return data;
  } catch {
    const match = raw.match(
      /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/
    );

    if (!match) return null;

    return {
      source: "Grace Field",
      mode: /\bfish\b/i.test(raw) ? "fish" : "hunt",
      location: {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      },
    };
  }
}

async function fetchCounty(lat: number, lng: number) {
  try {
    const url = new URL(
      "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
    );

    url.searchParams.set("x", String(lng));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("vintage", "Current_Current");
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const geo = data?.result?.geographies || {};

    const county = geo.Counties?.[0]?.NAME;
    const state = geo.States?.[0]?.NAME;

    if (!county || !state) return null;

    return {
      county: String(county),
      state: String(state),
      source: "US Census Geocoder",
    };
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lng: number) {
  try {
    const url = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
    );
    url.searchParams.set("daily", "sunrise,sunset");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set("precipitation_unit", "inch");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!data?.current) return null;

    return {
      source: "Open-Meteo",
      observedAt: data.current.time,
      timezone: data.timezone,
      temperatureF: data.current.temperature_2m,
      feelsLikeF: data.current.apparent_temperature,
      windMph: data.current.wind_speed_10m,
      windFromDegrees: data.current.wind_direction_10m,
      gustMph: data.current.wind_gusts_10m,
      precipitationInches: data.current.precipitation,
      weatherCode: data.current.weather_code,
      sunrise: data.daily?.sunrise?.[0] || null,
      sunset: data.daily?.sunset?.[0] || null,
    };
  } catch {
    return null;
  }
}

export async function buildFieldIntelligence(
  rawContext: string
): Promise<string> {
  if (!rawContext.trim()) return "";

  const field = parseFieldContext(rawContext);

  if (!field) {
    return `
Grace Field context could not be parsed.
Do not invent a location or current conditions.
`;
  }

  const lat = Number(field.location?.latitude);
  const lng = Number(field.location?.longitude);

  if (!validCoordinates(lat, lng)) {
    return `
Grace Field GPS is unavailable or invalid.
Do not claim a verified geographic location.
`;
  }

  const [county, weather] = await Promise.all([
    fetchCounty(lat, lng),
    fetchWeather(lat, lng),
  ]);

  const spots = Array.isArray(field.savedSpots)
    ? field.savedSpots.slice(0, 25)
    : [];

  const safeSpots = spots.map((spot) => ({
    name: String(spot.name || "").slice(0, 100),
    type: String(spot.type || "").slice(0, 80),
    lat: Number(spot.lat),
    lng: Number(spot.lng),
    notes: String(spot.notes || "").slice(0, 250),
    createdAt: String(spot.createdAt || ""),
  }));

  const locationLabel = county
    ? `${county.county}, ${county.state}`
    : "County/state not independently verified";

  return `
GRACE FIELD LIVE SCOUTING INTELLIGENCE

Mode: ${field.mode === "fish" ? "FISHING" : "HUNTING"}
GPS latitude: ${lat}
GPS longitude: ${lng}
GPS accuracy: ${field.location?.accuracyMeters ?? "unknown"} meters
Field snapshot time: ${field.capturedAt || "unknown"}
Location: ${locationLabel}
Location source: ${county?.source || "Unavailable"}

SERVER-FETCHED WEATHER:
${weather ? JSON.stringify(weather) : "Unavailable"}

SAVED USER OBSERVATIONS:
${JSON.stringify(safeSpots)}

EVIDENCE RULES:
- GPS coordinates are supplied by the device.
- County/state are verified ONLY if the Census result exists.
- Weather is sourced ONLY from the server-fetched Open-Meteo result.
- If weather is unavailable, do not substitute invented conditions.
- Saved spots are USER observations, not independently verified.
- No waterbody, stream, lake, fish species, stocking date,
  public access, land ownership, or regulation was independently
  looked up by this intelligence module.
- Do not label any of those facts VERIFIED.
- Never guess a county or waterbody from nearby landmarks.
- Never invent real-time fish activity or deer movement.
- Distinguish a general tactic from a site-specific observation.

SCOUTING QUALITY:
- Start with the most useful actionable recommendation.
- Give a reason based on actual available data.
- If wind is available, explain what it means for the chosen activity.
- If saved observations exist, use them intelligently.
- If location is known but the actual waterbody or habitat is
  unknown, do not pretend to know its structure or species.
- Offer conditional tactics: "If you're fishing moving water..."
  rather than claiming moving water exists.
- For fishing, consider structure, depth, current, temperature,
  seasonal patterns, and lure presentation where supported.
- For hunting, consider wind, access, cover, travel routes,
  terrain, pressure, and observed sign where supported.
- Never confuse an inferred possibility with a verified fact.
- Do not recommend crossing private property or unsafe terrain.
- Keep the answer under approximately 220 words unless
  the user explicitly asks for a detailed report.
- Use plain text, not Markdown bold markers or decorative headings.
- Avoid generic beginner reminders and repetitive disclaimers.
- Retain Grace's familiar Boston attitude naturally.
`;
}
