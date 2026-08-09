import { Link } from "react-router-dom";
import { AtlasLogoMark } from "@/components/branding/atlas-logo";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-center">
      <AtlasLogoMark tone="mono" size={40} className="opacity-40" />
      <div>
        <h1 className="text-2xl font-extrabold">Atlas couldn&apos;t find that page</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
