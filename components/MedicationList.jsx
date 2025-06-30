// Импорт библиотек и модулей
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { GetDateRangeToDisplay } from '../service/ConvertDateTime'; // Генерация диапазона дат
import Colors from '../constant/Colors'; // Цветовая палитра приложения
import moment from 'moment'; // Библиотека для работы с датами
import { getLocalStorage } from '../service/Storage'; // Получение данных из локального хранилища
import { collection, getDocs, query, where } from 'firebase/firestore'; // Firebase Firestore
import { db } from '../config/FirebaseConfig'; // Конфигурация подключения к Firebase
import MedicationCardItem from './MedicationCardItem'; // Компонент отдельного лекарства
import EmptyState from './EmptyState'; // Компонент "пустого списка"
import { useRouter } from 'expo-router'; // Навигация между экранами
import { scheduleAllMedicationNotifications } from '../service/NotificationService'; // Настройка уведомлений

/**
 * Компонент `MedicationList` — отображает список лекарств на выбранную дату.
 *
 * Функциональность:
 * - Показывает баннер с изображением
 * - Отображает горизонтальный список дат
 * - Список лекарств на выбранную дату
 * - Кнопки действия по каждому лекарству
 * - Автоматически обновляет уведомления для всех лекарств
 */
export default function MedicationList() {
	// Состояния
	const [medList, setMedList] = useState([]); // Список лекарств
	const [dateRange, setDateRange] = useState(); // Диапазон дат (например, неделя)
	const [selectedDate, setSelectedDate] = useState(moment().format('DD/MM/YYYY')); // Выбранная дата
	const [loading, setLoading] = useState(false); // Состояние загрузки
	const router = useRouter(); // Хук навигации

	/**
	 * При монтировании компонента:
	 * 1. Генерируем диапазон дат
	 * 2. Загружаем список лекарств для текущей даты
	 */
	useEffect(() => {
		const initializeData = async () => {
			await GetDateRangeList();
			await GetMedicationList(selectedDate);
		};
		initializeData();
	}, []);

	/**
	 * Генерирует и устанавливает диапазон дат для отображения
	 * Например: следующие 7 дней начиная с сегодняшней даты
	 */
	const GetDateRangeList = () => {
		const dateRange = GetDateRangeToDisplay();
		setDateRange(dateRange);
	};

	/**
	 * Загружает список лекарств из Firebase для указанной даты
	 * @param selectedDate - строка в формате DD/MM/YYYY
	 */
	const GetMedicationList = async (selectedDate) => {
		setLoading(true);
		const user = await getLocalStorage('userDetail'); // Получаем данные пользователя
		setMedList([]);

		if (!user?.email) {
			setLoading(false);
			return;
		}

		try {
			// Запрос к Firestore: выбираем лекарства, доступные на выбранную дату
			const q = query(
				collection(db, "medication"),
				where("userEmail", "==", user.email),
				where('dates', 'array-contains', selectedDate)
			);

			const querySnapshot = await getDocs(q);
			const medications = querySnapshot.docs.map(doc => doc.data());
			setMedList(medications);

			// Обновляем уведомления для всех лекарств пользователя
			try {
				await scheduleAllMedicationNotifications();
			} catch (notificationError) {
				console.error('Ошибка при настройке уведомлений:', notificationError);
				Alert.alert('Ошибка', 'Не удалось обновить уведомления');
			}
		} catch (e) {
			console.error('Ошибка при загрузке лекарств:', e);
			Alert.alert('Ошибка', 'Не удалось загрузить список лекарств');
		} finally {
			setLoading(false);
		}
	};

	// JSX-разметка
	return (
		<View style={{ marginTop: 25 }}>
			{/* Баннер с изображением */}
			<Image
				source={require('./../assets/images/medication.jpg')}
				style={{
					width: '100%',
					height: 230,
					borderRadius: 15
				}}
			/>

			{/* Горизонтальный список дат */}
			<FlatList
				data={dateRange}
				horizontal
				style={{ marginTop: 15 }}
				showsHorizontalScrollIndicator={false}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[
							styles.dateGroup,
							{
								backgroundColor: item?.formattedDate === selectedDate
									? Colors.PRIMARY
									: Colors.LIGHT_GRAY_BORDER
							}
						]}
						onPress={() => {
							setSelectedDate(item.formattedDate);
							GetMedicationList(item.formattedDate);
						}}
					>
						<Text style={[
							styles.day,
							{ color: item?.formattedDate === selectedDate ? 'white' : 'black' }
						]}>
							{item.day}
						</Text>
						<Text style={[
							styles.date,
							{ color: item?.formattedDate === selectedDate ? 'white' : 'black' }
						]}>
							{item.date}
						</Text>
					</TouchableOpacity>
				)}
				keyExtractor={(item, index) => index.toString()}
			/>

			{/* Список лекарств или сообщение о пустом списке */}
			{medList.length > 0 ? (
				<FlatList
					data={medList}
					onRefresh={() => GetMedicationList(selectedDate)} // Обновление списка
					refreshing={loading}
					renderItem={({ item }) => (
						<TouchableOpacity
							onPress={() => router.push({
								pathname: '/action-modal',
								params: {
									...item,
									selectedDate: selectedDate
								}
							})}
						>
							<MedicationCardItem medicine={item} selectedDate={selectedDate} />
						</TouchableOpacity>
					)}
					keyExtractor={(item, index) => index.toString()}
				/>
			) : (
				<EmptyState />
			)}

			{/* Отображение текущей выбранной даты внизу экрана */}
			<View style={styles.currentDateContainer}>
				<Text style={styles.currentDateText}>
					{moment(selectedDate, 'DD/MM/YYYY').format('DD MMMM YYYY')} ({moment(selectedDate, 'DD/MM/YYYY').format('dd')})
				</Text>
			</View>
		</View>
	);
}

// Стили для компонента
const styles = StyleSheet.create({
	dateGroup: {
		padding: 15,
		backgroundColor: Colors.LIGHT_GRAY_BORDER,
		display: 'flex',
		alignItems: 'center',
		marginRight: 10,
		borderRadius: 15
	},
	day: {
		fontSize: 20,
	},
	date: {
		fontSize: 26,
		fontWeight: 'bold'
	},
	currentDateContainer: {
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: Colors.LIGHT_GRAY_BORDER,
		alignItems: 'center',
	},
	currentDateText: {
		fontSize: 16,
		color: Colors.DARK_GRAY,
		fontWeight: '500',
	}
});