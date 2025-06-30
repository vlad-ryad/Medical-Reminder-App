// Импорт необходимых библиотек и модулей
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	Alert,
	StyleSheet
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router'; // Для работы с URL-параметрами и навигацией
import Colors from '../../constant/Colors'; // Цветовая палитра приложения
import MedicationCardItem from '../../components/MedicationCardItem'; // Компонент для отображения информации о лекарстве
import Ionicons from '@expo/vector-icons/Ionicons'; // Иконки
import { db } from '../../config/FirebaseConfig'; // Подключение к Firebase Firestore
import { arrayUnion, doc, updateDoc, getDoc } from 'firebase/firestore'; // Методы Firebase
import moment from 'moment'; // Работа с датами

/**
 * Компонент `MedicationActionModal` — модальное окно подтверждения приёма лекарства.
 *
 * Основные функции:
 * - Отображает информацию о лекарстве
 * - Позволяет пользователю отметить приём как "Принято" или "Пропущено"
 * - Сохраняет результат в Firebase
 */
export default function MedicationActionModal() {
	const params = useLocalSearchParams(); // Получаем параметры из URL (например, ID лекарства)
	const router = useRouter(); // Навигация между экранами
	const [medicine, setMedicine] = useState(null); // Данные о лекарстве
	const [loading, setLoading] = useState(true); // Состояние загрузки

	/**
	 * Загружает данные о лекарстве из Firebase по его ID
	 */
	useEffect(() => {
		const loadMedication = async () => {
			if (!params.docId) {
				router.back();
				return;
			}
			try {
				setLoading(true);

				// Искусственная задержка для более реалистичной анимации загрузки
				await new Promise((resolve) => setTimeout(resolve, 500));

				const docRef = doc(db, 'medication', params.docId);
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					const medicineData = docSnap.data();
					setMedicine({
						...medicineData,
						selectedDate: params.selectedDate || moment().format('L'),
						currentReminder: params.reminder || getCurrentReminderTime(medicineData),
					});
				} else {
					Alert.alert('Ошибка', 'Лекарство не найдено');
					router.back();
				}
			} catch (error) {
				console.error('Ошибка загрузки:', error);
				Alert.alert('Ошибка', 'Не удалось загрузить данные');
				router.back();
			} finally {
				setLoading(false);
			}
		};
		loadMedication();
	}, [params.docId]);

	/**
	 * Возвращает актуальное время напоминания на основе новых данных
	 * @param medicineData - объект с данными о лекарстве
	 */
	const getCurrentReminderTime = (medicineData) => {
		if (params.reminder) {
			return params.reminder;
		}

		if (medicineData?.times && medicineData.times.length > 0) {
			const currentTime = moment().format('HH:mm');
			const upcomingTime = medicineData.times.find(time => time > currentTime);
			return upcomingTime || medicineData.times[0];
		}

		if (medicineData?.reminder) {
			return medicineData.reminder;
		}

		return moment().format('HH:mm');
	};

	/**
	 * Обновляет статус приема лекарства в Firebase
	 * @param status - строка ('Taken' или 'Missed')
	 */
	const UpdateActionStatus = async (status) => {
		if (!params.docId || !medicine) return;

		try {
			const docRef = doc(db, 'medication', params.docId);

			const actionData = {
				status: status,
				time: moment().format('LT'),
				date: medicine.selectedDate,
				reminderTime: medicine.currentReminder,
				actualTime: moment().format('HH:mm'),
				scheduledTime: medicine.currentReminder,
			};

			await updateDoc(docRef, {
				action: arrayUnion(actionData), // Добавляем действие в массив действий
			});

			const statusText = status === 'Taken' ? 'Принято' : 'Пропущено';
			Alert.alert(statusText, 'Ответ сохранен!', [
				{
					text: 'Ok',
					onPress: () => router.replace('/(tabs)'), // Перенаправление на главный экран
				},
			]);
		} catch (e) {
			console.error("Ошибка:", e);
			Alert.alert('Ошибка', 'Не удалось сохранить статус приема');
		}
	};

	/**
	 * Возвращает текущее время напоминания
	 */
	const getReminderTime = () => {
		return medicine?.currentReminder || moment().format('HH:mm');
	};

	/**
	 * Возвращает описание времени приёма (например, "Утром", "После обеда")
	 */
	const getTimeDescription = () => {
		if (!medicine?.whenToTake || medicine.whenToTake.length === 0) {
			return null;
		}

		// Сопоставление времён с описанием
		const timeMapping = {
			'08:00': 'Утром',
			'12:00': 'Перед обедом',
			'13:30': 'После обеда',
			'15:00': 'Днем',
			'19:00': 'Вечером',
			'19:30': 'Перед ужином',
			'20:30': 'После ужина',
			'22:00': 'Перед сном'
		};

		const currentTime = getReminderTime();
		const description = Object.entries(timeMapping).find(([time]) => time === currentTime);

		if (description) {
			return description[1];
		}

		// Если точное совпадение не найдено, ищем в whenToTake
		return medicine.whenToTake.find(item =>
			medicine.times && medicine.times.includes(currentTime)
		) || null;
	};

	/**
	 * Возвращает информацию о частоте приёма лекарства
	 */
	const getFrequencyInfo = () => {
		if (!medicine?.frequency) return null;

		switch (medicine.frequency) {
			case 'daily':
				return 'Каждый день';
			case 'every2':
				return 'Через день';
			case 'weekdays':
				if (medicine.weekdays && medicine.weekdays.length > 0) {
					return `По дням: ${medicine.weekdays.join(', ')}`;
				}
				return 'По дням недели';
			default:
				return null;
		}
	};

	// Экран загрузки
	if (loading || !medicine) {
		return (
			<View style={[styles.container, { justifyContent: 'center' }]}>
				<Text>Загрузка...</Text>
			</View>
		);
	}

	const timeDescription = getTimeDescription();
	const frequencyInfo = getFrequencyInfo();

	// JSX-разметка
	return (
		<View style={styles.container}>
			{/* GIF-анимация */}
			<Image
				source={require('./../../assets/images/notification.gif')}
				style={{ width: 120, height: 120 }}
			/>

			{/* Выбранная дата */}
			<Text style={styles.dateText}>{medicine.selectedDate}</Text>

			{/* Время напоминания */}
			<Text style={styles.timeText}>
				{getReminderTime()}
			</Text>

			{/* Описание времени приёма */}
			{timeDescription && (
				<Text style={styles.timeDescription}>
					{timeDescription}
				</Text>
			)}

			{/* Информация о частоте приёма */}
			{frequencyInfo && (
				<Text style={styles.frequencyText}>
					{frequencyInfo}
				</Text>
			)}

			{/* Карточка лекарства */}
			<MedicationCardItem medicine={medicine} />

			{/* Дозировка */}
			{medicine.dose && (
				<Text style={styles.doseInfo}>
					Дозировка: {medicine.dose}
				</Text>
			)}

			{/* Кнопки действий */}
			<View style={styles.btnContainer}>
				<TouchableOpacity
					style={styles.closeBtn}
					onPress={() => UpdateActionStatus('Missed')} // Пропустить
				>
					<Ionicons name="close-outline" size={24} color="red" />
					<Text style={{ fontSize: 20, color: 'red' }}>Пропустить</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.successBtn}
					onPress={() => UpdateActionStatus('Taken')} // Принять
				>
					<Ionicons name="checkmark-outline" size={24} color="white" />
					<Text style={{ fontSize: 20, color: 'white' }}>Принять</Text>
				</TouchableOpacity>
			</View>

			{/* Кнопка закрытия модального окна */}
			<TouchableOpacity
				style={styles.closeModal}
				onPress={() => router.back()}
			>
				<Ionicons name="close-circle" size={44} color={Colors.GRAY} />
			</TouchableOpacity>
		</View>
	);
}

