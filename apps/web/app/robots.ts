import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/blog-data";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/debug"] },
    sitemap: `${await getSiteUrl()}/sitemap.xml`,
  };
}
