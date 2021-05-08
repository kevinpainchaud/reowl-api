import { parse } from "node-html-parser";
import { getYoutubeVideoIdFromUrl } from "./youtube-url-parser";
import teams from "../data/teams";
import casts from "../data/casts";

const minMatchDate = new Date("2021-04-16"); // Season 4 opening
const mainCast = casts.find((cast) => cast.slug === "en-us");

export default class OwlWebsiteCrawler {
  static async getMatches(limit = 18, exclude) {
    let matches = [];
    const concatenatedTeamNames = Object.entries(teams)
      .map((team) => team[1])
      .join("|");
    const matchTitleRegex = new RegExp(
      `@?(${concatenatedTeamNames}) (vs|contre).? @?(${concatenatedTeamNames})`
    );

    // eslint-disable-next-line no-undef
    const matchesResponse = await fetch(
      `https://overwatchleague.com/${mainCast.slug}/videos`
    );

    const html = await matchesResponse.text();
    const nextData = JSON.parse(
      parse(html).querySelector("#__NEXT_DATA__").rawText.toString()
    );

    let indexPageMatches = nextData.props.pageProps.blocks
      .filter((block) => Object.keys(block)[0] == "horizontalSwimLane")
      .reduce((previousBlocks, currentBlock) => {
        return [
          ...previousBlocks,
          ...Object.entries(currentBlock.horizontalSwimLane.cards)
            .filter((card) => card[1].title.match(matchTitleRegex))
            .map((card) => {
              const splitMatchTitle = card[1].title.match(matchTitleRegex);

              return {
                id: parseInt(card[1].url.replace(/.*\/(\d*)$/, "$1")),
                date: new Date(card[1].publishDetails.time),
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
      const matcheIdsToExclude = exclude
        .split(",")
        .map((matchId) => parseInt(matchId));

      indexPageMatches = indexPageMatches.filter(
        (match) =>
          !matcheIdsToExclude.some(
            (matchIdToExclude) => matchIdToExclude == match.id
          )
      );
    }

    indexPageMatches = indexPageMatches.splice(
      0,
      limit ? Math.round(limit) : indexPageMatches.length
    );

    matches = [...matches, ...indexPageMatches];

    return matches
      .filter(
        (match) => new Date(match.date).getTime() >= minMatchDate.getTime()
      )
      .sort((a, b) => b.date - a.date)
      .splice(0, limit ? limit : matches.length);
  }

  static async getMatch(id) {
    let match = {};

    const getMatchDataFromResponse = async (res) => {
      const html = await res.text();
      const nextData = JSON.parse(
        parse(html).querySelector("#__NEXT_DATA__").rawText.toString()
      );

      const matchData = nextData.props.pageProps.blocks.find(
        (block) => Object.keys(block)[0] == "matchDetail"
      ).matchDetail.matchData;

      return matchData;
    };

    // eslint-disable-next-line no-undef
    const mainCastMatchResponse = await fetch(
      `https://overwatchleague.com/${mainCast.slug}/match/${id}`
    );

    const mainCastMatchData = await getMatchDataFromResponse(
      mainCastMatchResponse
    );

    if (mainCastMatchData) {
      const youtubeVideosByCast = [];

      youtubeVideosByCast.push({
        cast: mainCast.slug,
        id: getYoutubeVideoIdFromUrl(mainCastMatchData.header.videoUrl),
      });

      match = {
        id: parseInt(id),
        date: new Date(mainCastMatchData.header.date),
        team1: mainCastMatchData.header.teams[0].shortName,
        team2: mainCastMatchData.header.teams[1].shortName,
        youtubeVideosByCast,
      };

      await Promise.all(
        casts
          .filter((cast) => cast !== mainCast)
          .map((cast) => {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
              // eslint-disable-next-line no-undef
              const secondaryCastMatchResponse = await fetch(
                `https://overwatchleague.com/${cast.slug}/match/${id}`
              );

              const secondaryCastMatchData = await getMatchDataFromResponse(
                secondaryCastMatchResponse
              );

              if (secondaryCastMatchData) {
                const youtubeVideoId = getYoutubeVideoIdFromUrl(
                  secondaryCastMatchData.header.videoUrl
                );

                match.youtubeVideosByCast.push({
                  cast: cast.slug,
                  id:
                    youtubeVideoId !==
                    match.youtubeVideosByCast.find(
                      (youtubeVideo) => youtubeVideo.cast === mainCast.slug
                    ).id
                      ? youtubeVideoId
                      : null,
                });

                resolve();
              } else {
                reject();
              }
            });
          })
      );
    }

    return match;
  }
}
