module.exports = {
  getYoutubeVideoIdFromUrl: (videoUrl) => {
    const match = videoUrl.match(
      /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\\&\\?]*).*/
    );

    return match && match[1].length == 11 ? match[1] : null;
  },
};
