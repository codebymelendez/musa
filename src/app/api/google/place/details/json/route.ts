import { NextRequest } from "next/server";
import { proxyGoogleRequest } from "@/lib/googleProxy";

// Endpoint clásico de Place Details, consumido por
// react-native-google-places-autocomplete vía el prop requestUrl.
export async function GET(req: NextRequest) {
  return proxyGoogleRequest(req, "/place/details/json", [
    "place_id",
    "placeid",      // ← la librería RN envía el nombre legacy de este parámetro
    "fields",
    "language",
    "sessiontoken",
  ]);
}
