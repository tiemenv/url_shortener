const Express = require("express");
const requestIp = require("request-ip");
const router = Express.Router();
const Url = require("../models/Url");
const utils = require("../utils/utils");
require("dotenv").config({ path: "../.env" });

router.get("/:shortUrlId", async (req, res) => {
  try {
    const urlObject = await Url.findOne({ shortUrlId: req.params.shortUrlId });
    //fail fast
    if (!urlObject) {
      res.status(404).json("Not found");
      return;
    } else {
      //check if deleted
      if (urlObject.deleted) {
        res.status(404).json("Shortened URL has been deleted");
        return;
      }

      //check quota
      if (
        urlObject.requestQuota > 0 &&
        urlObject.statistics.visits >= urlObject.requestQuota
      ) {
        res.status(429).json("Exceeded request quota for this URL");
        return;
      }

      //add click in statistics and save
      urlObject.statistics.visits++;
      urlObject.statistics.lastVisited = Date.now();

      //collect analytics data
      const clientIp = requestIp.getClientIp(req);
      console.log("determined client ip: ", clientIp);

      urlObject.statistics.clicks.push({
        clientIp,
        date: Date.now(),
      });
      console.log("urlObject to save: ", urlObject);

      //TODO: figure out why the hell this doesn't save
      await urlObject.save();
      console.log("SAVED");
      return res.redirect(urlObject.originalUrl);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server Error");
  }
});

//CREATE new url
router.post("/", async (req, res) => {
  const { originalUrl } = req.body;
  const baseShortUrl = process.env.BASE_URL;

  const shortUrlId = utils.generateShortId();
  if (utils.validateUrl(originalUrl)) {
    urlObject = new Url({
      originalUrl,
      baseShortUrl,
      shortUrlId,
    });

    await urlObject.save();
    const shortUrl = baseShortUrl + "/" + shortUrlId;
    res.json({ shortUrl, originalUrl });
  } else {
    res.status(400).json("Invalid Original Url");
  }
});

//CREATE new alias
router.post("/alias", async (req, res) => {
  const { originalShortId, aliasShortId } = req.body;

  // check if original short url exists
  try {
    let urlObject = await Url.findOne({
      shortUrlId: originalShortId,
      deleted: false,
    });
    //fail fast
    if (!urlObject) {
      res.status(404).json("Url not found");
    } else {
      //TODO: edit Url
      urlObject.shortUrlId = aliasShortId;
      await urlObject.save();
      res.status(201).json(urlObject);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server Error");
  }
});

//UPDATE existing URL
//TODO: authentication?
router.put("/:oldShortUrlId", async (req, res) => {
  const { oldShortUrlId } = req.params;
  const newShortUrlId = req.body.id;

  //proposed alias valid short id?
  if (!utils.validateShortId(newShortUrlId)) {
    //fail fast
    res.status(400).json("Invalid short id");
    return;
  } else {
    try {
      //does the short id exist already?
      console.log("query: ", { shortId: newShortUrlId });
      let urlObject = await Url.findOne({
        shortUrlId: newShortUrlId,
        deleted: false,
      });
      console.log("urlObject: ", urlObject);
      if (urlObject) {
        //alias already exists! fail fast:
        res.status(400).json("Short ID already exists");
        return;
      } else {
        try {
          //valid short id, let's find the original short url id and update
          let urlObject = await Url.findOne({
            shortUrlId: oldShortUrlId,
            deleted: false,
          });
          //original short id not found!
          if (!urlObject) {
            //fail fast
            res.status(404).json("Url not found");
            return;
          } else {
            //all OK, let's update and save
            urlObject.shortUrlId = newShortUrlId;
            await urlObject.save();
            const shortUrl =
              urlObject.baseShortUrl + "/" + urlObject.shortUrlId;
            const { originalUrl } = urlObject;
            res.status(200).json({ shortUrl, originalUrl });
          }
        } catch (err) {
          //TODO: TEST this syntax!!
          throw err;
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).json("Server Error");
    }
  }
});

//DELETE existing URL
//TODO: authentication?
router.delete("/:shortUrlId", async (req, res) => {
  const { shortUrlId } = req.params;
  try {
    let urlObject = await Url.findOne({ shortUrlId, deleted: false });
    //fail fast
    if (!urlObject) {
      res.status(404).json("Url doesn't exist");
      return;
    } else {
      //delete is actually update
      urlObject.deleted = true;
      await urlObject.save();
      res.status(200).json("Deleted");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server Error");
  }
});

module.exports = router;
