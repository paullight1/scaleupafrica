import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Briefcase, Globe, Mail, Phone, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Profile = {
  id: string;
  business_name: string;
  founder_name: string | null;
  logo_url: string | null;
  country: string;
  sector: string;
  short_description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  linkedin: string | null;
};

const Directory = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    document.title = "SME Directory | ScaleUp Africa Collective";
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, business_name, founder_name, logo_url, country, sector, short_description, website, email, phone, instagram, linkedin")
        .order("created_at", { ascending: false })
        .limit(200);
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  const filtered = profiles.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.business_name.toLowerCase().includes(q) ||
      p.sector.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      (p.founder_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-gold text-sm mb-6">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
            The Pan-African <span className="text-gradient-gold">SME Directory</span>
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mb-8">
            A public, searchable directory of African founders and their businesses. Find suppliers, discover partners, and connect for cross-border trade.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, sector, country..."
                className="pl-12 h-12 bg-card text-foreground"
              />
            </div>
            <Link to={user ? "/directory/create" : "/auth?next=/directory/create"}>
              <Button variant="gold" size="lg" className="w-full sm:w-auto">
                {user ? "Manage my profile" : "Create a profile"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading directory...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-6">
              {profiles.length === 0
                ? "No profiles yet. Be the first to list your business."
                : "No matches for your search."}
            </p>
            {profiles.length === 0 && (
              <Link to={user ? "/directory/create" : "/auth?next=/directory/create"}>
                <Button variant="gold">Create the first profile</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {filtered.length} {filtered.length === 1 ? "business" : "businesses"}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-medium hover:border-gold/40 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={`${p.business_name} logo`} className="h-14 w-14 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-forest text-primary-foreground flex items-center justify-center font-serif text-xl font-bold">
                        {p.business_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-bold text-foreground truncate">
                        {p.business_name}
                      </h3>
                      {p.founder_name && (
                        <p className="text-xs text-muted-foreground truncate">by {p.founder_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.country}</span>
                    <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {p.sector}</span>
                  </div>

                  {p.short_description && (
                    <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{p.short_description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs">
                    {p.website && (
                      <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-forest hover:text-gold">
                        <Globe className="h-3 w-3" /> Site
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-forest hover:text-gold">
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-forest hover:text-gold">
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default Directory;
