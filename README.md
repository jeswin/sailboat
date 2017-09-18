
# Sailboat: A modern Router for React

![Streaming UI](https://cdn-images-1.medium.com/max/1200/1*__f50t1EhLRYArM-OIpLOQ.gif)

Summary of features:

* Streaming UI Components (via generators)

* Async route handling

* Easy integration with Redux, MobX and the like

* Server-side Rendering

* Powerful nested routes

* Avoid re-implementing features which already exist in HTML/JS

* Minimal learning curve

## NSOAP — A Routing Convention for JavaScript

One of the big lessons from the success of React is that sticking close to the underlying programming language makes a framework way more powerful than otherwise, while remaining easy to learn. NSOAP (Native Syntax Object Access Protocol) takes this lesson to heart; and defines a URL convention for accesssing JavaScript methods and objects locally (client-side routing) or remotely (server-side routing).
> If you know JavaScript, you already know the NSOAP convention.

Let’s look at a basic example for NSOAP in action for server-side routing.

```javascript
//Consider the simple web service below
const myRoutes = {  
  greet(name) => `Hello ${name}`,
  math: {
    sum(a, b) => a + b,
    zero: 0,
    asyncSum(a, b) => Promise.resolve(a + b)
  },
}


/*
  NSOAP routes for this service will look like this:
  /greet(jes) returns "Hello jes"
  /math.sum(10,20) returns 30
  /math.zero returns 0
  /math.asyncSum(10,20) also returns 30
*/
```

Since it’s just JavaScript, you can do interesting things like chained routes.

```javascript
const myRoutes = {
  async getCustomer(id) {
    const customer = await getCustomerFromDatabase(id);
    return {
      index: customer,
      async details() {
        const customerDetails = await customer.getDetails(id);
        return customerDetails;
      } 
    }
  }
};

/*
  NSOAP URLs:
  /getCustomer(100) returns a customer object
  /getCustomer(100).details returns customer details
*/
```

Alright, so that was NSOAP in a nutshell. To read more, see the documentation for [NSOAP Express Router](https://github.com/nsoap-official/nsoap-express). Let’s get started with the official NSOAP Router for React — Sailboat.

## Installation

Install Sailboat from npm.

    npm install sailboat

## Getting Started

In the previous examples, route handlers were returning strings or numbers as the result. Routing for React is simple; simply return React UI components from handlers.

Let’s start with a home page, which sits at the url “/”.

```javascript
import React from "react";
import { Router, navigateTo } from "sailboat";

const Home = (
  <div>
    <h1>Welcome to Sailboat</h1>
    <p>You are on the home page.</p>
  </div>
);

const myApp = {
  index: <HomePage />
}

//Load the home page when rendered.
navigateTo("/");

ReactDOM.render(Router(myApp), mountNode);
```

Ok, that was simple. Let’s now build a page which displays the sum of two numbers passed via a url. According to the NSOAP convention, your url is going to look like “/sum(10,20)”. Or if you want to use parameters, you could use “/sum(x,y)?x=10&y=20”.

We’ll also introduce here a component called Link, which navigates to the url when clicked. It renders an Anchor tag with its click handler invoking the navigateTo function seen previously, and sets the url in the browser’s address bar.

```javascript
import { Router, navigateTo } from "sailboat";

const Link => props => (
  <a href="#" onClick={() => navigateTo(props.url)}>
    {props.children}
  </a>
);

const HomePage = props => (
  <div>
    <p>
      <Link href="/sum(10,20)">
        Sum of 10 and 20
      </Link>
    </p>
  </div>
);

const Sum = props => (
  <div>Sum is `${props.a + props.b}`</div>
)

const myApp = {
  index: <HomePage />,
  sum: (a,b) => <Sum a={a} b={b} />
}

ReactDOM.render(Router(myApp), mountNode);
```

That wasn’t so hard either. Let’s see how we can build more complex UIs. We’re going to introduce an alternate syntax for declaring Routes. It makes our routing more expressive.

```javascript
//This...
const myApp = {
  index: <HomePage />,
  sum: (a,b) => <Sum a={a} b={b} />
}

//... is the same as
const myApp = {
  index: () => [HomePage],
  sum: (a, b) => [Sum, { a, b }]
};

ReactDOM.render(Router(myApp), mountNode);
```

What’s this good for? Child Routes. Read on.

## Child Routes

Let’s now bring some real-world complexity into our routing. Our goal is to define these three routes.

1. /team(teamId) — *returns the TeamPage component*

1. /team(teamId).player(jerseyNumber) — *returns PlayerComponent inside TeamPage*

1. /team(teamId).player(jerseyNumber).game(gameId) — *returns GameComponent inside PlayerComponent inside TeamPage*

Parent routes like /team(10) should be callable on their own, as well as along with child-components. eg: /team(10).player(2).game(23)

Sailboat has a short-hand syntax for this:

```javascript
const myApp = {
  team: teamId => [
    TeamPage, //Component
    { teamId }, //Props
    { //Child routes
      player: jerseyNumber => [
        PlayerComponent, //Component
        { jerseyNumber }, //Props
        { //Child routes
          game: gameId => [GameComponent, { gameId }]
        }
      ]
    }
  ]
};

ReactDOM.render(Router(myApp), mountNode);
```

This is how you’d define routes with Sailboat. Note that there was no need to define “index” routes to match just the parent.

## **Async Handlers and Streaming**

What if you want to show the team page only after you fetch all the team data? Let’s try.

```javascript
const myApp = {
  async team(teamId) {
    const team = await getTeamFromDatabase();
    return [
      TeamPage,
      { team },
      {
        async player(jerseyNumber) {
          const player = await team.getPlayer(jerseyNumber);
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

ReactDOM.render(Router(myApp), mountNode);
```

A small problem with the code above is that the page will refresh only after all the async calls are complete. Ideally you should be showing a Spinner (“loading…” indicators) while waiting for the data to arrive. Right?

Sailboat lets you do that using generators. Here’s the rewritten player() function. (Some of the code is removed for brevity).

```javascript
{
  //....
  async *player(jerseyNumber) {
    //show a spinner
    **yield <Spinner />;**
    const player = await team.getPlayer(jerseyNumber);
    //show the real thing
    return [
      PlayerComponent,
      { player },
      {
        game: gameId => [GameComponent, { gameId }]
      }
    ];
  }
};
```

It renders a Spinner while fetching the data. Once the data is available, it renders the actual PlayerComponent.

By the way, you can keep streaming HTML without ever returning. The following route streams seconds.

```javascript
{
  //....
  async *seconds() {
    let counter = 0;
    while(true) {
      yield <div>${counter} seconds have passed.</div>
      await sleep(1);
      counter++;
    }
  }
}
```

## Works automatically with Redux and the like.

Since route handlers in Sailboat are simple functions, it automatically works with state management libraries like Redux.

In the following example, a route change causes an action to be fired. The action could cause a change in state and thus re-render the UI.

```javascript
//Callable as /getTeam(245)
const myApp = {
  getTeam(teamId) {
    actions.loadTeam(teamId);
  }
};
```

## Multiple instances of the Router

Sailboat returns a regular React Component which can be used just like any other React Component. It’s perfectly alright to have multiple instances of the Sailboat Router in the same page.

```javascript
import { Router } from "sailboat";

const routes1 = {
  customers: { index: <CustomersPage /> }
}

const routes1 = {
  orders: { index: <OrdersPage /> }
}

const Customers = Router(routes1);
const Order = Router(routes2);

const App =
  <div>
    <Customers />
    <Orders />
  </div>;

ReactDOM.render(<App />, mountNode);
```

It should bepossible to embed Sailboat instances in an app driven by another router such as React Router, or even inside an Angular or Backbone app.

## Server-side Rendering

While rendering on the server, navigateTo should be called before renderToString(). Here’s an example with ExpressJS.

```javascript
import { Router, navigateTo } from "sailboat";

const myRoutes = { 
  //....omitted for brevity
};

router.get("*", (req, res) => {
  navigateTo(req.url).then(() => {
    const content = ReactDOMServer.renderToString(Router(myRoutes));
    res.render("index", { title: "Sail", data: false, content });
  });
});
```

If you were rendering to the DOM, you could have called navigateTo after the ReactDOM.render() is called.

## Sailboat versus React Router

Sailboat differs from React Router (and most others) by its use of NSOAP as the convention for defining routes. This gives you async routes, component streaming, easy integration with other libraries, familiar JS syntax and way better flexibility. All out of the box.

### What about nesting routes inside components like React Router v4?

Sure you can. Left as an exercise to the reader.

### Don’t like the dot notation?
You can use "/" instead of "." while accessing object properties by setting the useSlash option. This allows you to access the url "/team.player.game" as "/team/player/game".

```javascript
//omitted for brevity
ReactDOM.render(Router(myApp, { useSlash: true }), mountNode);
```

## Browser History

Use HTML5 APIs.

## Example Apps

Go to the [Sailboat Playground](https://github.com/nsoap-official/sailboat-playground).
