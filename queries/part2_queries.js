// Перемикаємось на потрібну базу даних
db = db.getSiblingDB("spotify");

print("=========================================");
print("Завдання 1. Треки для вечірки");
print("=========================================");

// Використовуємо .find() з операторами порівняння
// Оскільки в нас тривалість тепер у секундах (duration_sec), переводимо 3-5 хв у секунди (180-300)
const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_sec: { $gte: 180, $lte: 300 } 
  },
  { 
    _id: 0, 
    track_name: 1, 
    artists: 1, 
    duration_sec: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
  }
).limit(5).toArray(); // Беремо 5 для прикладу

printjson(partyTracks);
print(`Всього знайдено таких треків: ${db.tracks.countDocuments({
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  duration_sec: { $gte: 180, $lte: 300 }
})}`);


print("\n=========================================");
print("Завдання 2. Виконавці, у яких усі треки популярні");
print("=========================================");

const popularArtists = db.tracks.aggregate([
  // 1. Розбиваємо масив артистів, щоб кожен артист мав окремий документ для групування
  { $unwind: "$artists" },
  
  // 2. Групуємо по артисту та збираємо статистику
  {
    $group: {
      _id: "$artists",
      total_tracks: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  
  // 3. Фільтруємо за умовами: мін. 3 треки І мін. популярність >= 60
  {
    $match: {
      total_tracks: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  
  // 4. Проєкція та округлення середньої популярності (для краси)
  {
    $project: {
      _id: 0,
      artist: "$_id",
      total_tracks: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  
  // 5. Сортуємо по середній популярності за спаданням і беремо топ-20
  { $sort: { avg_popularity: -1 } },
  { $limit: 20 }
]).toArray();

printjson(popularArtists);


print("\n=========================================");
print("Завдання 3. Нетипові треки");
print("=========================================");

const outlierTracks = db.tracks.aggregate([
  // 1. Групуємо по жанру, щоб знайти середнє та відхилення
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      std_dev: { $stdDevPop: "$audio_features.tempo" },
      // Зберігаємо всі треки цього жанру в масив, щоб потім з них вибрати нетипові
      genre_tracks: { $push: "$$ROOT" } 
    }
  },
  
  // 2. Розраховуємо поріг для кожного жанру
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$std_dev"] }]
      }
    }
  },
  
  // 3. Фільтруємо масив треків у кожному жанрі
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: {
        $filter: {
          input: "$genre_tracks",
          as: "track",
          cond: { $gt: ["$$track.audio_features.tempo", "$outlier_threshold"] }
        }
      }
    }
  },
  
  // 4. Очищаємо масив outliers, залишаючи лише потрібні поля (як у прикладі)
  {
    $project: {
      genre: 1,
      avg_tempo: 1,
      outlier_threshold: 1,
      outlier_tracks: {
        $map: {
          input: "$outlier_tracks",
          as: "track",
          in: {
            _id: "$$track._id",
            track_name: "$$track.track_name",
            popularity: "$$track.popularity",
            artists: "$$track.artists",
            audio_features: { tempo: "$$track.audio_features.tempo" }
          }
        }
      }
    }
  },
  
  // 5. (Опціонально) Відкидаємо жанри, де немає нетипових треків
  { $match: { "outlier_tracks.0": { $exists: true } } },
  { $limit: 2 } // Виводимо лише 2 жанри для прикладу, щоб не засмічувати консоль
]).toArray();

printjson(outlierTracks);


print("\n=========================================");
print("Завдання 4. Треки для фонової роботи");
print("=========================================");

const backgroundTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    "audio_features.loudness": 1,
    "audio_features.instrumentalness": 1
  }
).limit(5).toArray();

printjson(backgroundTracks);
print(`Всього знайдено фонових треків: ${db.tracks.countDocuments({
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false
})}`);