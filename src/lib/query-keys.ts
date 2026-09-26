// One factory for every React Query key, so invalidation and cache reads can't drift apart.
export const qk = {
  profile: (userId: string) => ['profile', userId] as const,
  water: {
    all: (userId: string) => ['water', userId] as const,
    day: (userId: string, date: string) => ['water', userId, 'day', date] as const,
  },
  nutrition: {
    all: (userId: string) => ['nutrition', userId] as const,
    day: (userId: string, date: string) => ['nutrition', userId, 'day', date] as const,
    savedFoods: (userId: string) => ['nutrition', userId, 'saved-foods'] as const,
    recentFoods: (userId: string) => ['nutrition', userId, 'recent-foods'] as const,
  },
  workouts: {
    all: (userId: string) => ['workouts', userId] as const,
    exercises: (userId: string) => ['workouts', userId, 'exercises'] as const,
    lastPerformance: (userId: string, exerciseId: string) =>
      ['workouts', userId, 'last-performance', exerciseId] as const,
    history: (userId: string) => ['workouts', userId, 'history'] as const,
    detail: (userId: string, workoutId: string) =>
      ['workouts', userId, 'detail', workoutId] as const,
    prs: (userId: string, workoutId: string) => ['workouts', userId, 'prs', workoutId] as const,
    exerciseHistory: (userId: string, exerciseId: string) =>
      ['workouts', userId, 'exercise-history', exerciseId] as const,
    exercisePrs: (userId: string, exerciseId: string) =>
      ['workouts', userId, 'exercise-prs', exerciseId] as const,
    templates: (userId: string) => ['workouts', userId, 'templates'] as const,
  },
  progress: {
    all: (userId: string) => ['progress', userId] as const,
    bodyWeights: (userId: string) => ['progress', userId, 'body-weights'] as const,
    workoutDays: (userId: string, from: string, to: string) =>
      ['progress', userId, 'workout-days', from, to] as const,
    weekly: (userId: string, from: string, to: string) =>
      ['progress', userId, 'weekly', from, to] as const,
  },
};

// Mutation keys: queued offline writes are matched to their mutationFn by these after a restart.
export const mk = {
  water: {
    add: ['water', 'add'] as const,
    delete: ['water', 'delete'] as const,
  },
  nutrition: {
    saveEntry: ['nutrition', 'save-entry'] as const,
    deleteEntry: ['nutrition', 'delete-entry'] as const,
    saveFood: ['nutrition', 'save-food'] as const,
    deleteFood: ['nutrition', 'delete-food'] as const,
  },
  workouts: {
    save: ['workouts', 'save'] as const,
    delete: ['workouts', 'delete'] as const,
    createExercise: ['workouts', 'create-exercise'] as const,
    archiveExercise: ['workouts', 'archive-exercise'] as const,
    saveTemplate: ['workouts', 'save-template'] as const,
    deleteTemplate: ['workouts', 'delete-template'] as const,
  },
  progress: {
    saveBodyWeight: ['body-weight', 'save'] as const,
    deleteBodyWeight: ['body-weight', 'delete'] as const,
  },
  profile: {
    save: ['profile', 'save'] as const,
  },
};
