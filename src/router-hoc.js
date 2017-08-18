/*
  This is the Higher Order Component (HOC) that acts as a wrapper 
  for Components defined in various routes.
*/
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

const PARENT = new Symbol("ParentComponent");

export default class RouterHOC extends Component {
  constructor(props) {
    super(props);

    this.streamHandler = this._streamHandler.bind(this);
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

  // renderTree(item, current) {
  //   const ParentComponent = current[PARENT];
  //   if (ParentComponent) {
  //     return renderTree(
  //       <ParentComponent
  //     )
  //   }
  // }

  _streamHandler(current, key) {
    const parent = current[PARENT];
    const item = current[key];
    if (isElement(item)) {
      return { [key]: renderTree(item, parent) };
    } else if (typeof item === "function") {
      return {
        [key]: async function() {
          const args = Array.prototype.slice.call(arguments);
          const result = await item.apply(current, args);
          if (isElement(result)) {
            return renderTree(result, parent);
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

  _onNextValue(element) {
    this.setState(state => ({ ...state, element }));
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
          modifyHandler: this.streamHandler,
          onNextValue: this.onNextValue
        });
        debugger;
        this.setState(state => ({ ...state, element }));
      }
    }
  }

  render() {
    return (
      <div>
        {this.state.element}
      </div>
    );
  }
}
