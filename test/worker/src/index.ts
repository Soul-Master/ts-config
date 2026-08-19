const response = await fetch(new Request("https://example.com"));

console.log(response.status, self.location.href);

// @ts-expect-error Worker contexts must not expose the DOM document global.
document.createElement("main");
