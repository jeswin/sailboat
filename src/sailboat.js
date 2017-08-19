import React from "react";
import nsoap, { RoutingError } from "nsoap";
import RouterHOC from "./router-hoc";

let routers = [];

export function reset() {
  currentUrl = undefined;
  routers = [];
}

export function load(router) {
  routers.push(router);
  if (currentUrl) {
    router.navigateTo(currentUrl);
  }
}

export function unload(router) {
  const index = routers.findIndex(i => i === router);
  routers.splice(index, 1);
}

let currentUrl;
export async function navigateTo(url) {
  currentUrl = url;
  for (const router of routers) {
    await router.navigateTo(url);
  }
}

export function Router(app, options = {}) {
  return (
    <RouterHOC
      app={app}
      onMount={load}
      onUnmount={unload}
      options={options}
    />
  );
}
