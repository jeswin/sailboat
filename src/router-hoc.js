/*
  This is the Higher Order Component (HOC) that acts as a wrapper 
  for Components defined in various routes.
*/
import React, { Component } from "react";
import URL from "url-parse";

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

  _streamHandler(current, key) {
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

  _onNextValue(element) {
    this.setState(state => ({ ...state, element }));
  }

  async navigateTo(url) {
    const parsed = new URL(url);
    const req = { url: parsed.url, path: parsed.pathname, query: parsed.searchParams };

    if (url !== this.state.url) {
      //If the prefix is not correct, we don't need to do anything
      if (req.path.startsWith(this.state.urlPrefix)) {
        const strippedPath = req.path.substring(this.state.urlPrefix.length);
        const dicts = [
          this.props.options.parseQuery
            ? this.props.options.parseQuery(query)
            : parseQuery(query)
        ];

        const createContext = this.props.options.createContext || (x => x);
        const context = this.props.options.appendContext
          ? createContext({ req, isContext: () => true })
          : [];

        const element = await nsoap(app, strippedPath, dicts, {
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
