import AsyncStorage from "@react-native-async-storage/async-storage"

/**
 * Storage.js — модуль для работы с локальным хранилищем на устройстве
 * 
 * Предоставляет функции:
 * - сохранения данных (`setLocalStorage`),
 * - получения данных (`getLocalStorage`),
 * - очистки хранилища (`RemoveLocalStorage`)
 *
 * Использует `@react-native-async-storage/async-storage` как основное хранилище.
 */

export const setLocalStorage = async (key, value) => {
	await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const getLocalStorage = async (key, value) => {
	const result = await AsyncStorage.getItem(key);
	return JSON.parse(result);
}

export const RemoveLocalStorage = async () => {
	try {
		await AsyncStorage.clear();
		console.log('Все данные хранилища очищены');
	} catch (e) {
		console.error('Ошибка при очистке хранилища:', e);
		throw e; // Пробрасываем ошибку для обработки в компоненте
	}
};