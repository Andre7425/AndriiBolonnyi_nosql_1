// Перемикаємось на потрібну базу даних
db = db.getSiblingDB("spotify");

print("=========================================");
print("Завдання 1. Аналіз запиту та індексація");
print("=========================================");

// Видаляємо можливі старі користувацькі індекси для чистоти експерименту
db.tracks.dropIndexes();

const query1 = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
};
const sort1 = { popularity: -1 };

print("\n--- 1.1 explain() БЕЗ індексу ---");
const explainBefore = db.tracks.find(query1).sort(sort1).explain("executionStats");
print(`Час виконання (executionTimeMillis): ${explainBefore.executionStats.executionTimeMillis} мс`);
print(`Документів повернуто (nReturned): ${explainBefore.executionStats.nReturned}`);
print(`Переглянуто документів у базі (totalDocsExamined): ${explainBefore.executionStats.totalDocsExamined}`);
print(`Стадія (stage): ${explainBefore.queryPlanner.winningPlan.stage}`);
// Якщо stage = SORT, то під ним буде COLLSCAN (Collection Scan)
if (explainBefore.queryPlanner.winningPlan.inputStage) {
    print(`Вкладена стадія: ${explainBefore.queryPlanner.winningPlan.inputStage.stage}`);
}

print("\n--- 1.2 Створення індексу ---");
// Використовуємо правило ESR (Equality, Sort, Range) для ідеального індексу:
// 1. Точний збіг (Equality): track_genre
// 2. Сортування (Sort): popularity
// 3. Діапазон (Range): danceability
db.tracks.createIndex({ 
    track_genre: 1, 
    popularity: -1, 
    "audio_features.danceability": 1 
});
print("✅ Індекс успішно створено.");

print("\n--- 1.3 explain() З індексом ---");
const explainAfter = db.tracks.find(query1).sort(sort1).explain("executionStats");
print(`Час виконання (executionTimeMillis): ${explainAfter.executionStats.executionTimeMillis} мс`);
print(`Документів повернуто (nReturned): ${explainAfter.executionStats.nReturned}`);
print(`Переглянуто документів у базі (totalDocsExamined): ${explainAfter.executionStats.totalDocsExamined}`);

// Виводимо структуру плану, щоб показати використання індексу (IXSCAN)
print("\nФрагмент Winning Plan (для перевірки індексу):");
printjson(explainAfter.queryPlanner.winningPlan.inputStage || explainAfter.queryPlanner.winningPlan);


print("\n=========================================");
print("Завдання 2. Індекс для інших полів");
print("=========================================");

// Створюємо складений індекс. 
// Спочатку ставимо поле з точним збігом (explicit), потім діапазони.
db.tracks.createIndex({
  explicit: 1,
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
});
print("✅ Складений індекс для фонової музики створено.");

// Перевіряємо його роботу нашим запитом із Завдання 4 (Частина 2)
const query2 = {
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
};

const explainTask2 = db.tracks.find(query2).explain("executionStats");
print("\nСтадія пошуку (має бути FETCH -> IXSCAN):");
print(`Основна стадія: ${explainTask2.queryPlanner.winningPlan.stage}`);
if (explainTask2.queryPlanner.winningPlan.inputStage) {
    print(`Вкладена стадія: ${explainTask2.queryPlanner.winningPlan.inputStage.stage}`);
    print(`Використаний індекс: ${explainTask2.queryPlanner.winningPlan.inputStage.indexName}`);
}