import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	FlatList,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../constant/Colors';
import { TypeList, WhenToTake, DoseTypes } from '../constant/Options';
import { Picker } from '@react-native-picker/picker';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { FormatDate, formatDateForText, formatTime, getDatesRange } from '../service/ConvertDateTime';
import { db } from '../config/FirebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { scheduleNotificationsForMedication, cancelAllNotifications } from '../service/NotificationService';

/**
 * Компонент EditMedForm — форма редактирования лекарства.
 * Позволяет пользователю изменить все параметры лекарства
 * с сохранением в Firebase и обновлением уведомлений.
 */
export default function EditMedForm({ medicationData }) {
	// Состояние формы для хранения данных о лекарстве
	const [formData, setFormData] = useState({
		name: '',
		type: null,
		doseValue: '',
		doseType: 'таб.',
		dose: '',
		when: WhenToTake[0],
		startDate: null,
		endDate: null,
	});

	// Состояния для отображения календарей
	const [showStartDate, setShowStartDate] = useState(false);
	const [showEndDate, setShowEndDate] = useState(false);

	// Состояние загрузки
	const [loading, setLoading] = useState(false);

	// Времена приёма лекарства
	const [times, setTimes] = useState([]);

	// Отображение пикера времени
	const [timePickerVisible, setTimePickerVisible] = useState(false);

	// Выбранное время
	const [selectedTime, setSelectedTime] = useState(new Date());

	// Частота приёма
	const [frequency, setFrequency] = useState('daily');

	// Дни недели (для частоты "по дням недели")
	const [weekdays, setWeekdays] = useState([]);

	// Смещение времени относительно еды (в минутах)
	const [mealOffset, setMealOffset] = useState('30');

	// Выбранные временные метки приёма (например, "Утром", "Перед обедом" и т.д.)
	const [selectedWhenToTake, setSelectedWhenToTake] = useState([]);

	// Хук для навигации между экранами
	const router = useRouter();

	// Ссылка на FlatList для горизонтального скролла
	const flatListRef = useRef(null);

	// Маппинг временных меток на конкретные часы
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

	// Инициализация данных из medicationData при монтировании компонента
	useEffect(() => {
		if (medicationData) {
			const doseParts = medicationData.dose?.split(' ') || ['', 'таб.'];
			const parseDate = (dateString) => {
				if (!dateString) return null;
				const date = new Date(dateString);
				return !isNaN(date.getTime()) ? FormatDate(date) : null;
			};
			setFormData({
				name: medicationData.name || '',
				type: medicationData.type || null,
				doseValue: doseParts[0] || '',
				doseType: doseParts[1] || 'таб.',
				dose: medicationData.dose || '',
				when: medicationData.when || WhenToTake[0],
				startDate: parseDate(medicationData.dates?.[0]) || parseDate(medicationData.startDate),
				endDate: parseDate(medicationData.dates?.[medicationData.dates.length - 1]) || parseDate(medicationData.endDate),
			});
			if (medicationData.times && Array.isArray(medicationData.times)) {
				setTimes(medicationData.times);
			} else if (medicationData.reminder) {
				setTimes([medicationData.reminder]);
			}
			setFrequency(medicationData.frequency || 'daily');
			if (medicationData.weekdays && Array.isArray(medicationData.weekdays)) {
				setWeekdays(medicationData.weekdays);
			}
			if (medicationData.mealOffset) {
				setMealOffset(medicationData.mealOffset.toString());
			}
			if (medicationData.whenToTake && Array.isArray(medicationData.whenToTake)) {
				setSelectedWhenToTake(medicationData.whenToTake);
			}
		}
	}, [medicationData]);

	// Обновление дозировки при изменении значения или типа
	useEffect(() => {
		if (formData.doseValue && formData.doseType) {
			onHandleInputChange('dose', `${formData.doseValue} ${formData.doseType}`);
		}
	}, [formData.doseValue, formData.doseType]);

	// Функция для прокрутки списка типов лекарств влево
	const scrollLeft = () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

	// Функция для прокрутки списка типов лекарств вправо
	const scrollRight = () => flatListRef.current?.scrollToEnd({ animated: true });

	// Обработчик изменения полей формы
	const onHandleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	// Валидация формы перед отправкой
	const validateForm = () => {
		const { name, type, dose, startDate, endDate } = formData;
		if (!name || !type || !dose || !startDate || !endDate || times.length === 0) {
			Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля и добавьте хотя бы одно время приёма');
			return false;
		}
		return true;
	};

	// Переключение временной метки (например, "Утром", "Перед обедом")
	const toggleWhenToTake = (item) => {
		setSelectedWhenToTake(prev =>
			prev.includes(item)
				? prev.filter(i => i !== item)
				: [...prev, item]
		);
		const mappedTime = timeMapping[item];
		if (mappedTime) {
			setTimes(prev =>
				prev.includes(mappedTime)
					? prev.filter(t => t !== mappedTime)
					: [...prev, mappedTime].sort()
			);
		}
	};

	// Обновление данных о лекарстве в Firebase и настройка уведомлений
	const updateMedication = async () => {
		if (!validateForm()) return;
		if (!medicationData?.docId && !medicationData?.id) {
			Alert.alert('Ошибка', 'Не удалось найти идентификатор лекарства');
			return;
		}
		const docId = medicationData.docId || medicationData.id;
		const dates = getDatesRange(formData?.startDate, formData?.endDate);
		setLoading(true);
		try {
			await cancelAllNotifications(docId); // Отменяем старые уведомления

			// Подготавливаем данные для обновления
			const updateData = {
				...formData,
				dates,
				times,
				frequency,
				weekdays: frequency === 'weekdays' ? weekdays : [],
				mealOffset: ['before', 'after'].includes(formData?.when) ? parseInt(mealOffset) : null,
				whenToTake: selectedWhenToTake,
			};

			// Обновляем документ в Firestore
			await updateDoc(doc(db, 'medication', docId), updateData);

			// Создаем новые уведомления
			const docData = {
				...updateData,
				docId,
				userEmail: medicationData.userEmail,
			};
			await scheduleNotificationsForMedication(docData);

			// Сообщение об успешном обновлении
			Alert.alert('Успешно', 'Лекарство успешно обновлено', [
				{ text: 'OK', onPress: () => router.back() }
			]);
		} catch (e) {
			console.error(e);
			Alert.alert('Ошибка', 'Не удалось обновить лекарство');
		} finally {
			setLoading(false);
		}
	};

	// Переключение дня недели (для режима "по дням недели")
	const toggleWeekday = (day) => {
		setWeekdays(prev =>
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
		);
	};

	// Удаление времени приёма
	const removeTime = (timeToRemove) => {
		setTimes(times.filter(time => time !== timeToRemove));
	};

	// JSX-разметка формы редактирования
	return (
		<View style={styles.container}>
			{/* Заголовок */}
			<Text style={styles.header}>Редактировать лекарство</Text>

			{/* Поле ввода названия лекарства */}
			<View style={styles.inputGroup}>
				<Ionicons name="medkit-outline" size={24} style={styles.icon} />
				<TextInput
					placeholder="Название лекарства"
					style={styles.textInput}
					value={formData.name}
					onChangeText={(value) => onHandleInputChange('name', value)}
				/>
			</View>

			{/* Горизонтальный список типов лекарств */}
			<View style={styles.typeListContainer}>
				<TouchableOpacity style={styles.scrollButton} onPress={scrollLeft}>
					<Ionicons name="chevron-back" size={24} color={Colors.PRIMARY} />
				</TouchableOpacity>
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
				<TouchableOpacity style={styles.scrollButton} onPress={scrollRight}>
					<Ionicons name="chevron-forward" size={24} color={Colors.PRIMARY} />
				</TouchableOpacity>
			</View>

			{/* Ввод дозировки */}
			<View style={styles.doseContainer}>
				<View style={[styles.inputGroup, { flex: 2.1 }]}>
					<Ionicons name="eyedrop-outline" size={24} style={styles.icon} />
					<TextInput
						placeholder="Количество"
						style={styles.doseInput}
						keyboardType="numeric"
						value={formData.doseValue}
						onChangeText={(value) => setFormData(prev => ({
							...prev,
							doseValue: value.replace(/[^0-9]/g, '')
						}))}
					/>
				</View>
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

			{/* Выбор времени приема */}
			<View style={styles.inputGroup}>
				<Ionicons name="time-outline" size={24} style={styles.icon} />
				<Text style={styles.label}>Когда принимать:</Text>
			</View>
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

			{/* Ввод времени до/после еды */}
			{['before', 'after'].includes(formData?.when) && (
				<View style={styles.inputGroup}>
					<Ionicons name="timer-outline" size={24} style={styles.icon} />
					<TextInput
						placeholder="Минут до/после еды"
						value={mealOffset}
						onChangeText={setMealOffset}
						keyboardType="numeric"
						style={styles.textInput}
					/>
				</View>
			)}

			{/* Выбор дат начала и окончания */}
			<View style={styles.dateGroup}>
				<TouchableOpacity style={[styles.inputGroup, styles.flex1]} onPress={() => setShowStartDate(true)}>
					<Ionicons name="calendar-outline" size={24} style={styles.icon} />
					<Text style={styles.text}>{formatDateForText(formData?.startDate) ?? 'Дата начала'}</Text>
				</TouchableOpacity>
				{showStartDate && (
					<RNDateTimePicker
						minimumDate={new Date()}
						onChange={(event) => {
							onHandleInputChange('startDate', FormatDate(event.nativeEvent.timestamp));
							setShowStartDate(false);
						}}
						value={formData.startDate ? new Date(formData.startDate) : new Date()}
					/>
				)}
				<TouchableOpacity style={[styles.inputGroup, styles.flex1]} onPress={() => setShowEndDate(true)}>
					<Ionicons name="calendar-outline" size={24} style={styles.icon} />
					<Text style={styles.text}>{formatDateForText(formData?.endDate) ?? 'Дата окончания'}</Text>
				</TouchableOpacity>
				{showEndDate && (
					<RNDateTimePicker
						minimumDate={new Date()}
						onChange={(event) => {
							onHandleInputChange('endDate', FormatDate(event.nativeEvent.timestamp));
							setShowEndDate(false);
						}}
						value={formData.endDate ? new Date(formData.endDate) : new Date()}
					/>
				)}
			</View>

			{/* Добавление времени приёма через TimePicker */}
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
								setTimes([...times, time].sort());
							}
							setTimePickerVisible(false);
						}}
					/>
				)}
			</View>

			{/* Отображение выбранных времен приёма */}
			{times.length > 0 && (
				<View style={styles.selectedTimesContainer}>
					<Text style={styles.sectionTitle}>Выбранные времена приема:</Text>
					<View style={styles.timesList}>
						{times.map((time, index) => (
							<View key={index} style={styles.timeItem}>
								<Text style={styles.timeText}>{time}</Text>
								<TouchableOpacity onPress={() => removeTime(time)}>
									<Ionicons name="close-circle" size={20} color={Colors.ERROR || Colors.PRIMARY} />
								</TouchableOpacity>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Выбор частоты приёма */}
			<View style={styles.inputGroup}>
				<Ionicons name="repeat-outline" size={24} style={styles.icon} />
				<Picker selectedValue={frequency} onValueChange={setFrequency} style={styles.picker}>
					<Picker.Item label="Каждый день" value="daily" />
					<Picker.Item label="Через день" value="every2" />
					<Picker.Item label="По дням недели" value="weekdays" />
				</Picker>
			</View>

			{/* Выбор дней недели (если выбран соответствующий режим) */}
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
			<TouchableOpacity style={styles.button} onPress={updateMedication} disabled={loading}>
				{loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Сохранить изменения</Text>}
			</TouchableOpacity>
		</View>
	);
}

// Стили
const styles = StyleSheet.create({
	container: { padding: 20, backgroundColor: '#fff' },
	header: { fontSize: 25, fontWeight: 'bold', marginBottom: 15, color: Colors.PRIMARY },
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
		marginTop: 25,
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
	label: { fontSize: 16, fontWeight: '400', marginBottom: 1, color: Colors.BLACK },
	selectedTimesContainer: {
		marginTop: 15,
		padding: 10,
		backgroundColor: Colors.LIGHT_BACKGROUND || '#f5f5f5',
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