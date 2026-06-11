import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Registers the service worker and surfaces its lifecycle to the user.
 *
 * registerType is "autoUpdate" (see vite.config.ts), so a new service worker
 * activates on its own. We just inform the user:
 *  - offlineReady → the app shell is cached and works offline now.
 *  - needRefresh  → a new build is ready; reload to apply it.
 */
const PWAUpdater = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success("Ready to use offline", { duration: 4000 });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast("A new version is available", {
        action: {
          label: "Refresh",
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
      });
      setNeedRefresh(false);
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};

export default PWAUpdater;
