async (page) => {
  const now = 1787630400;
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "studio@crescivacapital.com",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Studio Admin" },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6InN0dWRpb0BjcmVzY2l2YWNhcGl0YWwuY29tIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3ODc2MzA0MDB9XSwiaWF0IjoxNzg3NjMwNDAwLCJleHAiOjE4OTM0NTYwMDB9.cHJldmlldy1zaWduYXR1cmU";

  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/factors")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ all: [], totp: [], phone: [] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) });
  });

  await page.route("**/rest/v1/**", async (route) => {
    const requestUrl = route.request().url();
    const data = requestUrl.includes("/rest/v1/user_roles") ? [{ role: "admin" }] : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });

  await page.route("**/functions/v1/payment-reconciliation", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generated_at: new Date().toISOString(),
        summary: { payments_checked: 0, unhealthy_payments: 0, access_discrepancies: 0 },
        payments: [],
        access_discrepancies: [],
      }),
    });
  });

  const session = {
    access_token: accessToken,
    refresh_token: "browser-preview-refresh-token",
    expires_in: 86400,
    expires_at: now + 86400,
    token_type: "bearer",
    user,
  };
  await page.evaluate((value) => {
    localStorage.setItem("sb-fqragjhmunphhdnmvpgs-auth-token", JSON.stringify(value));
  }, session);
  await page.reload({ waitUntil: "networkidle" });
  return { url: page.url(), title: await page.title() };
}
