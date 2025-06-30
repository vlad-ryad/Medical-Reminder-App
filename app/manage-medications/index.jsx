// Импорт необходимых модулей и компонентов
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	Image,
	Alert
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router'; // Навигация между экранами
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
	deleteDoc
} from 'firebase/firestore'; // Firebase Firestore
import { db } from '../../config/FirebaseConfig'; // Подключение к базе данных
import { getLocalStorage } from '../../service/Storage'; // Получение данных пользователя
import Colors from '../../constant/Colors'; // Цветовая палитра
import moment from 'moment'; // Работа с датами
import 'moment/locale/ru'; // Локализация на русский язык
import Ionicons from '@expo/vector-icons/Ionicons'; // Иконки

moment.locale('ru'); // Установка локали по умолчанию

/**
 * Компонент `ManageMedications` — управление списком лекарств.
 * Позволяет:
 * - просматривать активные лекарства
 * - редактировать или удалять лекарства
 * - добавлять новые лекарства
 */
export default function ManageMedications() {
	const [medications, setMedications] = useState([]); // Список лекарств
	const [loading, setLoading] = useState(true); // Состояние загрузки
	const router = useRouter(); // Хук навигации

	/**
	 * При фокусировке на экране (возврат к нему) — обновляем список лекарств
	 */
	useFocusEffect(
		React.useCallback(() => {
			fetchMedications();
		}, [])
	);

	/**
	 * Загружает список лекарств из Firebase
	 * Фильтрует только те, что актуальны на сегодняшнюю дату
	 */
	const fetchMedications = async () => {
		try {
			setLoading(true);
			const user = await getLocalStorage('userDetail');
			if (!user) return;

			const q = query(collection(db, "medication"), where("userEmail", "==", user.email));
			const snapshot = await getDocs(q);

			const today = moment().startOf('day');
			const activeMeds = [];

			snapshot.forEach(doc => {
				const data = doc.data();

				if (data.dates && data.dates.length > 0) {
					// Фильтруем только будущие даты
					const futureDates = data.dates.filter(dateStr => {
						const date = moment(dateStr, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);
						return date.isSameOrAfter(today);
					});

					if (futureDates.length > 0) {
						// Сортируем даты и добавляем информацию о периоде
						const sortedDates = [...futureDates].sort((a, b) =>
							moment(a, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).unix() -
							moment(b, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).unix()
						);

						const startDate = sortedDates[0];
						const endDate = sortedDates[sortedDates.length - 1];

						activeMeds.push({
							id: doc.id,
							...data,
							dates: futureDates,
							startDate,
							endDate,
							formattedPeriod: `${moment(startDate, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY')} - ${moment(endDate, ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY')}`
						});
					}
				}
			});

			setMedications(activeMeds);
		} catch (error) {
			Alert.alert('Ошибка', 'Не удалось загрузить лекарства');
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Удаление лекарства из Firebase
	 * @param id - ID документа в Firestore
	 * @param name - название лекарства для подтверждения
	 */
	const handleDelete = async (id, name) => {
		Alert.alert(
			'Удаление',
			`Вы уверены, что хотите полностью удалить "${name}"?`,
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Удалить',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteDoc(doc(db, "medication", id));
							setMedications(prev => prev.filter(med => med.id !== id));
							Alert.alert('Успешно', 'Лекарство удалено');
						} catch (error) {
							console.error('Ошибка при удалении:', error);
							Alert.alert('Ошибка', 'Не удалось удалить лекарство');
						}
					}
				}
			]
		);
	};

	/**
	 * Переход к форме редактирования лекарства
	 * @param medication - объект с данными о лекарстве
	 */
	const handleEdit = (medication) => {
		router.push({
			pathname: '/edit-medication',
			params: {
				...medication,
				dates: JSON.stringify(medication.dates),
				onUpdate: () => fetchMedications()
			}
		});
	};

	/**
	 * Форматирует частоту приёма для отображения
	 * @param frequency - тип частоты ('daily', 'every2', 'weekdays')
	 * @param weekdays - массив дней недели
	 */
	const formatFrequency = (frequency, weekdays) => {
		switch (frequency) {
			case 'daily':
				return 'Каждый день';
			case 'every2':
				return 'Через день';
			case 'weekdays':
				return weekdays && weekdays.length > 0
					? `По дням: ${weekdays.join(', ')}`
					: 'По дням недели';
			default:
				return 'Каждый день';
		}
	};

	/**
	 * Форматирует описание времени приёма лекарства
	 * @param when - старое поле (например, before/after)
	 * @param whenToTake - новое поле с массивом временных меток
	 * @param mealOffset - время до/после еды в минутах
	 */
	const formatWhenToTake = (when, whenToTake, mealOffset) => {
		if (whenToTake && Array.isArray(whenToTake) && whenToTake.length > 0) {
			return whenToTake.join(', ');
		}

		if (when === 'before' && mealOffset) {
			return `За ${mealOffset} мин до еды`;
		} else if (when === 'after' && mealOffset) {
			return `Через ${mealOffset} мин после еды`;
		}
		return when;
	};

	/**
	 * Форматирует время приёма
	 * @param times - массив времён в формате "HH:mm"
	 */
	const formatTimes = (times) => {
		if (!times || times.length === 0) return '';
		return times.join(', ');
	};

	// Экран загрузки
	if (loading) {
		return (
			<View style={styles.loading}>
				<ActivityIndicator size="large" color={Colors.PRIMARY} />
			</View>
		);
	}

	// JSX-разметка
	return (
		<View style={styles.container}>
			{/* Заголовок */}
			<View style={styles.header}>
				<Text style={styles.title}>Управление лекарствами</Text>
			</View>

			{/* Список лекарств */}
			<FlatList
				data={medications}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={
					<Text style={styles.empty}>Нет активных лекарств</Text>
				}
				renderItem={({ item }) => (
					<View style={styles.medItem}>
						{/* Информация о лекарстве */}
						<View style={styles.medHeader}>
							<Image
								source={item.type?.icon}
								style={styles.medIcon}
							/>
							<View style={styles.medInfo}>
								<Text style={styles.medName}>{item.name}</Text>

								{/* Дозировка */}
								<View style={styles.detailRow}>
									<Ionicons name="eyedrop-outline" size={14} color={Colors.GRAY} />
									<Text style={styles.medDetails}>{item.dose}</Text>
								</View>

								{/* Время приёма (описание) */}
								<View style={styles.detailRow}>
									<Ionicons name="time-outline" size={14} color={Colors.GRAY} />
									<Text style={styles.medDetails}>
										{formatWhenToTake(item.when, item.whenToTake, item.mealOffset)}
									</Text>
								</View>

								{/* Конкретное время приёма */}
								{item.times && item.times.length > 0 && (
									<View style={styles.detailRow}>
										<Ionicons name="alarm-outline" size={14} color={Colors.GRAY} />
										<Text style={styles.medDetails}>
											{formatTimes(item.times)}
										</Text>
									</View>
								)}

								{/* Частота приёма */}
								<View style={styles.detailRow}>
									<Ionicons name="repeat-outline" size={14} color={Colors.GRAY} />
									<Text style={styles.medDetails}>
										{formatFrequency(item.frequency, item.weekdays)}
									</Text>
								</View>

								{/* Период действия */}
								<View style={styles.detailRow}>
									<Ionicons name="calendar-outline" size={14} color={Colors.PRIMARY} />
									<Text style={styles.medPeriod}>{item.formattedPeriod}</Text>
								</View>
							</View>
						</View>

						{/* Кнопки действий: редактировать / удалить */}
						<View style={styles.actions}>
							<TouchableOpacity
								style={styles.editBtn}
								onPress={() => handleEdit(item)}
							>
								<Ionicons name="create-outline" size={20} color="white" />
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.deleteBtn}
								onPress={() => handleDelete(item.id, item.name)}
							>
								<Ionicons name="trash-outline" size={20} color="white" />
							</TouchableOpacity>
						</View>
					</View>
				)}
			/>

			{/* Кнопка "Назад" */}
			<TouchableOpacity
				style={styles.backButton}
				onPress={() => router.back()}
			>
				<Ionicons name="arrow-back" size={24} color={Colors.PRIMARY} />
				<Text style={styles.backButtonText}>Назад</Text>
			</TouchableOpacity>

			{/* Кнопка "Добавить" */}
			<TouchableOpacity
				style={styles.addButton}
				onPress={() => router.push('/add-new-medication')}
			>
				<Ionicons name="add" size={24} color="white" />
			</TouchableOpacity>
		</View>
	);
}

