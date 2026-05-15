// Перемикаємось на потрібну базу даних
db = db.getSiblingDB("spotify");

print("=========================================");
print("Завдання 1. Топ-10 виконавців за середньою популярністю");
print("=========================================");

const topArtists = db.tracks.aggregate([
  // 1. Розбиваємо масив артистів (бо трек може мати кількох виконавців)
  { $unwind: "$artists" },
  
  // 2. Групуємо по артисту
  {
    $group: {
      _id: "$artists",
      avg_popularity: { $avg: "$popularity" },
      track_count: { $sum: 1 }
    }
  },
  
  // 3. Залишаємо лише тих, у кого мінімум 5 треків
  { $match: { track_count: { $gte: 5 } } },
  
  // 4. Сортуємо за середньою популярністю за спаданням
  { $sort: { avg_popularity: -1 } },
  
  // 5. Беремо топ-10
  { $limit: 10 },
  
  // 6. Форматуємо вивід
  {
    $project: {
      _id: 0,
      artist: "$_id",
      avg_popularity: { $round: ["$avg_popularity", 1] },
      track_count: 1
    }
  }
]).toArray();

printjson(topArtists);


print("\n=========================================");
print("Завдання 2. Розподіл треків за настроєм");
print("=========================================");

const moodDistribution = db.tracks.aggregate([
  // 1. Визначаємо настрій через $switch (поріг 0.5)
  {
    $addFields: {
      mood: {
        $switch: {
          branches: [
            { case: { $and: [ { $gte: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] } ] }, then: "happy" },
            { case: { $and: [ { $lt: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] } ] }, then: "angry" },
            { case: { $and: [ { $gte: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] } ] }, then: "calm" }
          ],
          // Якщо нічого не підійшло (valence < 0.5 та energy < 0.5)
          default: "sad" 
        }
      }
    }
  },
  
  // 2. Групуємо за настроєм і рахуємо кількість
  {
    $group: {
      _id: "$mood",
      track_count: { $sum: 1 }
    }
  },
  
  // 3. Форматуємо і сортуємо (від найпопулярнішого настрою до найменш)
  {
    $project: {
      _id: 0,
      mood: "$_id",
      track_count: 1
    }
  },
  { $sort: { track_count: -1 } }
]).toArray();

printjson(moodDistribution);


print("\n=========================================");
print("Завдання 3. Найбільш «танцювальний» жанр");
print("=========================================");

const danceableGenres = db.tracks.aggregate([
  // 1. Групуємо за жанром та рахуємо середні показники
  {
    $group: {
      _id: "$track_genre",
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" },
      track_count: { $sum: 1 }
    }
  },
  
  // 2. Фільтруємо жанри з кількістю треків < 100
  { $match: { track_count: { $gte: 100 } } },
  
  // 3. Сортуємо за танцювальністю за спаданням
  { $sort: { avg_danceability: -1 } },
  
  // 4. Форматуємо вивід (округлюємо до 3 знаків для точності)
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 3] },
      avg_energy: { $round: ["$avg_energy", 3] },
      avg_valence: { $round: ["$avg_valence", 3] },
      track_count: 1
    }
  },
  
  // Беремо топ-10 найбільш танцювальних жанрів для зручного перегляду
  { $limit: 10 } 
]).toArray();

printjson(danceableGenres);