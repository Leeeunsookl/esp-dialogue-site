// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/docs/cosmos.json") {
    const url = request.nextUrl.clone();
    url.pathname = "/data/cosmos-pure.json";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
