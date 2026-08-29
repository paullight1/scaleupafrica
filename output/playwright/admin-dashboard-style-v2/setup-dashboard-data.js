async (page) => {
  await page.unroute("**/rest/v1/**");
  await page.route("**/rest/v1/**", async (route) => {
    const url = route.request().url();
    let data = [];

    if (url.includes("/rest/v1/user_roles")) {
      data = [{ role: "admin" }];
    } else if (url.includes("/rpc/admin_dashboard_stats")) {
      data = {
        total_users: 128,
        new_users_7d: 12,
        active_subscriptions: 47,
        total_profiles: 36,
        new_profiles_7d: 4,
        published_resources: 18,
        published_posts: 24,
        new_leads: 3,
        flagged_profiles: 1,
      };
    } else if (url.includes("/rpc/admin_reporting_summary")) {
      data = {
        period_days: 30,
        audience: { unique_sessions: 220, new_users: 64 },
        content: {},
        revenue: {
          by_currency: { NGN: 2500000 },
          by_plan: [],
          successful_payments: 5,
          failed_payments: 1,
        },
        operations: {},
      };
    } else if (url.includes("/rpc/admin_content_performance")) {
      data = [
        { content_id: "post-1", content_type: "blog", title: "A practical growth guide", status: "published", views: 42, downloads: 0, total_engagement: 42 },
        { content_id: "resource-1", content_type: "resource", title: "Pitch deck checklist", status: "published", views: 18, downloads: 7, total_engagement: 25 },
        { content_id: "post-2", content_type: "blog", title: "How founders build momentum", status: "published", views: 16, downloads: 0, total_engagement: 16 },
      ];
    } else if (url.includes("/rpc/admin_timeseries")) {
      data = [
        { day: "2026-08-21", count: 2 },
        { day: "2026-08-22", count: 5 },
        { day: "2026-08-23", count: 3 },
        { day: "2026-08-24", count: 7 },
      ];
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });

  await page.goto("http://127.0.0.1:8081/admin/", { waitUntil: "networkidle" });
  return { url: page.url(), title: await page.title() };
}
