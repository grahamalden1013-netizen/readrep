import { getViewer } from "@/lib/auth";
import { HeaderNav } from "./header-nav";

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <HeaderNav
      viewer={
        viewer
          ? {
              displayName: viewer.displayName,
              username: viewer.username,
              initials: viewer.initials,
              hue: viewer.hue,
              role: viewer.role,
            }
          : null
      }
    />
  );
}
