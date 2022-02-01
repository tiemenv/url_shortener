const mongoose = require("mongoose");

const statisticSchema = new mongoose.Schema({
  clientIp: {
    type: String,
    default: null,
  },
  date: {
    type: String,
    default: Date.now,
  },
});

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

  //assume alias is functionally identical to a normal short url and completely seperate unlinked entity

  // isAlias: {
  //   type: Boolean,
  //   required: false,
  //   default: false,
  // },
  requestQuota: {
    type: Number,
    required: false,
    default: null,
  },
  //lets keep all these statistics in a seperate array
  //lets keep an array of all clicks with all the valuable information stored raw, so we can use this data for fun stuff in the future
  statistics: [statisticSchema],
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
