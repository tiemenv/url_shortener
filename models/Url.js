const mongoose = require("mongoose");

const UrlSchema = new mongoose.Schema({
  shortUrlId: {
    type: String,
    required: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  baseShortUrl: {
    type: String,
    required: true,
  },
  isAlias: {
    type: Boolean,
    required: false,
    default: false,
  },
  requestQuota: {
    type: Number,
    required: false,
    default: 0,
  },
  //lets keep all these statistics in a seperate object
  //lets keep an array of all clicks with all the valuable information stored raw, so we can use more data for fun stuff in the future
  statistics: {
    type: Object,
    default: {
      visits: 0,
      lastVisited: null,
      clicks: [],
    },
  },
  created: {
    type: String,
    default: Date.now,
  },
  updated: {
    type: String,
    default: Date.now,
  },
  //since we want to keep track of what urls existed in the past, so we can give a nice message to users visiting a deleted url, let's soft delete them
  deleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Url", UrlSchema);
