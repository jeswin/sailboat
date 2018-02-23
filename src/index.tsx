import * as React from "react";
import nsoap, { RoutingError } from "nsoap";
import RouterHOC from "./router-hoc";

let routers : Array<RouterHOC> = [];

export function reset() {
  currentUrl = undefined;
  routers = [];
}

export function load(router: RouterHOC) {
  routers.push(router);
  if (currentUrl) {
    router.navigateTo(currentUrl);
  }
}

export function unload(router: RouterHOC) {
  const index = routers.findIndex(i => i === router);
  routers.splice(index, 1);
}

let currentUrl: string | undefined;
export async function navigateTo(url: string) {
  currentUrl = url;
  for (const router of routers) {
    await router.navigateTo(url);
  }
}

export function Router(app: Object | Function, options = {}) {
  return (
    <RouterHOC
      app={app}
      onMount={load}
      onUnmount={unload}
      options={options}
    />
  );
}
