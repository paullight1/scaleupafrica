import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/common/Illustration";
import { SEO } from "@/components/common/SEO";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6 py-24">
      <SEO title="Page not found" noindex />
      <div className="flex max-w-md flex-col items-center text-center">
        <Illustration name="not-found" className="mb-8 h-36" />
        <p className="font-display text-5xl font-bold text-ink-strong">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-strong">
          This page took a wrong turn
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Button asChild variant="default" className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
