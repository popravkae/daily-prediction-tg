// Ball and Stand dimensions based on SVG files
// ball.svg: 711x683
// stand.svg: 797x244

// Scale factor to fit nicely on screen
export const BALL_WIDTH = 320
export const BALL_HEIGHT = Math.round(BALL_WIDTH * (683 / 711)) // ~308

// Stand is proportionally wider than ball
export const STAND_WIDTH = Math.round(BALL_WIDTH * (797 / 711)) // ~359
export const STAND_HEIGHT = Math.round(STAND_WIDTH * (244 / 797)) // ~110

// Total composition height
export const TOTAL_HEIGHT = BALL_HEIGHT + STAND_HEIGHT // ~418

// Scratch layer size (slightly smaller than ball for better fit)
export const SCRATCH_SIZE = 280
