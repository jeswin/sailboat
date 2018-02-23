import React = require("react");
import "mocha";
import "should";
import "should-enzyme";
import { mount } from "enzyme";
import "./dom";
import { Router, reset, navigateTo } from "../";

let Enzyme = require("enzyme");
let Adapter = require("enzyme-adapter-react-16");
let Signal = require("await-signal");
Enzyme.configure({ adapter: new Adapter() });

const HomePage = (props: any) => (
  <div>
    <h1>Home Page</h1>
    <p>Welcome to B29!</p>
  </div>
);

const AboutPage = (props: any) => (
  <div>
    <h1>About Page</h1>
    <p>B29 can handle it.</p>
  </div>
);

const WithParamPage = (props: any) => (
  <div>
    <h1>Parameter was {props.x}</h1>
  </div>
);

const TeamPage = (props: any) => (
  <div>
    <h1>Team page for {props.teamName}</h1>
    <div>{props.children}</div>
  </div>
);

const PlayerComponent = (props: any) => (
  <div>
    <h2>Player details for {props.player.name}</h2>
    <div>{props.children}</div>
  </div>
);

const GameComponent = (props: any) => (
  <div>
    <h3>Played game number {props.gameId}</h3>
  </div>
);

const NestedStreamContainer = (props: any) => (
  <div>
    <h1>Nested Streaming</h1>

    <div>{props.children}</div>
  </div>
);

async function getTeamName(teamId: number) {
  return `Team Number ${teamId}`;
}

async function getPlayer(jerseyNumber: number) {
  return { name: `Miss ${jerseyNumber}`, gamesPlayed: 200 };
}

let streamTraffic: any;
let testTraffic: any;

function resetTraffic() {
  streamTraffic = new Signal(false);
  testTraffic = new Signal(false);
}

const routes = {
  index() {
    return <HomePage />;
  },
  about() {
    return <AboutPage />;
  },
  withParam(x: any) {
    return <WithParamPage x={x} />;
  },
  async team(teamId: number) {
    const teamName = await getTeamName(teamId);
    return [
      TeamPage,
      { teamName },
      {
        async player(jerseyNumber: number) {
          const player = await getPlayer(jerseyNumber);
          return [
            PlayerComponent,
            { player },
            {
              game: (gameId: any) => [GameComponent, { gameId }]
            }
          ];
        }
      }
    ];
  },
  async *streaming() {
    yield <h1>Stream 1</h1>;
    testTraffic.state = true;
    await streamTraffic.until(true);
    streamTraffic.state = false;

    yield <h1>Stream 2</h1>;
    testTraffic.state = true;
    await streamTraffic.until(true);

    return <h1>End of Stream</h1>;
  },

  nested() {
    return [
      NestedStreamContainer,
      {},
      {
        async *streaming() {
          yield <h2>Stream 1</h2>;
          testTraffic.state = true;
          await streamTraffic.until(true);
          streamTraffic.state = false;

          yield <h2>Stream 2</h2>;
          testTraffic.state = true;
          await streamTraffic.until(true);

          return <h2>End of Stream</h2>;
        }
      }
    ];
  }
};

const routes2 = {
  about() {
    return <AboutPage />;
  }
};

function makeApp(options: any) {
  return { ...routes };
}

async function withWrapper(url: string, fn: Function, options?: any) {
  const app = makeApp(options);
  const wrapper = mount(Router(app, options));
  await navigateTo(url);
  await fn(wrapper);
}

let signal: any;

describe("NSOAP React", async () => {
  beforeEach(() => {
    reset();
  });

  it("Renders the home page", async () => {
    await withWrapper("/", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Home Page");
    });
  });

  it("Renders a url", async () => {
    await withWrapper("/about", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("About Page");
    });
  });

  it("Renders a route with a param", async () => {
    await withWrapper("/withParam(666)", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Parameter was 666");
    });
  });

  it("Renders a route with a param passed in querystring", async () => {
    await withWrapper("/withParam(x)?x=666", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Parameter was 666");
    });
  });

  it("Renders async route", async () => {
    await withWrapper("/team(100)", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Team page for Team Number 100");
    });
  });

  it("Renders an child route", async () => {
    await withWrapper("/team(100).player(10)", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Team page for Team Number 100");
      wrapper.render().find("h2").should.have.text("Player details for Miss 10");
    });
  });

  it("Can use slash instead of dot", async () => {
    await withWrapper(
      "/team(100)/player(10)",
      (wrapper: any) => {
        wrapper.render().find("h1").should.have.text("Team page for Team Number 100");
        wrapper.render().find("h2").should.have.text("Player details for Miss 10");
      },
      { useSlash: true }
    );
  });

  it("Renders an grand-child route", async () => {
    await withWrapper("/team(100).player(10).game(1)", (wrapper: any) => {
      wrapper.render().find("h1").should.have.text("Team page for Team Number 100");
      wrapper.render().find("h2").should.have.text("Player details for Miss 10");
      wrapper.render().find("h3").should.have.text("Played game number 1");
    });
  });

  it("Works with multiple routers on the same page", async () => {
    const app1 = { ...routes };
    const app2 = { ...routes2 };
    const wrapper = mount(
      <ul>
        <li>{Router(app1)}</li>
        <li>{Router(app2)}</li>
      </ul>
    );
    await navigateTo("/about");
    wrapper.render().find("h1").length.should.equal(2);
    reset();
  });

  it("Streams UI Components", async () => {
    resetTraffic();
    const app = { ...routes };
    const wrapper: any = mount(Router(app));
    const promise = navigateTo("/streaming");

    await testTraffic.until(true);
    testTraffic.state = false;
    wrapper.render().find("h1").should.have.text("Stream 1");
    streamTraffic.state = true;

    await testTraffic.until(true);
    testTraffic.state = false;
    wrapper.render().find("h1").should.have.text("Stream 2");
    streamTraffic.state = true;

    return promise.then(() => {
      wrapper.render().find("h1").should.have.text("End of Stream");
    });
  });

  it("Streams Nested UI Components", async () => {
    resetTraffic();
    const app = { ...routes };
    const wrapper: any = mount(Router(app));
    const promise = navigateTo("/nested.streaming");

    await testTraffic.until(true);
    testTraffic.state = false;
    wrapper.render().find("h1").should.have.text("Nested Streaming");
    wrapper.render().find("h2").should.have.text("Stream 1");
    streamTraffic.state = true;

    await testTraffic.until(true);
    testTraffic.state = false;
    wrapper.render().find("h1").should.have.text("Nested Streaming");
    wrapper.render().find("h2").should.have.text("Stream 2");
    streamTraffic.state = true;

    return promise.then(() => {
      wrapper.render().find("h1").should.have.text("Nested Streaming");
      wrapper.render().find("h2").should.have.text("End of Stream");
    });
  });
});
