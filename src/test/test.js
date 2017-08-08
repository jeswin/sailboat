import "./dom";
import React from "react/addons";
import should from "should";

const TestUtils = React.addons.TestUtils;

const Template = ({ title, content, children }) =>
  <div>
    <header>
      {title}
    </header>
    <p>
      {content}
    </p>
    {React.Children.count(children) ? children : <div />}
  </div>;

const HomePage = props =>
  <Template title="Home Page" content="Welcome to NSOAP React" />;

const AboutPage = props =>
  <Template title="About Page" content="This is about NSOAP React" />;

const ParentPage = ({ parentId, children }) =>
  <div>
    <h1>
      Parent id: ${parentId}
    </h1>
    <div>
      {children}
    </div>
  </div>;

const ChildComponent = ({ childId, children }) =>
  <div>
    <h2>
      Child id: ${childId}
    </h2>
    <div>
      {children}
    </div>
  </div>;

const GrandChildComponent = ({ grandChildId }) =>
  <div>
    GrandChild {grandChildId}
  </div>;

const routes = {
  index() {
    return <HomePage />;
  },
  parent(parentId) {
    return defineParent(ParentPage, { parentId }, Component => ({
      index: Component(),
      child(childId) {
        return defineComponent(
          Component,
          ChildComponent,
          { childId },
          Component => ({
            index: Component(),
            grandChild1(grandChildId) {
              return Component(
                <GrandChildComponent grandChildId={grandChildId} />
              );
            }
          })
        );
      }
    }));
  }
};

const routesAlt = {
  index: <HomePage title="Home" />,
  about: <AboutPage title="About" />,
  parent: [
    ParentPage,
    parentId => ({ parentId }),
    {
      child: [
        ChildComponent,
        childId => [
          { childId },
          childId > 10
            ? { grandChild1: <GrandChildComponent id="GC1" /> }
            : { grandChild2: <GrandChildComponent id="GC2" /> }
        ]
      ]
    }
  ]
};

ReactDOM.render(App);

