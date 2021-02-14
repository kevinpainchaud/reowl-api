const Crawler = require("crawler");

module.exports = async (req, res) => {
  const getWebsiteTitle = async () => {
    let websiteTitle;

    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: function (error, res, done) {
        if (error) {
          console.log(error);
        } else {
          var $ = res.$;
          // $ is Cheerio by default
          //a lean implementation of core jQuery designed specifically for the server
          websiteTitle = $("title").text();
          console.log(websiteTitle);
        }
        done();
      },
    });

    // Queue just one URL, with default callback
    c.queue("http://www.amazon.com");

    return new Promise((resolve) => {
      c.on("drain", () => {
        resolve(websiteTitle);
      });
    });
  };

  const websiteTitle = await getWebsiteTitle();

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ websiteTitle }));
};
