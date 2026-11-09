import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { loadUserProfile, saveUserDisplayName } from "@/services/user-data-server";

export const Route = createFileRoute("/_workspace/profile")({
  head: () => pageMeta("Profile", "Update the name shown on your NUTRIFY account."),
  component: ProfilePage,
});

function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadUserProfile()
      .then((profile) => {
        if (active) setDisplayName(profile.displayName);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const profile = await saveUserDisplayName({ data: { displayName } });
      setDisplayName(profile.displayName);
      toast.success("Display name saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your display name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={saveProfile}>
      <PageHeader eyebrow="Settings" title="Profile" description="Update the name shown on your account."
        actions={<Button type="submit" variant="forest" disabled={loading || saving}><Save /> {saving ? "Saving…" : "Save changes"}</Button>} />
      {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <section className="max-w-xl border-b py-8">
        <h2 className="text-base font-semibold text-forest">Account profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">This name appears in your workspace.</p>
        <label className="mt-5 block space-y-1.5 text-sm font-medium text-forest" htmlFor="display-name">Display name
          <Input id="display-name" required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={loading || saving} className="bg-card" />
        </label>
      </section>
    </form>
  );
}
