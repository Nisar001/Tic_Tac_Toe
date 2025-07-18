// LivesManager utility for lives-based system
export interface LivesStatus {
  currentLives: number;
  maxLives: number;
  canPlay: boolean;
}

export const MAX_LIVES = 5;
export const LIVES_REGEN_INTERVAL_MINUTES = 30;

export const LivesManager = {
  calculateCurrentLives(
    lives: number = 0,
    lastLivesUpdate: Date = new Date(0),
    lastLivesRegenTime?: Date
  ): LivesStatus {
    const now = new Date();
    let currentLives = lives;
    let maxLives = MAX_LIVES;
    let canPlay = currentLives > 0;

    // Regenerate lives based on time interval
    if (currentLives < maxLives) {
      const lastUpdate = lastLivesRegenTime || lastLivesUpdate;
      const minutesSinceLast = (now.getTime() - lastUpdate.getTime()) / 60000;
      const livesToRegen = Math.floor(minutesSinceLast / LIVES_REGEN_INTERVAL_MINUTES);
      if (livesToRegen > 0) {
        currentLives = Math.min(currentLives + livesToRegen, maxLives);
        canPlay = currentLives > 0;
      }
    }

    return { currentLives, maxLives, canPlay };
  }
};
