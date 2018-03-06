import * as React from "react";
import { Component, ComponentClass } from "react";
import URL = require("url-parse");
import nsoap from "nsoap";

const identifierRegex = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

export type Dict = {
  [key: string]: any;
};

function parseDict(dict: Dict) {
  return (key: string) => {
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

function parseQuery(query: Dict) {
  return parseDict(query);
}

/* 
  Check if an item is a React Element or not.
  React elements are "instantiated" <Components />
*/
function isElement(element: any): element is JSX.Element {
  return React.isValidElement(element);
}

function isIterable(gen: any): gen is Generator {
  return (
    typeof gen !== "undefined" && gen.next && typeof gen.next === "function"
  );
}

async function* iterateToEnd(gen: Generator) {
  while (true) {
    const genResult = await gen.next();
    if (genResult.done) {
      return genResult.value;
    } else {
      yield genResult.value;
    }
  }
}

export const PARENT = Symbol("Parent");
export const COMPONENT = Symbol("Component");

export type Current = {
  [COMPONENT]: [ComponentClass, any];
  [PARENT]: Current;
};

function renderTree(item: JSX.Element | undefined, current: Current): any {
  if (current[COMPONENT]) {
    const [ParentComponent, parentProps] = current[COMPONENT];
    const rendered = item ? (
      <ParentComponent {...parentProps}>{item}</ParentComponent>
    ) : (
      <ParentComponent {...parentProps} />
    );
    return current[PARENT] ? renderTree(rendered, current[PARENT]) : rendered;
  } else {
    return item;
  }
}

export default class RouterHOC extends Component {
  traverse: Function;
  onNextValue: Function;
  props: any;
  state: any;

  constructor(props: any) {
    super(props);

    this.traverse = this._traverse.bind(this);
    this.onNextValue = this._onNextValue.bind(this);

    const _urlPrefix = this.props.options.urlPrefix || "/";
    const urlPrefix = _urlPrefix.endsWith("/") ? _urlPrefix : `${_urlPrefix}/`;
    this.state = { urlPrefix };
  }

  componentWillMount() {
    this.props.onMount(this);
  }

  componentWillUnmount() {
    this.props.onUnmount(this);
  }

  _traverse(key: string, current: any) {
    const index = (this.props.options && this.props.options.index) || "index";

    const item = current[key];
    if (isElement(item)) {
      return {
        [key]: () => renderTree(item, current),
        [PARENT]: current[PARENT],
        [COMPONENT]: current[COMPONENT]
      };
    } else {
      return {
        [key]: async function*() {
          const resultOrIterable =
            typeof item === "function"
              ? await item.apply(current, arguments)
              : item;

          const result = isIterable(resultOrIterable)
            ? yield* iterateToEnd(resultOrIterable)
            : resultOrIterable;

          if (typeof result === "undefined" || isElement(result)) {
            return renderTree(result, current);
          } else {
            return Array.isArray(result)
              ? (() => {
                  const [Component, props, children] = result;
                  const val = {
                    [index]: () => undefined,
                    [PARENT]: current,
                    [COMPONENT]: [Component, props]
                  };

                  return children ? { ...val, ...children } : val;
                })()
              : result;
          }
        },
        [PARENT]: current[PARENT],
        [COMPONENT]: current[COMPONENT]
      };
    }
  }

  _onNextValue(childElement: JSX.Element, current: Current) {
    const element = renderTree(childElement, current);
    this.setState(state => ({ state, element }));
  }

  async navigateTo(url: string) {
    const parsed = URL(url, true);
    const req = { url, path: parsed.pathname, query: parsed.query };

    if (url !== this.state.url) {
      //If the prefix is not correct, we don't need to do anything
      if (req.path.startsWith(this.state.urlPrefix)) {
        const strippedPath = req.path.substring(this.state.urlPrefix.length);
        const dicts = [
          this.props.options.parseQuery
            ? this.props.options.parseQuery(req.query)
            : parseQuery(req.query)
        ];

        const createContext =
          this.props.options.createContext || ((x: any) => x);
        const context = this.props.options.appendContext
          ? createContext({ req, isContext: () => true })
          : [];

        const element = await nsoap(this.props.app, strippedPath, dicts, {
          index: this.props.options.index || "index",
          modifyHandler: this.traverse,
          onNextValue: this.onNextValue,
          useSlash: !!this.props.options.useSlash
        });

        this.setState(state => ({ ...state, element }));
      }
    }
  }

  render() {
    return (
      <div className="__nsoap_router_container__">{this.state.element}</div>
    );
  }
}
