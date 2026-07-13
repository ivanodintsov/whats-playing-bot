export class ParsingRating {
  private scoresList: { max: number; value: number }[] = [];
  private threshold: number;
  private SCORE_POINTS = {
    ARTISTS: {
      AWARD: 45,
      PENALTY: 0,
    },
    TRACK_NAME: {
      AWARD: 35,
      PENALTY: 0,
    },
    ALBUM: {
      AWARD: 15,
      PENALTY: 0,
    },
    DURATION: {
      AWARD: 5,
      PENALTY: 0,
    },
  };

  constructor({ threshold } = { threshold: 0.9 }) {
    this.threshold = threshold || 0.9;
  }

  private addScores(
    {
      max,
      value,
    }: {
      max: number;
      value: number;
    },
    similarity: number = 1,
  ) {
    this.scoresList.push({
      max,
      value: value * similarity,
    });
  }

  addTrackNameScores(similarity?: number) {
    this.addScores(
      {
        max: this.SCORE_POINTS.TRACK_NAME.AWARD,
        value: this.SCORE_POINTS.TRACK_NAME.AWARD,
      },
      similarity,
    );
  }

  addAlbumScores(similarity?: number) {
    this.addScores(
      {
        max: this.SCORE_POINTS.ALBUM.AWARD,
        value: this.SCORE_POINTS.ALBUM.AWARD,
      },
      similarity,
    );
  }

  addArtistScores(artistsCount: number, similarity?: number) {
    this.addScores(
      {
        max: this.SCORE_POINTS.ARTISTS.AWARD / artistsCount,
        value: this.SCORE_POINTS.ARTISTS.AWARD / artistsCount,
      },
      similarity,
    );
  }

  addDurationScores(similarity?: number) {
    this.addScores(
      {
        max: this.SCORE_POINTS.DURATION.AWARD,
        value: this.SCORE_POINTS.DURATION.AWARD,
      },
      similarity,
    );
  }

  getScores() {
    const totalScore = this.scoresList.reduce(
      (sum, score) => sum + score.value,
      0,
    );
    const maxScore = this.scoresList.reduce((sum, score) => sum + score.max, 0);
    const isMatched = totalScore / maxScore >= this.threshold;

    return {
      totalScore,
      maxScore,
      isMatched,
    };
  }
}
