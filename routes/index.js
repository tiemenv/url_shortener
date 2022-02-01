const Express = require("express");
const requestIp = require("request-ip");
const { mapReduce } = require("../models/Url");
const router = Express.Router();
const Url = require("../models/Url");
const utils = require("../utils/utils");
require("dotenv").config({ path: "../.env" });

//GET original url from short url
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
        urlObject.statistics.length >= urlObject.requestQuota
      ) {
        res.status(429).json("Exceeded request quota for this URL");
        return;
      }

      //collect analytics data
      const clientIp = requestIp.getClientIp(req);
      console.log("determined client ip: ", clientIp);

      //lets keep the statistics a simple object pushed to an array for write efficiency
      //assuming these statistics will be more write than read heavy
      urlObject.statistics.push({
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

//GET statistics for certain short url
router.get("/stats/:shortUrlId", async (req, res) => {
  try {
    const urlObject = await Url.findOne({ shortUrlId: req.params.shortUrlId });
    //fail fast
    if (!urlObject) {
      res.status(404).json("Short URL not found");
      return;
    } else {
      //check if deleted
      if (urlObject.deleted) {
        res.status(404).json("Shortened URL has been deleted");
        return;
      }

      //TODO: retrieve stats and make some nice numbers
      const stats = urlObject.statistics;
      const numberOfVisits = stats.length;
      const quota = urlObject.requestQuota;
      //TODO: optimize
      let uniqueVisitorsMap = new Map();

      for (let i = 0; i < numberOfVisits; i++) {
        const stat = stats[i];
        console.log("stat foreach: ", stat);
        const ip = stat.clientIp;
        //returns undefined if not found in Map
        if (uniqueVisitorsMap.has(ip)) {
          console.log("HAS");
          let visits = uniqueVisitorsMap.get(ip);
          visits++;
          console.log("visits: ", visits);
          uniqueVisitorsMap.set(ip, visits);
        } else {
          console.log("HAS NOT");
          uniqueVisitorsMap.set(ip, 1);
        }
      }
      console.log("map at the end: ", uniqueVisitorsMap);

      const uniqueVisitors = Object.fromEntries(uniqueVisitorsMap);
      const numberOfUniqueVisits = Object.keys(uniqueVisitors).length;

      const resObject = {
        visits: numberOfVisits,
        uniqueVisits: numberOfUniqueVisits,
        quota,
        //node v12 feature
        uniqueVisitors,
        //passes time as an UNIX timestamp
        allVisits: stats,
      };
      console.log("resObject: ", resObject);
      res.status(200).json(resObject);
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
