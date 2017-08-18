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

const WithParamPage = props =>
  <div>
    <h1>
      Parameter was {props.x}
    </h1>
  </div>;

const TeamPage = props =>
  <div>
    <h1>
      Team page for {props.teamName}
    </h1>
    {
      this.props.children
    }
  </div>;

const PlayerPage = props =>
  <div>
    <h2>
      Player page for ${props.player.name}
    </h2>
  </div>;

async function getTeamName(teamId) {
  return `Team Number ${teamId}`;
}

async function getPlayer(jerseyNumber) {
  return { name: `Miss ${jerseyNumber}`, gamesPlayed: 200 };
}

const routes = {
  index() {
    return <HomePage />;
  },
  about() {
    return <AboutPage />;
  },
  withParam(x) {
    return <WithParamPage x={x} />;
  },
  team: async teamId => {
    const teamName = await getTeamName(teamId);
    return [
      TeamPage,
      { teamName },
      {
        //Child routes
        player: jerseyNumber => [
          PlayerComponent, //Component
          { jerseyNumber }, //Props
          {
            //Child routes
            game: gameId => [GameComponent, { gameId }]
          }
        ]
      }
    ];
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

  it("Renders a route with a param", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/withParam(666)");
    wrapper.find("h1").should.have.text("Parameter was 666");
  });

  it("Renders a route with a param passed in querystring", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/withParam(x)?x=666");
    wrapper.find("h1").should.have.text("Parameter was 666");
  });

  it("Renders async route", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/team(100)");
    wrapper.find("h1").should.have.text("Team page for Team Number 100");
  });

  it("Renders an child route", async () => {
    const app = makeApp();
    const wrapper = mount(Router(app));
    await navigateTo("/team(100)");
    wrapper.find("h1").should.have.text("Team page for Team Number 100");
  });
});
