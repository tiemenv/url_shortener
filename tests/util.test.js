const utils = require("../utils/utils");

test("validating short id", () => {
  expect(utils.validateShortId("abc123")).toBe(true);
  expect(utils.validateShortId("$%^&*")).toBe(false);
  expect(
    utils.validateShortId(
      "AAAAABBBBBCCCCCDDDDDEEEEEFFFFFGGGGGHHHHHIIIIIJJJJJKKKKKLLLLLMMMMMNNNNNOOOOOPPPPPQQQQQ"
    )
  ).toBe(false);
});

test("generation short id", () => {
  expect(utils.generateShortId().length).toBe(10);
});

test("validating URL", () => {
  expect(utils.validateUrl("http://www.google.com")).toBe(true);
  expect(utils.validateUrl("abc123")).toBe(false);
});
