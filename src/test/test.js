import React from "react";
import "should";
import "should-enzyme";
import { mount } from "enzyme";
import "./dom";

import { Router, navigateTo } from "../nsoap-react";

const HomePage = props =>
  <div>
    <h1>Home Page</h1>
    <p>Welcome to B29!</p>
  </div>;


const AboutPage = props =>
<div>
  <h1>About Page</h1>
  <p>B29 can handle it.</p>
</div>;

const routes = {
  index() {
    return <HomePage />;
  },
  about() {
    return <AboutPage />
  }
};

function makeApp() {
  return { ...routes };
}

describe("NSOAP React", () => {
  it("Renders the home page", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/");
    wrapper.find("h1").should.have.text("Home Page");
  });

  it("Renders a url", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/about");
    wrapper.find("h1").should.have.text("About Page");
  });
});
