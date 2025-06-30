// Импорт библиотек и зависимостей
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import Colors from '../../constant/Colors';
import { getLocalStorage } from '../../service/Storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/FirebaseConfig';
import { useEffect, useState } from 'react';
import moment from 'moment';
import 'moment/locale/ru';


/**
 * Компонент Statistics отвечает за отображение статистики приема лекарств.
 * Он предоставляет пользователю возможность просматривать:
 * - календарь с отметками принятых/пропущенных лекарств,
 * - диаграмму со статистикой по выбранной дате,
 * - общее количество принятых и пропущенных лекарств за день.
 */

// Настройка локализации календаря на русский язык
LocaleConfig.locales['ru'] = {
	monthNames: [
		'Январь',
		'Февраль',
		'Март',
		'Апрель',
		'Май',
		'Июнь',
		'Июль',
		'Август',
		'Сентябрь',
		'Октябрь',
		'Ноябрь',
		'Декабрь',
	],
	monthNamesShort: [
		'Янв',
		'Фев',
		'Мар',
		'Апр',
		'Май',
		'Июн',
		'Июл',
		'Авг',
		'Сен',
		'Окт',
		'Ноя',
		'Дек',
	],
	dayNames: [
		'Воскресенье',
		'Понедельник',
		'Вторник',
		'Среда',
		'Четверг',
		'Пятница',
		'Суббота',
	],
	dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
	today: 'Сегодня',
};
LocaleConfig.defaultLocale = 'ru';
moment.locale('ru');

export default function Statistics() {
	const [medications, setMedications] = useState([]);
	const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
	const [stats, setStats] = useState({ taken: 0, missed: 0 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/**
		* Загружает данные пользователя из Firebase
		*/
	useEffect(() => {
		const fetchData = async () => {
			try {
				const user = await getLocalStorage('userDetail');
				if (!user) {
					setError('Пользователь не авторизован');
					setLoading(false);
					return;
				}
				const q = query(collection(db, 'medication'), where('userEmail', '==', user.email));
				const querySnapshot = await getDocs(q);
				const meds = [];
				querySnapshot.forEach((doc) => {
					const data = doc.data();
					if (data.action) {
						const formattedActions = data.action.map((action, index) => ({
							...action,
							id: `${doc.id}-${index}`,
							date: moment(action.date, ['MM/DD/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD']).format('MM/DD/YYYY'),
						}));
						meds.push({ ...data, action: formattedActions });
					} else {
						meds.push(data);
					}
				});
				setMedications(meds);
				setError(null);
			} catch (err) {
				console.error('Ошибка загрузки:', err);
				setError('Ошибка загрузки данных');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);


	/**
	* Обновляет статистику при изменении даты или данных
	*/
	useEffect(() => {
		if (medications.length > 0) {
			calculateDailyStats(selectedDate);
		}
	}, [selectedDate, medications]);

	/**
	 * Подсчет количества принятых и пропущенных лекарств за указанную дату
	 * @param date - строка в формате YYYY-MM-DD
	 */
	const calculateDailyStats = (date) => {
		const formattedSelectedDate = moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY');
		let taken = 0;
		let missed = 0;
		medications.forEach((med) => {
			med.action?.forEach((action) => {
				if (action.date === formattedSelectedDate) {
					if (action.status === 'Taken') taken++;
					else if (action.status === 'Missed') missed++;
				}
			});
		});
		setStats({ taken, missed });
	};

	/**
	 * Формирует объект с датами для отображения точек в календаре
	 * @returns {{}} - объект с разметкой дат
	 */
	const getMarkedDates = () => {
		const markedDates = {};
		medications.forEach((med) => {
			med.action?.forEach((action) => {
				const date = moment(action.date, 'MM/DD/YYYY').format('YYYY-MM-DD');
				if (!markedDates[date]) {
					markedDates[date] = {
						dots: [],
						selected: date === selectedDate,
						selectedColor: Colors.PRIMARY,
					};
				}
				markedDates[date].dots.push({
					key: action.id || `${action.status}-${action.time}`,
					color: action.status === 'Taken' ? Colors.GREEN : Colors.RED,
				});
			});
		});
		return markedDates;
	};

	// Показываем индикатор загрузки, пока данные не получены
	if (loading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color={Colors.PRIMARY} />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}

	// Данные для графика
	const chartData = [
		{
			id: 'taken',
			name: 'Принято',
			count: stats.taken,
			color: Colors.GREEN,
			legendFontColor: Colors.BLACK,
			legendFontSize: 15,
		},
		{
			id: 'missed',
			name: 'Пропущено',
			count: stats.missed,
			color: Colors.RED,
			legendFontColor: Colors.BLACK,
			legendFontSize: 15,
		},
	];

	// JSX-разметка
	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Статистика приема лекарств</Text>

			{/* Календарь с отметками */}
			<Calendar
				markedDates={getMarkedDates()}
				onDayPress={(day) => setSelectedDate(day.dateString)}
				markingType={'multi-dot'}
				theme={{
					calendarBackground: 'white',
					textSectionTitleColor: Colors.PRIMARY,
					todayTextColor: Colors.PRIMARY,
					dayTextColor: 'black',
					arrowColor: Colors.PRIMARY,
					monthTextColor: Colors.PRIMARY,
					textDayFontWeight: 'bold',
					textMonthFontWeight: 'bold',
					textDayHeaderFontWeight: 'bold',
				}}
				firstDay={1}
				monthFormat={'MMMM yyyy'}
			/>

			{/* Отображение выбранной даты */}
			<Text style={styles.dateTitle}>
				{moment(selectedDate).format('D MMMM YYYY')}
			</Text>

			{/* График и статистика */}
			{stats.taken > 0 || stats.missed > 0 ? (
				<>
					<PieChart
						data={chartData}
						width={300}
						height={200}
						chartConfig={{
							color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
						}}
						accessor="count"
						backgroundColor="transparent"
						paddingLeft="12"
						absolute
						style={styles.chart}
					/>

				</>
			) : (
				<Text style={styles.emptyText}>Нет данных за выбранный день</Text>
			)}
		</ScrollView>
	);
}

// Стили
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: 'white',
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: Colors.BLACK,
		textAlign: 'center',
		marginTop: 35,
	},
	dateTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginVertical: 15,
		textAlign: 'center',
		color: Colors.GRAY,
	},
	chart: {
		alignSelf: 'center',
		marginVertical: 20,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 15,
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	colorIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 5,
	},
	statText: {
		fontSize: 16,
	},
	emptyText: {
		textAlign: 'center',
		fontSize: 16,
		color: Colors.GRAY,
		marginTop: 40,
	},
	errorText: {
		color: Colors.RED,
		fontSize: 16,
		textAlign: 'center',
	},
});