describe("NSOAP React", () => {
  it("Calls a parameter-less function", async () => {
    const app = makeApp();
    const resp = await request(app).get("/about");
    resp.text.should.equal("NSOAP Test Suite");
  });

  it("Calls a unary function", async () => {
    const app = makeApp();
    const resp = await request(app).get("/parent(10)");
    resp.body.should.equal(20);
  });

  it("Throws an exception", async () => {
    const app = makeApp();
    const resp = await request(app).get("/throw(10)");
    resp.status.should.equal(400);
    resp.error.should.not.be.empty();
  });

  it("Calls a binary function", async () => {
    const app = makeApp();
    const resp = await request(app).get("/binary(10,20)");
    resp.body.should.equal(30);
  });

  it("Calls a unary function with variables", async () => {
    const app = makeApp();
    const resp = await request(app).get("/unary(x)?x=20");
    resp.body.should.equal(30);
  });

  it("Calls a binary function with variables", async () => {
    const app = makeApp();
    const resp = await request(app).get("/binary(x,y)?x=10&y=20");
    resp.body.should.equal(30);
  });

  it("Calls a binary function with literals and variables", async () => {
    const app = makeApp();
    const resp = await request(app).get("/binary(x,20)?x=10");
    resp.body.should.equal(30);
  });

  it("Calls a binary function in a namespace", async () => {
    const app = makeApp();
    const resp = await request(app).get("/namespace.binary(10,20)");
    resp.body.should.equal(30);
  });

  it("Calls a binary function in a nested namespace", async () => {
    const app = makeApp();
    const resp = await request(app).get("/nested.namespace.binary(10,20)");
    resp.body.should.equal(30);
  });

  it("Accepts stringified JSON arguments in querystring", async () => {
    const app = makeApp();
    const obj = encodeURIComponent(JSON.stringify({ x: 10 }));
    const resp = await request(app).get(`/json(obj)?obj=${obj}`);
    resp.body.should.equal(30);
  });

  it("Accepts JSON arguments in body", async () => {
    const app = makeApp();
    const resp = await request(app).post("/json(obj)").send({ obj: { x: 10 } });
    resp.body.should.equal(30);
  });

  it("Accepts arguments in headers", async () => {
    const app = makeApp();
    const resp = await request(app)
      .post("/binary(x,y)")
      .set("x", 10)
      .set("y", 20);
    resp.body.should.equal(30);
  });

  it("Accepts arguments in cookies", async () => {
    const app = makeApp();
    const resp = await request(app)
      .post("/binary(x,y)")
      .set("Cookie", ["x=10", "y=20"]);
    resp.body.should.equal(30);
  });

  it("Obeys parameter precedence (header, query, body, cookies)", async () => {
    const app = makeApp();
    const resp = await request(app)
      .post("/tripletAdder(x,y,z)?x=2&y=20")
      .set("x", 1)
      .set("Cookie", ["x=4", "y=40", "z=400"])
      .send({ x: 3, y: 30, z: 300 });
    resp.body.should.equal(321);
  });

  it("Adds parenthesis if omitted", async () => {
    const app = makeApp();
    const resp = await request(app).get("/about");
    resp.text.should.equal("NSOAP Test Suite");
  });

  it("Calls the default function", async () => {
    const app = makeApp();
    const resp = await request(app).get("/");
    resp.text.should.equal("Home page!");
  });

  it("Calls chained functions", async () => {
    const app = makeApp();
    const resp = await request(app).get("/chainAdder1(10).chainAdder2(20)");
    resp.body.should.equal(30);
  });

  it("Infers types", async () => {
    const app = makeApp();
    const resp = await request(app).get("/infer(true,20,Hello)");
    resp.body._bool.should.equal(true);
    resp.body._num.should.equal(20);
    resp.body._str.should.equal("Hello");
  });

  it("Is Case-sensitive", async () => {
    const app = makeApp();
    const resp = await request(app)
      .post("/json(obj)")
      .send({ obj: { X: 100, x: 10 } });
    resp.body.should.equal(30);
  });

  it("Resolves a Promise", async () => {
    const app = makeApp();
    const resp = await request(app).get("/promiseToAdd(10,20)");
    resp.body.should.equal(30);
  });

  it("Calls a function on the resolved value of a Promise", async () => {
    const app = makeApp();
    const resp = await request(app).get(
      "/functionOnPromise(x,y).adder(100)?x=10&y=20"
    );
    resp.body.should.equal(130);
  });

  it("Calls default function on object", async () => {
    const app = makeApp();
    const resp = await request(app).get("/defaultFunction(10,20)");
    resp.body.should.equal(30);
  });

  it("Passes context as an argument", async () => {
    const app = makeApp({ appendContext: true });
    const resp = await request(app).get("/funcWithContext(10,20)");
    resp.body.should.equal(30);
  });

  it("Passes context as the first argument", async () => {
    const app = makeApp({ appendContext: true, contextAsFirstArgument: true });
    const resp = await request(app).get("/funcWithPrependedContext(10,20)");
    resp.body.should.equal(30);
  });

  it("Overrides request handling", async () => {
    const app = makeApp({ appendContext: true, contextAsFirstArgument: true });
    const resp = await request(app).get("/overrideResponse(10,20)");
    resp.text.should.equal("200");
  });

  it("Passes a custom context", async () => {
    const app = makeApp({
      appendContext: true,
      contextAsFirstArgument: true,
      createContext: args => ({ ...args, z: 10 })
    });
    const resp = await request(app).get("/customContext(10,20)");
    resp.body.should.equal(40);
  });

  it("Calls a raw handler", async () => {
    const app = makeApp();
    const resp = await request(app).get("/rawHandler(10,20)");
    resp.text.should.equal("200");
  });

  it("Returns 404 if not found", async () => {
    const app = makeApp();
    const resp = await request(app).get("/nonExistantFunction(10,20)");
    resp.status.should.equal(404);
    resp.text.should.equal("Not found.");
  });
});
