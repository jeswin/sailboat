import nsoap, { RoutingError } from "nsoap";

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

function wrap(_app, key) {
  const app = key ? { [key]: _app[key] } : _app;
  return Object.keys(app).reduce((acc, key) => {
    const handler = app[key];
    acc[key] = () => {};
    return acc;
  }, {});
}

function modifyHandler(current, key) {
  const item = current[key];
  return Array.isArray(item)
    ? (() => {
        const [[Component, getProps], children] = item;
        const handler = () => {
          const args = Array.prototype.slice.call(arguments);
          const result = getPropsAndChildren ? getPropsAndChildren(args) : [];
        };
        return { [key]: handler }
      })()
    : (() => {})();
}

export default function(app, options = {}) {
  const _urlPrefix = options.urlPrefix || "/";
  const urlPrefix = _urlPrefix.endsWith("/") ? _urlPrefix : `${urlPrefix}/`;

  return async req => {
    const { url, path, query } = req;

    if (path.startsWith(urlPrefix)) {
      const strippedPath = path.substring(urlPrefix.length);
      const dicts = [
        options.parseQuery ? options.parseQuery(query) : parseQuery(query)
      ];

      const createContext = options.createContext || (x => x);
      const context = options.appendContext
        ? createContext({ req, isContext: () => true })
        : [];

      const result = nsoap(app, strippedPath, dicts, {
        modifyHandler
      });
    } else {
      throw new Error(
        `The url ${url} was not prefixed with ${prefix}. Skipped.`
      );
    }
  };
}
