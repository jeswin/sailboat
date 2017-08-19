import React from "react";
import "should";
import "should-enzyme";
import { mount } from "enzyme";
import "./dom";

import { Router, reset, navigateTo } from "../sailboat";

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
    <div>
      {props.children}
    </div>
  </div>;

const PlayerComponent = props =>
  <div>
    <h2>
      Player details for {props.player.name}
    </h2>
    <div>
      {props.children}
    </div>
  </div>;

const GameComponent = props =>
  <div>
    <h3>
      Played game number {props.gameId}
    </h3>
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
  async team(teamId) {
    const teamName = await getTeamName(teamId);
    return [
      TeamPage,
      { teamName },
      {
        async player(jerseyNumber) {
          const player = await getPlayer(jerseyNumber);
          return [
            PlayerComponent,
            { player },
            {
              game: gameId => [GameComponent, { gameId }]
            }
          ];
        }
      }
    ];
  }
};

function makeApp() {
  return { ...routes };
}

async function withWrapper(url, fn, options) {
  const app = makeApp(options);
  const wrapper = mount(Router(app));
  await navigateTo(url);
  await fn(wrapper);
  reset();
}

describe("NSOAP React", async () => {
  it("Renders the home page", async () => {
    await withWrapper("/", wrapper => {
      wrapper.find("h1").should.have.text("Home Page");
    });
  });

  it("Renders a url", async () => {
    await withWrapper("/about", wrapper => {
      wrapper.find("h1").should.have.text("About Page");
    });
  });

  it("Renders a route with a param", async () => {
    await withWrapper("/withParam(666)", wrapper => {
      wrapper.find("h1").should.have.text("Parameter was 666");
    });
  });

  it("Renders a route with a param passed in querystring", async () => {
    await withWrapper("/withParam(x)?x=666", wrapper => {
      wrapper.find("h1").should.have.text("Parameter was 666");
    });
  });

  it("Renders async route", async () => {
    await withWrapper("/team(100)", wrapper => {
      wrapper.find("h1").should.have.text("Team page for Team Number 100");
    });
  });

  it("Renders an child route", async () => {
    await withWrapper("/team(100).player(10)", wrapper => {
      wrapper.find("h1").should.have.text("Team page for Team Number 100");
      wrapper.find("h2").should.have.text("Player details for Miss 10");
    });
  });

  it("Renders an grand-child route", async () => {
    await withWrapper("/team(100).player(10).game(1)", wrapper => {
      wrapper.find("h1").should.have.text("Team page for Team Number 100");
      wrapper.find("h2").should.have.text("Player details for Miss 10");
      wrapper.find("h3").should.have.text("Played game number 1");
    });
  });
});
