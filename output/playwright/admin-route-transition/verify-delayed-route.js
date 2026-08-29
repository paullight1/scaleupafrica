async (page) => {
  await page.unroute("**/src/pages/AdminBlog.tsx*");
  await page.route("**/src/pages/AdminBlog.tsx*", async (route) => {
    await page.waitForTimeout(1800);
    await route.continue();
  });

  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await page.waitForTimeout(250);

  const transitionState = {
    url: page.url(),
    navigationVisible: await page.getByRole("navigation", { name: "Admin navigation" }).isVisible(),
    headerVisible: await page.getByRole("banner").isVisible(),
    canvasVisible: await page.getByRole("main").isVisible(),
  };

  await page.screenshot({
    path: "output/playwright/admin-route-transition/delayed-blog-transition.png",
    fullPage: true,
  });

  await page.getByRole("heading", { name: "Blog", exact: true }).waitFor({ timeout: 5000 });
  return {
    transitionState,
    destinationVisible: await page.getByRole("heading", { name: "Blog", exact: true }).isVisible(),
  };
}
