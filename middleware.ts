import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.DASHBOARD_PASSWORD ?? "Pikachu123$";
const COOKIE   = "btc_auth";

export function middleware(req: NextRequest) {
  const auth = req.cookies.get(COOKIE)?.value;
  if (auth === PASSWORD) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (url.pathname === "/login") return NextResponse.next();

  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/login).*)"],
};
