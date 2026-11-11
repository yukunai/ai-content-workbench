import { extractCore } from "@/lib/generators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(extractCore(body));
}
