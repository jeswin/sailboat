import React, { Component } from "react";
import URL from "url-parse";
import nsoap from "nsoap";

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

/* 
  Check if an item is a React Element or not.
  React elements are "instantiated" <Components />
*/
function isElement(element) {
  return React.isValidElement(element);
}

function isIterable(gen) {
  return typeof gen !== "undefined" && gen.next && typeof gen.next === "function";
}

async function* iterateToEnd(gen) {
  while (true) {
    const genResult = await gen.next();
    if (genResult.done) {
      return genResult.value;
    } else {
      yield genResult.value;
    }
  }
}

const PARENT = Symbol("Parent");
const COMPONENT = Symbol("Component");

function renderTree(item, current) {
  if (current[COMPONENT]) {
    const [ParentComponent, parentProps] = current[COMPONENT];
    const rendered = item
      ? <ParentComponent {...parentProps}>
          {item}
        </ParentComponent>
      : <ParentComponent {...parentProps} />;
    return current[PARENT] ? renderTree(rendered, current[PARENT]) : rendered;
  } else {
    return item;
  }
}

export default class RouterHOC extends Component {
  constructor(props) {
    super(props);

    this.traverse = this._traverse.bind(this);
    this.onNextValue = this._onNextValue.bind(this);

    const _urlPrefix = this.props.options.urlPrefix || "/";
    const urlPrefix = _urlPrefix.endsWith("/") ? _urlPrefix : `${urlPrefix}/`;
    this.state = { urlPrefix };
  }

  componentWillMount() {
    this.props.onMount(this);
  }

  componentWillUnmount() {
    this.props.onUnmount(this);
  }

  _traverse(key, current) {
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
            const [Component, props, children] = result;
            const val = {
              [index]: () => undefined,
              [PARENT]: current,
              [COMPONENT]: [Component, props]
            };

            return children ? { ...val, ...children } : val;
          }
        },
        [PARENT]: current[PARENT],
        [COMPONENT]: current[COMPONENT]
      };
    }
  }

  _onNextValue(childElement, current) {
    const element = renderTree(childElement, current)
    this.setState(state => ({ state, element }));
  }

  async navigateTo(url) {
    const parsed = new URL(url, true);
    const req = { url: parsed.url, path: parsed.pathname, query: parsed.query };

    if (url !== this.state.url) {
      //If the prefix is not correct, we don't need to do anything
      if (req.path.startsWith(this.state.urlPrefix)) {
        const strippedPath = req.path.substring(this.state.urlPrefix.length);
        const dicts = [
          this.props.options.parseQuery
            ? this.props.options.parseQuery(query)
            : parseQuery(req.query)
        ];

        const createContext = this.props.options.createContext || (x => x);
        const context = this.props.options.appendContext
          ? createContext({ req, isContext: () => true })
          : [];

        const element = await nsoap(this.props.app, strippedPath, dicts, {
          index: this.props.options.index || "index",
          modifyHandler: this.traverse,
          onNextValue: this.onNextValue
        });
        this.setState(state => ({ ...state, element }));
      }
    }
  }

  render() {
    return (
      <div className="__nsoap_router_container__">
        {this.state.element}
      </div>
    );
  }
}