// Стили
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 15,
		backgroundColor: 'white'
	},
	header: {
		marginBottom: 20,
		alignItems: 'center',
		marginTop: 35,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: Colors.BLACK,
		textAlign: 'center'
	},
	medItem: {
		backgroundColor: 'white',
		padding: 15,
		borderRadius: 12,
		marginBottom: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start'
	},
	medHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		flex: 1
	},
	medInfo: {
		flex: 1,
		marginLeft: 12
	},
	medIcon: {
		width: 40,
		height: 40,
		borderRadius: 8
	},
	medName: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.BLACK,
		marginBottom: 8
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4
	},
	medDetails: {
		color: Colors.GRAY,
		fontSize: 14,
		marginLeft: 6,
		flex: 1,
		flexWrap: 'wrap'
	},
	medPeriod: {
		color: Colors.PRIMARY,
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 6,
		flex: 1
	},
	actions: {
		flexDirection: 'column',
		gap: 8,
		marginLeft: 10
	},
	editBtn: {
		backgroundColor: Colors.PRIMARY,
		padding: 8,
		borderRadius: 6,
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'center'
	},
	deleteBtn: {
		backgroundColor: Colors.RED,
		padding: 8,
		borderRadius: 6,
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'center'
	},
	empty: {
		textAlign: 'center',
		marginTop: 50,
		fontSize: 16,
		color: Colors.GRAY
	},
	loading: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: 'white'
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 20,
		padding: 10
	},
	backButtonText: {
		color: Colors.PRIMARY,
		marginLeft: 5,
		fontSize: 16
	},
	addButton: {
		position: 'absolute',
		right: 20,
		bottom: 20,
		backgroundColor: Colors.PRIMARY,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	}
});