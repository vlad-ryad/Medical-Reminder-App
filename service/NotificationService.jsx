// Импорт библиотек
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getLocalStorage } from './Storage';
import { db } from '../config/FirebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import moment from 'moment';

/**
 * NotificationService.js — сервис для работы с push-уведомлениями
 * 
 * Этот модуль отвечает за:
 * - регистрацию устройства для получения уведомлений,
 * - планирование напоминаний о приеме лекарств,
 * - отмену уведомлений,
 * - фоновую обработку уведомлений.
 *
 * Использует Expo Notifications API и Firebase Firestore.
 */

// Настройка обработчика уведомлений
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

// Имя фоновой задачи
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Регистрация фоновой задачи
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
	if (error) {
		console.error('Ошибка в фоновой задаче:', error);
		return;
	}

	const notificationData = data.notification.request.content.data;
	console.log('Получено уведомление в фоне:', notificationData);
});

// Регистрация для push-уведомлений
export async function registerForPushNotificationsAsync() {
	let token;

	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		});
	}

	const { status } = await Notifications.getPermissionsAsync();
	if (status !== 'granted') {
		await Notifications.requestPermissionsAsync();
	}

	if (existingStatus !== 'granted') {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== 'granted') {
		alert('Разрешение на уведомления не предоставлено!');
		return;
	}

	token = (await Notifications.getExpoPushTokenAsync()).data;
	console.log('Push токен:', token);

	// Регистрация фоновой задачи
	await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

	return token;
}

// Запланировать все уведомления для лекарств пользователя
export async function scheduleAllMedicationNotifications() {
	const user = await getLocalStorage('userDetail');
	if (!user?.email) return;

	try {
		// Отменить все предыдущие уведомления
		await Notifications.cancelAllScheduledNotificationsAsync();

		// Получить все лекарства пользователя
		const q = query(collection(db, "medication"), where("userEmail", "==", user.email));
		const querySnapshot = await getDocs(q);

		// Для каждого лекарства создать уведомления
		querySnapshot.forEach((doc) => {
			const med = doc.data();
			scheduleNotificationsForMedication(med);
		});
	} catch (e) {
		console.error('Ошибка при планировании уведомлений:', e);
	}
}

// Обновлённая функция scheduleNotificationsForMedication — поддержка times, frequency, weekdays и mealOffset
export async function scheduleNotificationsForMedication(medication) {
	if (!medication?.dates || !medication?.docId || !medication?.times || medication.times.length === 0) {
		console.log('Недостаточно данных для уведомления');
		return;
	}

	try {
		for (const dateStr of medication.dates) {
			const date = moment(dateStr, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);

			// Пропуск дней по частоте
			if (medication.frequency === 'every2' && moment().diff(date, 'days') % 2 !== 0) continue;
			if (medication.frequency === 'weekdays' && !medication.weekdays?.includes(date.format('dd'))) continue;

			for (const timeStr of medication.times) {
				const [hours, minutes] = timeStr.split(':').map(Number);
				if (isNaN(hours) || isNaN(minutes)) continue;

				let notifyTime = moment(date).hours(hours).minutes(minutes).seconds(0);

				// Смещение до/после еды
				if (medication.mealOffset && ['before', 'after'].includes(medication.when)) {
					if (medication.when === 'before') notifyTime.subtract(medication.mealOffset, 'minutes');
					if (medication.when === 'after') notifyTime.add(medication.mealOffset, 'minutes');
				}

				// Не планировать прошедшее
				if (notifyTime.isBefore(moment())) continue;

				const identifier = `med-reminder-${medication.docId}-${dateStr}-${timeStr}`;

				await Notifications.scheduleNotificationAsync({
					identifier,
					content: {
						title: 'Напоминание о приеме лекарства',
						body: `Примите ${medication.name}, ${medication.dose}`,
						data: {
							type: 'medication-reminder',
							medId: medication.docId,
							date: dateStr,
							userEmail: medication.userEmail,
							medName: medication.name,
							medDose: medication.dose,
							medWhen: medication.when
						},
						sound: true,
					},
					trigger: {
						type: 'date',
						date: notifyTime.toDate()
					},
				});

				console.log("Уведомление запланировано на:", notifyTime.format("DD.MM.YYYY HH:mm"));
			}
		}
	} catch (error) {
		console.error('Ошибка при планировании уведомлений:', error);
	}
}

// Обновленная функция cancelAllNotifications
export async function cancelAllNotifications(medId = null) {
	try {
		const user = await getLocalStorage('userDetail');
		if (!user?.email) return;

		const allScheduled = await Notifications.getAllScheduledNotificationsAsync();

		for (const notification of allScheduled) {
			const data = notification.content.data;
			if (
				data?.userEmail === user.email &&
				(!medId || data?.medId === medId)
			) {
				await Notifications.cancelScheduledNotificationAsync(notification.identifier);
			}
		}
	} catch (e) {
		console.error('Ошибка при отмене уведомлений:', e);
	}
}

// Инициализация уведомлений при запуске приложения
export async function initNotifications() {
	await registerForPushNotificationsAsync();
	await scheduleAllMedicationNotifications();
}

// Добавьте эту функцию в ваш NotificationService
export async function checkInitialNotification() {
	const response = await Notifications.getLastNotificationResponseAsync();
	return response;
}

// service/NotificationService.jsx
export async function cancelNotificationsForMedication(medId, date = null) {
	try {
		const allScheduled = await Notifications.getAllScheduledNotificationsAsync();

		for (const notification of allScheduled) {
			const notificationData = notification.request.content.data;
			if (
				notificationData.medId === medId &&
				(!date || notificationData.date === date)
			) {
				await Notifications.cancelScheduledNotificationAsync(notification.identifier);
			}
		}
	} catch (e) {
		console.error('Ошибка отмены уведомлений:', e);
		throw e;
	}
}