import { NextRequest } from "next/server";
import { proxyGoogleRequest } from "@/lib/googleProxy";

// Endpoint clásico de Places Autocomplete, consumido por
// react-native-google-places-autocomplete vía el prop requestUrl.
export async function GET(req: NextRequest) {
  return proxyGoogleRequest(req, "/place/autocomplete/json", [
    "input",
    "language",
    "components",
    "sessiontoken",
  ]);
}
