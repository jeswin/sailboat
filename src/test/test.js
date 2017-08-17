import React from "react";
import should from "should";
import { shallow } from "enzyme";
import sinon from "sinon";
import { expect } from "chai";
import "./dom";

import { Router, navigateTo } from "../nsoap-react";

const HomePage = props =>
  <div>
    <h1>Home Page</h1>
    <p>Welcome to B29!</p>
  </div>;

const routes = {
  index() {
    return <HomePage />;
  }
};

function makeApp() {
  return { ...routes };
}

describe("NSOAP React", () => {
  it("Renders the home page", async () => {
    const app = makeApp();
    const wrapper = shallow(Router(app));
    await navigateTo("/");
    expect(wrapper.find("div")).to.have.length(1);
  });
});
