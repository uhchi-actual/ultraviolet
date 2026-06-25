import { StaticUnavailable } from "@/components/shared/StaticUnavailable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Your musical identity"
        title="Profile"
        description="The SOUL agent reads your listening history and synthesizes a living portrait of your taste."
      />
      <StaticUnavailable
        feature="Profile"
        hint="SOUL profiling needs a local backend and a listening-history export. The public demo focuses on Tree and playlist radio."
      />
    </div>
  );
}
