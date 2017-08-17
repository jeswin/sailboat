import React from "react";
import nsoap, { RoutingError } from "nsoap";
import RouterHOC from "./router-hoc";

let routers = [];

/* 
  Check if an item is a React Element or not.
  React elements are "instantiated" <Components />
*/
function isElement(element) {
  return React.isValidElement(element);
}

function onMount(router) {
  routers.push(router);
  if (currentUrl) {
    router.navigateTo(currentUrl);
  }
}

function onUnmount(router) {
  const index = routers.findIndex(i => i === this);
  routers.splice(index, 1);
}

export function Router(app, options = {}) {
  return (
    <RouterHOC onMount={onMount} onUnmount={onUnmount} options={options} />
  );
}

let currentUrl;
export async function navigateTo(url) {
  currentUrl = url;
  for (const router of routers) {
    await router.navigateTo(url);
  }
}
