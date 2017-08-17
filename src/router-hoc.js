/*
  This is the Higher Order Component (HOC) that acts as a wrapper 
  for Components defined in various routes.
*/
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

export default class RouterHOC extends Component {
  constructor() {
    super();

    this.streamHandler = this._streamHandler.bind(this);
    this.onNextValue = this._onNextValue.bind(this);

    const _urlPrefix = options.urlPrefix || "/";
    const urlPrefix = _urlPrefix.endsWith("/") ? _urlPrefix : `${urlPrefix}/`;
    this.state = { urlPrefix };
  }

  //If currentUrl was set before this instance was created/mounted,
  //navigateTo it.
  componentWillMount() {
    this.props.onMount(this)
    if (currentUrl) {
      this.navigateTo(currentUrl);
    }
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
    this.setState(state => ({ ...state, element }))
  }

  async navigateTo(url) {
    const _ 
    if (url !== this.state.url) {
      //If the prefix is not correct, we don't need to do anything
      if (path.startsWith(this.props.urlPrefix)) {
        const strippedPath = path.substring(this.props.urlPrefix.length);
        const dicts = [
          options.parseQuery ? options.parseQuery(query) : parseQuery(query)
        ];

        const createContext = options.createContext || (x => x);
        const context = options.appendContext
          ? createContext({ req, isContext: () => true })
          : [];

        const element = await nsoap(app, strippedPath, dicts, {
          modifyHandler: this.streamHandler,
          onNextValue: this.onNextValue
        });

        this.setState(state => ({ ...state, element }))
      }
    }
  }

  render() {
    return <div>{element}</div>
  }
}