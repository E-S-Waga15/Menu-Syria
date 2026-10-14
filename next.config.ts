import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `next build` and `next dev` both write to `.next/static/chunks`, so a
   * verification build run while a dev server is up overwrites the chunks that
   * server is still serving — the page keeps its shell and newer components
   * silently render nothing. Setting NEXT_BUILD_DIR sends a build somewhere
   * else; unset (production, CI) it stays `.next`.
   */
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",

  /**
   * Strips the `X-Powered-By: Next.js` response header. Nothing should
   * advertise the framework to visitors or to anyone fingerprinting the host.
   */
  poweredByHeader: false,

  /** the dev-only floating badge; off so it never appears while demoing */
  devIndicators: false,

  images: {
    /**
     * Every remote host the app is allowed to optimise. Vercel refuses any
     * host that is not listed here — the usual cause of images that work
     * locally and 400 in production.
     */
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // production API-hosted business images
      { protocol: "https", hostname: "menusyria.softup.agency" },
      // every upload (business/agent photos, items, offers) now lives here
      // since the backend's migration off local filesystem storage
      { protocol: "https", hostname: "res.cloudinary.com" },
      // storefront logos and covers once uploads move to a real bucket
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // filesystem-backed uploads served by the Nest backend in dev
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],

    /**
     * AVIF first, WebP behind it. Vercel serves whichever the browser accepts,
     * which is where most of the weight of a photo-heavy storefront goes.
     */
    formats: ["image/avif", "image/webp"],

    /**
     * Next 16 only serves qualities declared here; anything else 400s. 75 is
     * the framework default, 90 is for the storefront hero and gallery where
     * the compression is visible on food photography.
     */
    qualities: [75, 90],

    /** a day of edge caching for optimised derivatives */
    minimumCacheTTL: 60 * 60 * 24,
  },

  /**
   * Note: no Cache-Control rule for /_next/static here on purpose. Next already
   * marks hashed assets immutable in production, and overriding it makes the
   * build warn that it breaks dev behaviour — a warning worth heeding: a dev
   * server serving a stale chunk is a corrupt `.next` cache, not a caching
   * policy problem. `npm run dev:clean` is the fix for that.
   */
  async headers() {
    return [
      {
        // conservative, framework-agnostic hardening; nothing here needs to
        // change when a page is added
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },

  /**
   * Proxies filesystem-uploaded images (served by the Nest backend under
   * /public) through the Next.js origin, so <Image> and plain <img> tags can
   * reference them with a relative path in both dev and prod.
   */
  async rewrites() {
    return [
      {
        source: "/public/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/public/:path*`,
      },
    ];
  },
};

export default nextConfig;
