// Импорт необходимых модулей из Firebase SDK
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentSingleTabManager
} from 'firebase/firestore';
/**
 * Конфигурация Firebase для подключения к проекту
 * Эти данные уникальны для  приложения (ключи хранятся в безопасности Firebase)
 */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: "AIzaSyDsgczYfzRUZGeV-7roNnqeYutoGTlqF-k",
	authDomain: "med-app-990d4.firebaseapp.com",
	projectId: "med-app-990d4",
	storageBucket: "med-app-990d4.firebasestorage.app",
	messagingSenderId: "304782089862",
	appId: "1:304782089862:web:5a6e3c11ad83ae0ac47b07",
	measurementId: "G-KTLTXHEDSS"
};
// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);


const db = initializeFirestore(app, {
	localCache: persistentLocalCache(),
	persistence: persistentSingleTabManager(),
});

// Инициализация сервисов

const auth = getAuth(app);
//const db = getFirestore(app);


// Экспортируем инициализированные сервисы для использования в других частях приложения
export { auth, db, storage };

/**
 * Функция `setPushTokenForUser` — сохраняет Expo Push Token пользователя в Firestore.
 * Это необходимо для отправки push-уведомлений через Firebase Cloud Messaging (FCM).
 *
 * @async
 * @function setPushTokenForUser
 * @returns {Promise<void>} — ничего не возвращает, но может выбросить ошибку
 */

export const setPushTokenForUser = async () => {
	const user = await getLocalStorage('userDetail');
	if (!user) return;

	const { email } = user;
	const { status } = await Notifications.requestPermissionsAsync();

	if (status !== 'granted') return;

	const token = (await Notifications.getExpoPushTokenAsync()).data;

	await setDoc(doc(db, "users", email), { pushToken: token }, { merge: true });
};