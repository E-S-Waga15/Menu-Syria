/** Central cache-key factory — one place to reason about invalidation. */
export const queryKeys = {
  governorates: ["governorates"] as const,
  regions: ["regions"] as const,
  businessSubTypes: (type: "RESTAURANT" | "STORE") =>
    ["business-sub-types", type] as const,
  restaurants: {
    all: ["restaurants"] as const,
    featured: ["restaurants", "featured"] as const,
    detail: (slug: string) => ["restaurants", slug] as const,
    menu: (slug: string) => ["restaurants", slug, "menu"] as const,
    analytics: (id: string) => ["restaurants", id, "analytics"] as const,
    orders: (id: string) => ["restaurants", id, "orders"] as const,
    tables: (id: string) => ["restaurants", id, "tables"] as const,
    waiters: (id: string) => ["restaurants", id, "waiters"] as const,
  },
  me: {
    /**
     * The signed-in person's own account (name, email, avatar, phone
     * numbers) — role-agnostic, unlike `business` below.
     */
    account: ["me", "account"] as const,
    /** the signed-in user's own business profile */
    business: ["me", "business"] as const,
    /** the signed-in agent's own profile (photo, referral code, etc.) */
    agentProfile: ["me", "agent-profile"] as const,
    menu: ["me", "menu"] as const,
    orders: ["me", "orders"] as const,
    whatsappOrders: ["me", "whatsapp-orders"] as const,
    tables: ["me", "tables"] as const,
    waiters: ["me", "waiters"] as const,
    branches: ["me", "branches"] as const,
  },
  statistics: {
    business: ["statistics", "business"] as const,
    overview: ["statistics", "overview"] as const,
    bestSelling: (days?: number) => ["statistics", "best-selling", days] as const,
    categories: ["statistics", "categories"] as const,
    peakTimes: ["statistics", "peak-times"] as const,
    liveActivity: ["statistics", "live-activity"] as const,
    insights: ["statistics", "insights"] as const,
    item: (itemId: string) => ["statistics", "items", itemId] as const,
  },
  offers: {
    /** everything a business has published, dashboard view */
    byBusiness: (businessId: string) => ["offers", businessId] as const,
    /** only what a customer should see on that storefront */
    live: (businessId: string) => ["offers", businessId, "live"] as const,
    /** the cross-business mix on the signed-in customer's home page */
    featured: ["offers", "featured"] as const,
  },
  agents: {
    all: ["agents"] as const,
    byGovernorate: (governorateId: string) =>
      ["agents", { governorateId }] as const,
    detail: (id: string) => ["agents", id] as const,
    restaurants: (id: string) => ["agents", id, "restaurants"] as const,
    stores: (id: string) => ["agents", id, "stores"] as const,
    transactions: (id: string) => ["agents", id, "transactions"] as const,
    plans: ["agents", "plans"] as const,
    dues: ["agents", "me", "dues"] as const,
  },
  admin: {
    stats: ["admin", "stats"] as const,
    restaurants: ["admin", "restaurants"] as const,
    agents: ["admin", "agents"] as const,
    whatsappOtp: ["admin", "whatsapp-otp", "status"] as const,
  },
  notifications: {
    /** the signed-in user's full notice list, any role — the backend scopes
     * it to the caller's own token, so one key serves every dashboard */
    all: ["notifications"] as const,
    unread: ["notifications", { unread: true }] as const,
  },
} as const;
