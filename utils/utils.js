function validateShortId(shortId) {
  if (shortId.length > 64) {
    return false;
  }
  //allow only alphanumeric characters, dash and underscore
  const charPool =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  for (let i = 0; i < shortId.length; i++) {
    if (!charPool.includes(shortId.charAt(i))) {
      return false;
    }
  }
  return true;
}

function validateUrl(url) {
  let urlObject;

  try {
    urlObject = new URL(url);
  } catch (_) {
    return false;
  }

  return urlObject.protocol === "http:" || urlObject.protocol === "https:";
}

//I'm writing my own short url generator.

//I know I've said in the past to always reuse what is already available, but there is a balance to be held here. NPM package shortid used to be (or still is) the most popular package for something like this and has had security issues for years. (always check the NPM page before using! https://www.npmjs.com/package/shortid)

//On top of that, in something like the NPM ecosystem, I import packages only when they provide a lot of added value. Dependency management and auditing can easily become extremely overwhelming, and NPM has a horrible security reputation with multiple upstream vulnerabilities in the past. Knowing this, I'll gladly create my own short ids, a simple enough task.
function generateShortId() {
  //10 alphanumeric characters should be enough, length can be set in .env
  const idLength = 10;
  const charPool =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < idLength; i++) {
    id += charPool.charAt(Math.floor(Math.random() * charPool.length));
  }
  return id;
}

module.exports = { validateShortId, validateUrl, generateShortId };
