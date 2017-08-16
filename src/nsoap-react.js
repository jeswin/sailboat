import nsoap, { RoutingError } from "nsoap";
import React, { Component } from "react";

const identifierRegex = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

function parseDict(dict) {
  return key => {
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      const val = dict[key];
      return {
        value:
          typeof val !== "string"
            ? val
            : val === "true" || val === "false"
              ? val === "true"
              : identifierRegex.test(val) ? `${val}` : JSON.parse(val)
      };
    }
  };
}

function parseQuery(query) {
  return parseDict(query);
}

const routerComponents = [];

/*
  This is the Higher Order Component (HOC) that acts as a wrapper 
  for Components defined in various routes.
*/
class RouterComponent extends Component {
  componentWillMount() {
    routerComponents.push(this);
    this.setState(state => ({ ...state, component: currentComponent }));
  }

  setComponent(component) {
    if (component !== this.state.component) {
      this.setState(state => ({ ...state, component }));
    }
  }

  render() {
    return this.state.component;
  }
}

/* 
  Check if an item is a React Element or not.
  React elements are "instantiated" <Components />
*/
function isElement(element) {
  return React.isValidElement(element);
}

function modifyHandler(current, key) {
  const item = current[key];
  if (isElement(item)) {
    return { [key]: item };
  } else if (typeof item === "function") {
    return {
      [key]: async function() {
        const args = Array.prototype.slice.call(arguments);
        const result = await item.apply(current, args);
        if (isElement(result)) {
          return result;
        } else {
          const [Component, props, children] = result;
          return {
            index: <Component {...props} />,
            ...children
          };
        }
      }
    };
  }
}

export function Router(app, options = {}) {
  const _urlPrefix = options.urlPrefix || "/";
  const urlPrefix = _urlPrefix.endsWith("/") ? _urlPrefix : `${urlPrefix}/`;

  async function handler(req) {
    const { url, path, query } = req;

    //If the prefix is not correct, we don't need to do anything
    if (path.startsWith(urlPrefix)) {
      const strippedPath = path.substring(urlPrefix.length);
      const dicts = [
        options.parseQuery ? options.parseQuery(query) : parseQuery(query)
      ];

      const createContext = options.createContext || (x => x);
      const context = options.appendContext
        ? createContext({ req, isContext: () => true })
        : [];

      const element = await nsoap(app, strippedPath, dicts, {
        modifyHandler
      });
    }
  }
}

let currentUrl;
export function navigateTo(url) {
  
}
