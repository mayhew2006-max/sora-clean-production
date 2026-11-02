import { NextRequest, NextResponse } from "next/server";

// Older Android WebView builds launch /chat directly. Keep embedded Field Talk
// on /chat?field=1, but route every standalone launch into the unified map.
export function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.get("field") === "1") {
    return NextResponse.next();
  }
  const destination = request.nextUrl.clone();
  destination.pathname = "/field";
  destination.searchParams.delete("field");
  return NextResponse.redirect(destination);
}

export const config = { matcher: ["/chat"] };
