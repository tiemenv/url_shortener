const express = require("express");
const requestIp = require("request-ip");
const router = express.Router();
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
      //check if deleted?
      if (urlObject.deleted) {
        res.status(404).json("Shortened URL has been deleted");
        return;
      }

      //retrieve stats and make some nice numbers
      const stats = urlObject.statistics;
      const numberOfVisits = stats.length;
      const quota = urlObject.requestQuota;
      //TODO: optimize?
      let uniqueVisitorsMap = new Map();

      for (let i = 0; i < numberOfVisits; i++) {
        const stat = stats[i];
        const ip = stat.clientIp;
        //returns undefined if not found in Map
        if (uniqueVisitorsMap.has(ip)) {
          let visits = uniqueVisitorsMap.get(ip);
          visits++;
          uniqueVisitorsMap.set(ip, visits);
        } else {
          uniqueVisitorsMap.set(ip, 1);
        }
      }

      //node v12 feature
      const uniqueVisitors = Object.fromEntries(uniqueVisitorsMap);
      const numberOfUniqueVisits = Object.keys(uniqueVisitors).length;

      //TODO: more stats like lastVisited or "visitors in the last X days" can be derived on the frontend

      const resObject = {
        visits: numberOfVisits,
        uniqueVisits: numberOfUniqueVisits,
        quota,
        uniqueVisitors,
        //passes time as an UNIX timestamp
        allVisits: stats,
      };
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

  //optional quota parameter
  let quota = null;
  if (req.body.hasOwnProperty("quota")) {
    quota = req.body.quota;
  }

  const shortUrlId = utils.generateShortId();
  if (!utils.validateUrl(originalUrl)) {
    res.status(400).json("Invalid Original Url");
    return;
  } else {
    urlObject = new Url({
      originalUrl,
      baseShortUrl,
      shortUrlId,
    });
    if (quota > 0) {
      urlObject.requestQuota = quota;
    }

    await urlObject.save();
    //send the full shortUrl back to the user
    const shortUrl = baseShortUrl + "/" + shortUrlId;
    res.json({ shortUrl, originalUrl });
  }
});

//CREATE new alias
router.post("/alias", async (req, res) => {
  const originalShortId = req.body.originalId;
  const aliasShortId = req.body.aliasId;
  let quota = null;
  if (req.body.hasOwnProperty("quota")) {
    quota = req.body.quota;
  }

  // check if original short url exists
  try {
    let urlObjectOriginal = await Url.findOne({
      shortUrlId: originalShortId,
      deleted: false,
    });
    //fail fast
    if (!urlObjectOriginal) {
      res.status(404).json("Url not found");
    } else {
      urlObject = new Url({
        originalUrl: urlObjectOriginal.originalUrl,
        baseShortUrl: urlObjectOriginal.baseShortUrl,
        shortUrlId: aliasShortId,
      });
      if (quota > 0) {
        urlObject.requestQuota = quota;
      }
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

  let quota = null;
  if (req.body.hasOwnProperty("quota")) {
    quota = req.body.quota;
  }

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
            if (quota > 0) {
              urlObject.requestQuota = quota;
            }
            await urlObject.save();
            const shortUrl =
              urlObject.baseShortUrl + "/" + urlObject.shortUrlId;
            const { originalUrl } = urlObject;
            res.status(200).json({ shortUrl, originalUrl });
          }
        } catch (err) {
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
      //delete is actually update, just set the "deleted" flag to true
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