// Стили компонента
const styles = StyleSheet.create({
	container: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		height: '100%',
	},
	dateText: {
		fontSize: 18,
		color: Colors.GRAY,
		marginBottom: 2,
	},
	timeText: {
		fontSize: 38,
		fontWeight: 'bold',
		color: Colors.PRIMARY,
		marginBottom: 5,
	},
	timeDescription: {
		fontSize: 17,
		color: Colors.PRIMARY,
		fontWeight: '500',
		marginBottom: 5,
	},
	frequencyText: {
		fontSize: 15,
		color: Colors.GRAY,
		marginBottom: 10,
	},
	doseInfo: {
		fontSize: 16,
		color: Colors.GRAY,
		marginTop: 10,
		textAlign: 'center',
	},
	btnContainer: {
		flexDirection: 'row',
		gap: 15,
		marginTop: 15,
	},
	closeBtn: {
		padding: 10,
		flexDirection: 'row',
		gap: 4,
		borderWidth: 1,
		alignItems: 'center',
		borderColor: 'red',
		borderRadius: 10,
		minWidth: 120,
		justifyContent: 'center',
	},
	successBtn: {
		padding: 12,
		flexDirection: 'row',
		gap: 10,
		backgroundColor: Colors.GREEN,
		alignItems: 'center',
		borderRadius: 10,
		minWidth: 120,
		justifyContent: 'center',
	},
	closeModal: {
		position: 'absolute',
		bottom: 40,
	},
});