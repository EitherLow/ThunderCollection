const fs = require("fs");

function isThunderClient(jsonFile) {
  if (!(jsonFile?.client === "Thunder Client")) {
    console.log("Not a thunder client file");
    process.exit();
  }
  return true;
}

function toPostmanRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.split("/").slice(1);

  const req = {
    name: request.name,
    request: {
      method: request.method,
      header: request.headers,
      url: { raw: url.href, protocol: url.protocol.replace(":", ""), host: [url.hostname], port: url.port, path },
    },
    response: [],
  };

  // yes ik this is messy
  if (request.body) {
    if (Object.keys(request.body).includes("raw")) {
      req.request.body = { mode: "raw", raw: request.body.raw, options: { raw: { language: request.body.type } } };
    } else {
      req.request.body = {};
      req.request.body["mode"] = request.body.type;
      // lmao
      Object.keys(request.body).forEach((property) => {
        const check = request.body[property];
        // the length check is to make sure that we dont get other objects that are just empty. the assumption is that the object with more than one item in it is the actual data we want
        if (typeof check === "object" && check.length > 0) {
          req.request.body[request.body.type] = request.body[property];
        }
      });
    }
  }

  // if the thunder client request had form data do this. Thunder client has they key prop called "name" and in postman it is called "key"
  req.request.body?.formdata?.forEach((item, i) => {
    req.request.body.formdata[i].key = item.name;
  });

  return req;
}

function main() {
  const [input, output = "out.json"] = process.argv.slice(2);

  // make sure file name is passed in
  if (!input) {
    console.log("Please pass in a file");
    process.exit();
  }

  const data = fs.readFileSync(input);
  const jsonData = JSON.parse(data);
  isThunderClient(jsonData);

  const postmanCollection = {
    info: { name: jsonData.collectionName, schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
    item: [],
  };

  jsonData["requests"].forEach((request) => {
    const thunderRequest = toPostmanRequest(request);
    postmanCollection.item.push(thunderRequest);
  });

  // ship it!
  const postmanStringifyObject = JSON.stringify(postmanCollection);
  fs.writeFileSync(output, postmanStringifyObject);
  console.log(`Done :) - Written to ${output}`);
}

main();
