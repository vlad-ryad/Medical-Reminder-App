// Импорт необходимых библиотек и компонентов
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../constant/Colors';
import { TypeList, WhenToTake, DoseTypes } from '../constant/Options';
import { Picker } from '@react-native-picker/picker';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { FormatDate, formatDateForText, formatTime, getDatesRange } from '../service/ConvertDateTime';
import { db } from '../config/FirebaseConfig';
import { getLocalStorage } from '../service/Storage';
import { setDoc, doc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { scheduleNotificationsForMedication } from '../service/NotificationService';

/**
 * Компонент AddMedForm - форма для добавления нового лекарства.
 * Позволяет пользователю ввести:
 * - Название лекарства
 * - Тип лекарства (таблетки, капли и т.д.)
 * - Дозировку и единицы измерения
 * - Период приема (дата начала и окончания)
 * - Время приема (одно или несколько)
 * - Частоту приема (ежедневно, через день, по дням недели)
 * - Связь с приемами пищи (до/после еды)
 */
export default function AddMedForm() {
	// Состояния формы
	const [formData, setFormData] = useState({
		doseValue: '',      // Числовое значение дозировки
		doseType: 'таб.',   // Тип дозировки (таблетки, мл и т.д.)
		dose: '',           // Полная строка дозировки (значение + тип)
	});

	// Состояния для отображения/скрытия пикеров дат и времени
	const [showStartDate, setShowStartDate] = useState(false);
	const [showEndDate, setShowEndDate] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);

	// Состояния загрузки и управления данными
	const [loading, setLoading] = useState(false);       // Флаг загрузки
	const [times, setTimes] = useState([]);              // Массив выбранных времен приема
	const [timePickerVisible, setTimePickerVisible] = useState(false); // Видимость пикера времени
	const [selectedTime, setSelectedTime] = useState(new Date()); // Выбранное время
	const [frequency, setFrequency] = useState('daily'); // Частота приема (по умолчанию - ежедневно)
	const [weekdays, setWeekdays] = useState([]);        // Выбранные дни недели (если частота "по дням недели")
	const [mealOffset, setMealOffset] = useState('30');   // Временной интервал до/после еды (в минутах)
	const [selectedWhenToTake, setSelectedWhenToTake] = useState([]); // Выбранные периоды приема (утро, день и т.д.)

	const router = useRouter();          // Навигационный хук
	const flatListRef = useRef(null);   // Референс для FlatList (горизонтального списка типов лекарств)

	// Маппинг периодов приема на конкретное время
	const timeMapping = {
		'Утром': '08:00',
		'Перед обедом': '12:00',
		'После обеда': '13:30',
		'Днем': '15:00',
		'Вечером': '19:00',
		'Перед ужином': '19:30',
		'После ужина': '20:30',
		'Перед сном': '22:00'
	};

	// Эффект для автоматического формирования строки дозировки
	useEffect(() => {
		if (formData.doseValue && formData.doseType) {
			onHandleInputChange('dose', `${formData.doseValue} ${formData.doseType}`);
		}
	}, [formData.doseValue, formData.doseType]);

	// Функции для прокрутки горизонтального списка типов лекарств
	const scrollLeft = () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
	const scrollRight = () => flatListRef.current?.scrollToEnd({ animated: true });

	/**
	 * Обработчик изменения полей формы
	 * @param {string} field - имя поля
	 * @param {string} value - новое значение
	 */
	const onHandleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	/**
	 * Валидация формы перед сохранением
	 * @returns {boolean} true если форма валидна, false если есть ошибки
	 */
	const validateForm = () => {
		const { name, type, dose, startDate, endDate } = formData;
		if (!name || !type || !dose || !startDate || !endDate || times.length === 0) {
			Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля и добавьте хотя бы одно время приёма');
			return false;
		}
		return true;
	};

	/**
	 * Сохранение лекарства в Firebase и настройка уведомлений
	 */
	const SaveMedication = async () => {
		if (!validateForm()) return;

		// Генерация уникального ID для документа
		const docId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const user = await getLocalStorage('userDetail');

		// Получение всех дат в указанном диапазоне
		const dates = getDatesRange(formData?.startDate, formData?.endDate);

		setLoading(true);
		try {
			// Формирование объекта данных для сохранения
			const docData = {
				...formData,
				userEmail: user?.email,       // Email пользователя
				docId,                       // Уникальный ID
				dates,                        // Массив всех дат приема
				times,                        // Массив времен приема
				frequency,                    // Частота приема
				weekdays: frequency === 'weekdays' ? weekdays : [], // Дни недели (если нужно)
				mealOffset: ['before', 'after'].includes(formData?.when) ? parseInt(mealOffset) : null, // Интервал до/после еды
				whenToTake: selectedWhenToTake, // Периоды приема
			};

			// Сохранение в Firestore
			await setDoc(doc(db, 'medication', docId), docData);

			// Настройка уведомлений
			await scheduleNotificationsForMedication(docData);

			// Уведомление об успехе и переход на главный экран
			Alert.alert('Успешно', 'Лекарство успешно добавлено', [
				{ text: 'OK', onPress: () => router.replace('/(tabs)') }
			]);
		} catch (e) {
			console.error(e);
			Alert.alert('Ошибка', 'Не удалось сохранить лекарство');
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Переключение выбранного дня недели
	 * @param {string} day - день недели ('Пн', 'Вт' и т.д.)
	 */
	const toggleWeekday = (day) => {
		setWeekdays(prev =>
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
		);
	};

	/**
	 * Переключение выбранного периода приема (утро, день и т.д.)
	 * @param {string} item - период приема
	 */
	const toggleWhenToTake = (item) => {
		setSelectedWhenToTake(prev =>
			prev.includes(item)
				? prev.filter(i => i !== item)
				: [...prev, item]
		);

		// Автоматически добавляем/удаляем соответствующее время из маппинга
		const mappedTime = timeMapping[item];
		if (mappedTime) {
			setTimes(prev =>
				prev.includes(mappedTime)
					? prev.filter(t => t !== mappedTime)
					: [...prev, mappedTime].sort()
			);
		}
	};

	/**
	 * Удаление времени приема
	 * @param {string} timeToRemove - время для удаления в формате 'HH:mm'
	 */
	const removeTime = (timeToRemove) => {
		setTimes(times.filter(time => time !== timeToRemove));
	};

	return (
		<View style={styles.container}>
			{/* Заголовок формы */}
			<Text style={styles.header}>Добавить лекарство</Text>

			{/* Поле ввода названия лекарства */}
			<View style={styles.inputGroup}>
				<Ionicons name="medkit-outline" size={24} style={styles.icon} />
				<TextInput
					placeholder="Название лекарства"
					style={styles.textInput}
					onChangeText={(value) => onHandleInputChange('name', value)}
				/>
			</View>

			{/* Горизонтальный список типов лекарств */}
			<View style={styles.typeListContainer}>
				{/* Кнопка прокрутки влево */}
				<TouchableOpacity style={styles.scrollButton} onPress={scrollLeft}>
					<Ionicons name="chevron-back" size={24} color={Colors.PRIMARY} />
				</TouchableOpacity>

				{/* Список типов лекарств */}
				<FlatList
					ref={flatListRef}
					data={TypeList}
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.typeList}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={[
								styles.typeButton,
								{ backgroundColor: item.name === formData?.type?.name ? Colors.PRIMARY : 'white' },
							]}
							onPress={() => onHandleInputChange('type', item)}
						>
							<Text style={{ color: item.name === formData?.type?.name ? 'white' : 'black' }}>
								{item.name}
							</Text>
						</TouchableOpacity>
					)}
					keyExtractor={(item) => item.name}
				/>

				{/* Кнопка прокрутки вправо */}
				<TouchableOpacity style={styles.scrollButton} onPress={scrollRight}>
					<Ionicons name="chevron-forward" size={24} color={Colors.PRIMARY} />
				</TouchableOpacity>
			</View>

			{/* Группа полей для дозировки */}
			<View style={styles.doseContainer}>
				{/* Поле ввода количества */}
				<View style={[styles.inputGroup, { flex: 2.1 }]}>
					<Ionicons name="eyedrop-outline" size={24} style={styles.icon} />
					<TextInput
						placeholder="Количество"
						style={styles.doseInput}
						keyboardType="numeric"
						value={formData.doseValue}
						onChangeText={(value) => setFormData(prev => ({
							...prev,
							doseValue: value.replace(/[^0-9]/g, '') // Разрешаем только цифры
						}))}
					/>
				</View>

				{/* Выпадающий список единиц измерения */}
				<View style={[styles.inputGroup, { flex: 1.6, marginLeft: 2 }]}>
					<Picker
						selectedValue={formData.doseType}
						onValueChange={(value) => setFormData(prev => ({ ...prev, doseType: value }))}
						style={styles.dosePicker}
						dropdownIconColor={Colors.PRIMARY}
					>
						{DoseTypes.map((item, index) => (
							<Picker.Item label={item} value={item} key={index} />
						))}
					</Picker>
				</View>
			</View>

			{/* Секция "Когда принимать" */}
			<View style={styles.inputGroup}>
				<Ionicons name="time-outline" size={24} style={styles.icon} />
				<Text style={styles.label}>Когда принимать:</Text>
			</View>

			{/* Список периодов приема (утро, день и т.д.) */}
			<View style={styles.whenToTakeContainer}>
				{WhenToTake.filter(item => item !== 'Когда принимать').map((item, index) => (
					<TouchableOpacity
						key={index}
						style={[
							styles.whenToTakeItem,
							selectedWhenToTake.includes(item) && styles.whenToTakeItemSelected
						]}
						onPress={() => toggleWhenToTake(item)}
					>
						<Text style={[
							styles.whenToTakeText,
							selectedWhenToTake.includes(item) && styles.whenToTakeTextSelected
						]}>
							{item}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Группа полей для дат начала и окончания приема */}
			<View style={styles.dateGroup}>
				{/* Поле выбора даты начала */}
				<TouchableOpacity style={[styles.inputGroup, styles.flex1]} onPress={() => setShowStartDate(true)}>
					<Ionicons name="calendar-outline" size={24} style={styles.icon} />
					<Text style={styles.text}>{formatDateForText(formData?.startDate) ?? 'Дата начала'}</Text>
				</TouchableOpacity>
				{showStartDate && (
					<RNDateTimePicker
						minimumDate={new Date()} // Нельзя выбрать дату раньше сегодня
						onChange={(event) => {
							onHandleInputChange('startDate', FormatDate(event.nativeEvent.timestamp));
							setShowStartDate(false);
						}}
						value={new Date()}
					/>
				)}

				{/* Поле выбора даты окончания */}
				<TouchableOpacity style={[styles.inputGroup, styles.flex1]} onPress={() => setShowEndDate(true)}>
					<Ionicons name="calendar-outline" size={24} style={styles.icon} />
					<Text style={styles.text}>{formatDateForText(formData?.endDate) ?? 'Дата окончания'}</Text>
				</TouchableOpacity>
				{showEndDate && (
					<RNDateTimePicker
						minimumDate={new Date()} // Нельзя выбрать дату раньше сегодня
						onChange={(event) => {
							onHandleInputChange('endDate', FormatDate(event.nativeEvent.timestamp));
							setShowEndDate(false);
						}}
						value={new Date()}
					/>
				)}
			</View>

			{/* Поле для добавления времени приема */}
			<View style={[styles.dateGroup, { alignItems: 'center' }]}>
				<TouchableOpacity
					style={styles.inputGroup}
					onPress={() => setTimePickerVisible(true)}
				>
					<Ionicons name="alarm-outline" size={24} style={styles.icon} />
					<Text style={styles.text}>Добавить время приема</Text>
				</TouchableOpacity>
				{timePickerVisible && (
					<RNDateTimePicker
						mode="time"
						value={selectedTime}
						onChange={(event) => {
							const time = formatTime(event.nativeEvent.timestamp);
							if (!times.includes(time)) {
								setTimes([...times, time].sort()); // Добавляем время и сортируем
							}
							setTimePickerVisible(false);
						}}
					/>
				)}
			</View>

			{/* Список выбранных времен приема */}
			{times.length > 0 && (
				<View style={styles.selectedTimesContainer}>
					<Text style={styles.sectionTitle}>Выбранные времена приема:</Text>
					<View style={styles.timesList}>
						{times.map((time, index) => (
							<View key={index} style={styles.timeItem}>
								<Text style={styles.timeText}>{time}</Text>
								<TouchableOpacity onPress={() => removeTime(time)}>
									<Ionicons name="close-circle" size={20} color={Colors.ERROR} />
								</TouchableOpacity>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Выбор частоты приема */}
			<View style={styles.inputGroup}>
				<Ionicons name="repeat-outline" size={24} style={styles.icon} />
				<Picker selectedValue={frequency} onValueChange={setFrequency} style={styles.picker}>
					<Picker.Item label="Каждый день" value="daily" />
					<Picker.Item label="Через день" value="every2" />
					<Picker.Item label="По дням недели" value="weekdays" />
				</Picker>
			</View>

			{/* Дни недели (отображаются только если выбрана частота "По дням недели") */}
			{frequency === 'weekdays' && (
				<View style={[styles.inputGroup, { flexWrap: 'wrap', flexDirection: 'row' }]}>
					{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
						<TouchableOpacity
							key={day}
							onPress={() => toggleWeekday(day)}
							style={{
								padding: 8,
								margin: 4,
								borderRadius: 8,
								backgroundColor: weekdays.includes(day) ? Colors.PRIMARY : '#eee',
							}}
						>
							<Text style={{ color: weekdays.includes(day) ? 'white' : 'black' }}>{day}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			{/* Кнопка сохранения */}
			<TouchableOpacity style={styles.button} onPress={SaveMedication} disabled={loading}>
				{loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Добавить лекарство</Text>}
			</TouchableOpacity>
		</View>
	);
}

// Стили компонента
const styles = StyleSheet.create({
	container: { padding: 20, backgroundColor: '#fff' },
	header: { fontSize: 27, fontWeight: 'bold', marginBottom: 10, color: Colors.PRIMARY },
	inputGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.LIGHT_GRAY_BORDER,
		backgroundColor: 'white',
		marginTop: 10,
	},
	textInput: { flex: 1, marginLeft: 10, fontSize: 16 },
	icon: { color: Colors.PRIMARY, borderRightWidth: 1, paddingRight: 12, borderColor: Colors.GRAY },
	dateGroup: { flexDirection: 'row', gap: 10, marginTop: 10 },
	picker: { flex: 1 },
	flex1: { flex: 1 },
	button: {
		padding: 15,
		backgroundColor: Colors.PRIMARY,
		borderRadius: 15,
		width: '100%',
		marginTop: 20,
		alignItems: 'center',
		justifyContent: 'center',
		height: 50,
	},
	buttonText: { fontSize: 17, color: 'white', fontWeight: 'bold' },
	typeListContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
	typeList: { flex: 1 },
	typeButton: { marginLeft: 10, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 30, borderWidth: 1 },
	scrollButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
	doseContainer: { flexDirection: 'row', marginTop: 10 },
	doseInput: { flex: 1, marginLeft: 10, fontSize: 16 },
	dosePicker: { flex: 1, height: 50, color: Colors.PRIMARY },
	text: { fontSize: 16, marginLeft: 10, flex: 1 },
	selectedTimesContainer: {
		marginTop: 15,
		padding: 10,
		backgroundColor: Colors.LIGHT_BACKGROUND,
		borderRadius: 8,
	},
	sectionTitle: {
		fontWeight: 'bold',
		marginBottom: 5,
		color: Colors.PRIMARY,
	},
	timesList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	timeItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'white',
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 15,
		borderWidth: 1,
		borderColor: Colors.LIGHT_GRAY_BORDER,
	},
	timeText: {
		marginRight: 5,
	},
	whenToTakeContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 10,
		gap: 8,
	},
	whenToTakeItem: {
		padding: 10,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: Colors.LIGHT_GRAY_BORDER,
		backgroundColor: 'white',
	},
	whenToTakeItemSelected: {
		backgroundColor: Colors.PRIMARY,
		borderColor: Colors.PRIMARY,
	},
	whenToTakeText: {
		color: 'black',
	},
	whenToTakeTextSelected: {
		color: 'white',
	},
});