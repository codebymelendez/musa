import { NextRequest } from "next/server";
import { proxyGoogleRequest } from "@/lib/googleProxy";

// Time Zone API: resuelve la timezone IANA de unas coordenadas.
export async function GET(req: NextRequest) {
  return proxyGoogleRequest(req, "/timezone/json", ["location", "timestamp"]);
}
