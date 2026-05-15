// Перемикаємось на потрібну базу даних
db = db.getSiblingDB("spotify");

// 1. Видаляємо стару колекцію tracks, якщо вона існує
db.tracks.drop();
print("Починаємо трансформацію даних... Це може зайняти кілька секунд.");

// Агрегаційний пайплайн
db.tracks_raw.aggregate([
  {
    // 2. Проєкція полів, 4. Формування об'єктів та обчислюваних полів
    $project: {
      _id: 0, // Виключаємо старий _id 
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      track_genre: 1,
      
      // 3. Перетворення артистів: розбиваємо по ; і обрізаємо пробіли
      artists: {
        $map: {
          input: { $split: ["$artists", ";"] },
          as: "artist",
          in: { $trim: { input: "$$artist" } }
        }
      },

      // 4. Формування вкладеного об'єкта audio_features
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature"
      },

      // Тривалість у секундах, округлена до 1 знака
      duration_sec: {
        $round: [{ $divide: ["$duration_ms", 1000] }, 1]
      },

      // Визначення рівня популярності через $switch
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" } // Все, що >= 40, але < 70 (бо >= 70 відпрацює вище)
          ],
          default: "low" // Все, що < 40
        }
      }
    }
  },
  // 5. Очищення зайвих полів:
  // Оскільки ми використовували $project і явно вказали, які поля нам потрібні,
  // старі плоскі аудіофічі та поле artists_raw (або artists у старому форматі)
  // автоматично не потраплять у результат.

  // 6. Збереження результату в колекцію tracks
  {
    $out: "tracks"
  }
]);

// 7. Перевірка результату
const count = db.tracks.countDocuments();
print(`\n✅ Трансформацію завершено. Кількість документів у колекції tracks: ${count}`);
print("\nПриклад одного документа:");
printjson(db.tracks.findOne());