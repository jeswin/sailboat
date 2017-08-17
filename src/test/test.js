import "./dom";
import React from "react/addons";
import should from "should";

const TestUtils = React.addons.TestUtils;

const routes = {
  index() {
    return <HomePage />;
  }
};


describe("NSOAP React", () => {
  it("Renders the home page", async () => {
    ReactDOM.render(App);
  });
});
