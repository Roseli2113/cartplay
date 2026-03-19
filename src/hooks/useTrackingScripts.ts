import { useEffect } from "react";

export function useTrackingScripts() {
  useEffect(() => {
    // Meta Pixel
    const w = window as any;
    if (!w.fbq) {
      const n: any = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      w.fbq = n;
      if (!w._fbq) w._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];

      const fbScript = document.createElement("script");
      fbScript.async = true;
      fbScript.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(fbScript);

      w.fbq("init", "1218520410268993");
    }
    w.fbq("track", "PageView");

    // Noscript pixel (img fallback)
    const existing = document.getElementById("fb-noscript-pixel");
    if (!existing) {
      const ns = document.createElement("img");
      ns.id = "fb-noscript-pixel";
      ns.height = 1;
      ns.width = 1;
      ns.style.display = "none";
      ns.src = "https://www.facebook.com/tr?id=1218520410268993&ev=PageView&noscript=1";
      document.body.appendChild(ns);
    }

    // GerenciaROI UTM script
    if (!document.getElementById("gerenciaroi-utm")) {
      const utmScript = document.createElement("script");
      utmScript.id = "gerenciaroi-utm";
      utmScript.src = "https://zwylxoajyyjflvvcwpvz.supabase.co/functions/v1/utms/latest.js";
      utmScript.async = true;
      utmScript.defer = true;
      utmScript.setAttribute("data-gerenciaroi-prevent-xcod-sck", "");
      utmScript.setAttribute("data-gerenciaroi-prevent-subids", "");
      document.head.appendChild(utmScript);
    }

    // GerenciaROI Live Tracking
    if (!(window as any).__gerenciaroiTracking) {
      (window as any).__gerenciaroiTracking = true;
      const uid = "0d6e183b-9b25-4bb6-a59c-187fd39f35fe";
      const sid = Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
      const url = "https://zwylxoajyyjflvvcwpvz.supabase.co/functions/v1/track-visitor";

      function send(action: string) {
        const data = JSON.stringify({ user_id: uid, session_id: sid, page_url: location.href, action });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, data);
        } else {
          fetch(url, { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true });
        }
      }

      send("heartbeat");
      const interval = setInterval(() => send("heartbeat"), 15000);
      const onBeforeUnload = () => send("leave");
      const onVisibility = () => { document.hidden ? send("leave") : send("heartbeat"); };
      window.addEventListener("beforeunload", onBeforeUnload);
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        clearInterval(interval);
        window.removeEventListener("beforeunload", onBeforeUnload);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }
  }, []);
}
