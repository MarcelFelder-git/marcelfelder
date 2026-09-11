import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/** Alles freigegeben, bis auf die API-Route - die ist fuer den Agenten. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
