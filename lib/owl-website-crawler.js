const Crawler = require("crawler/lib/crawler");
const teams = require("../data/teams");
const { getYoutubeVideoIdFromUrl } = require("./youtube-url-parser");

module.exports = class OwlWebsiteCrawler {
  static async getMatches(casts, limit) {
    let matches = [];
    const concatenatedTeamNames = Object.entries(teams)
      .map((team) => team[1])
      .join("|");
    const matchTitleRegex = new RegExp(
      `@?(${concatenatedTeamNames}) (vs|contre).? @?(${concatenatedTeamNames})`
    );

    const crawler = new Crawler({
      maxConnections: casts.length,
      retries: 0,
      callback: function (error, res, done) {
        if (!error) {
          const $ = res.$;
          const nextData = JSON.parse($("#__NEXT_DATA__").text());

          let indexPageMatches = nextData.props.pageProps.blocks
            .filter((block) => Object.keys(block)[0] == "horizontalSwimLane")
            .reduce((previousBlocks, currentBlock) => {
              return [
                ...previousBlocks,
                ...Object.entries(currentBlock.horizontalSwimLane.cards)
                  .filter((card) => card[1].title.match(matchTitleRegex))
                  .map((card) => {
                    const splitMatchTitle = card[1].title.match(
                      matchTitleRegex
                    );

                    return {
                      id: parseInt(card[1].url.replace(/.*\/(\d*)$/, "$1")),
                      date: new Date(card[1].date),
                      cast: res.options.cast,
                      team1: Object.entries(teams)
                        .filter((team) => team[1] === splitMatchTitle[1])
                        .map((team) => team[0])[0],
                      team2: Object.entries(teams)
                        .filter((team) => team[1] === splitMatchTitle[3])
                        .map((team) => team[0])[0],
                    };
                  }),
              ];
            }, [])
            .sort((a, b) => b.date - a.date);

          if (limit) {
            indexPageMatches = indexPageMatches.splice(
              0,
              limit ? Math.floor(limit / casts.length) : indexPageMatches.length
            );
          }

          matches = [...matches, ...indexPageMatches];
        }
        done();
      },
    });

    crawler.queue(
      casts.map((cast) => {
        return {
          uri: `https://overwatchleague.com/${cast}/match-videos`,
          cast,
        };
      })
    );

    return new Promise((resolve) => {
      crawler.on("drain", () => {
        resolve(matches.sort((a, b) => b.date - a.date));
      });
    });
  }

  static async getMatch(cast, id) {
    let match = {};

    const crawler = new Crawler({
      maxConnections: 1,
      retries: 0,
      callback: function (error, res, done) {
        if (!error) {
          const $ = res.$;
          const nextData = JSON.parse($("#__NEXT_DATA__").text());

          const matchData = nextData.props.pageProps.blocks.find(
            (block) => Object.keys(block)[0] == "matchDetail"
          )?.matchDetail?.matchData;

          if (!matchData) {
            done();
            return;
          }

          match = {
            id: parseInt(id),
            date: new Date(matchData.header.date),
            cast,
            team1: matchData.header.teams[0].shortName,
            team2: matchData.header.teams[1].shortName,
            youtubeVideoId: getYoutubeVideoIdFromUrl(matchData.header.videoUrl),
          };
        }
        done();
      },
    });

    crawler.queue(`https://overwatchleague.com/${cast}/match/${id}`);

    return new Promise((resolve) => {
      crawler.on("drain", () => {
        resolve(match);
      });
    });
  }
};
