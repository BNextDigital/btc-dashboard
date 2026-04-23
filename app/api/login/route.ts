import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.DASHBOARD_PASSWORD ?? "Pikachu123$";

  if (password !== correct) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("btc_auth", correct, {
    httpOnly: true,
    secure:   true,
    sameSite: "strict",
    maxAge:   60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
