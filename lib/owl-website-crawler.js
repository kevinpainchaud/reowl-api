const teams = require("../data/teams");
const casts = require("../data/casts");
const { getYoutubeVideoIdFromUrl } = require("./youtube-url-parser");

const minMatchDate = new Date("2021-04-16"); // Season 4 opening
const mainCast = casts.find((cast) => cast.slug === "en-us");

module.exports = class OwlWebsiteCrawler {
  static async getMatches(Crawler, casts, limit = 18, exclude) {
    if (casts.length === 0) {
      return [];
    }

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
                      date: new Date(card[1].publishDetails.time),
                      cast: res.options.cast.slug,
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

          if (exclude) {
            const matchesToExclude = exclude.split(",").map((match) => {
              const splitMatch = match.split("_");

              return {
                castSlug: splitMatch[0],
                id: parseInt(splitMatch[1]),
              };
            });

            indexPageMatches = indexPageMatches.filter(
              (match) =>
                !matchesToExclude.some(
                  (matchToExclude) =>
                    JSON.stringify(matchToExclude) ==
                    JSON.stringify({ castSlug: match.cast, id: match.id })
                )
            );
          }

          indexPageMatches = indexPageMatches.splice(
            0,
            limit ? Math.round(limit / casts.length) : indexPageMatches.length
          );

          matches = [...matches, ...indexPageMatches];
        }
        done();
      },
    });

    crawler.queue(
      casts.map((cast) => {
        return {
          uri: `https://overwatchleague.com/${cast.slug}/videos`,
          cast,
        };
      })
    );

    return new Promise((resolve) => {
      crawler.on("drain", () => {
        resolve(
          matches
            .filter(
              (match) =>
                new Date(match.date).getTime() >= minMatchDate.getTime()
            )
            .sort((a, b) => b.date - a.date)
            .splice(0, limit ? limit : matches.length)
        );
      });
    });
  }

  static async getMatch(Crawler, id) {
    let match = {};

    const getMatchDataFromResponse = (res) => {
      const $ = res.$;
      const nextData = JSON.parse($("#__NEXT_DATA__").text());

      const matchData = nextData.props.pageProps.blocks.find(
        (block) => Object.keys(block)[0] == "matchDetail"
      )?.matchDetail?.matchData;

      return matchData;
    };

    const mainMatchCrawler = new Crawler({
      maxConnections: 1,
      retries: 0,
      callback: function (error, res, done) {
        if (!error) {
          const matchData = getMatchDataFromResponse(res);

          if (!matchData) {
            done();
            return;
          }

          const youtubeVideoIdsByCast = {};

          youtubeVideoIdsByCast[mainCast.slug] = getYoutubeVideoIdFromUrl(
            matchData.header.videoUrl
          );

          match = {
            id: parseInt(id),
            date: new Date(matchData.header.date),
            team1: matchData.header.teams[0].shortName,
            team2: matchData.header.teams[1].shortName,
            youtubeVideoIdsByCast,
          };
        } else {
          console.error(error);
        }
        done();
      },
    });

    const secondaryCastMatchCrawler = new Crawler({
      maxConnections: 1,
      retries: 0,
      callback: function (error, res, done) {
        if (!error) {
          const matchData = getMatchDataFromResponse(res);

          if (!matchData) {
            done();
            return;
          }

          const youtubeVideoId = getYoutubeVideoIdFromUrl(
            matchData.header.videoUrl
          );

          match.youtubeVideoIdsByCast[res.options.cast.slug] =
            youtubeVideoId !== match.youtubeVideoIdsByCast[mainCast.slug]
              ? youtubeVideoId
              : null;
        } else {
          console.error(error);
        }
        done();
      },
    });

    mainMatchCrawler.queue(
      `https://overwatchleague.com/${mainCast.slug}/match/${id}`
    );

    return new Promise((resolve) => {
      mainMatchCrawler.on("drain", () => {
        secondaryCastMatchCrawler.queue(
          casts
            .filter((cast) => cast !== mainCast)
            .map((cast) => {
              return {
                uri: `https://overwatchleague.com/${cast.slug}/match/${match.id}`,
                cast,
              };
            })
        );
      });

      secondaryCastMatchCrawler.on("drain", () => {
        resolve(match);
      });
    });
  }
};
