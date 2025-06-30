// Импорт необходимых компонентов и библиотек
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import Colors from '../../constant/Colors';
import moment from 'moment';
import { GetPreviousDateRangeToDisplay } from '../../service/ConvertDateTime';
import { getLocalStorage } from '../../service/Storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/FirebaseConfig';
import MedicationCardItem from '../../components/MedicationCardItem';
import { useRouter } from 'expo-router';

/**
 * Компонент History - отображает историю приема лекарств за выбранные даты
 * Позволяет выбирать дату и просматривать соответствующие записи о приеме лекарств
 */
export default function History() {
	// Состояния компонента
	const [dateRange, setDateRange] = useState();
	const [selectedDate, setSelectedDate] = useState(moment().format('MM/DD/YYYY'));
	const [loading, setLoading] = useState(false);
	const [medList, setMedList] = useState([]);
	const router = useRouter();

	// Эффект для загрузки данных при монтировании и изменении выбранной даты
	useEffect(() => {
		GetDateList();
		GetMedicationList(selectedDate);
	}, [selectedDate]);

	/**
	 * Функция GetDateList - получает список дат для отображения в горизонтальном скролле
	 */
	const GetDateList = () => {
		const date = GetPreviousDateRangeToDisplay();
		setDateRange(date);
	};

	/**
	 * Функция GetMedicationList - загружает список лекарств для выбранной даты из Firestore
	 * @param {string} selectedDate - Выбранная дата в формате MM/DD/YYYY
	 */
	const GetMedicationList = async (selectedDate) => {
		setLoading(true);
		const user = await getLocalStorage('userDetail');
		setMedList([]); // Очищаем предыдущий список

		try {
			// Формируем запрос к Firestore
			const q = query(
				collection(db, "medication"),
				where("userEmail", "==", user?.email),
				where('dates', 'array-contains', selectedDate)
			);

			const querySnapshot = await getDocs(q);

			// Обрабатываем результаты запроса
			querySnapshot.forEach((doc) => {
				console.log('docID' + doc.id + '==>', doc.data());
				setMedList((prev) => [...prev, { ...doc.data(), docId: doc.id }]);
			});

			setLoading(false);
		} catch (e) {
			console.log(e);
			setLoading(false);
		}
	};

	/**
	 * Функция handleMedicationPress - обработчик нажатия на карточку лекарства
	 * @param {object} item - Объект с данными о лекарстве
	 */
	const handleMedicationPress = (item) => {
		router.push({
			pathname: '/action-modal',
			params: {
				...item,
				docId: item.docId,
				selectedDate: selectedDate
			}
		});
	};

	// Рендер компонента
	return (
		<FlatList
			data={[]}
			style={{
				backgroundColor: 'white',
				height: '100%'
			}}
			ListHeaderComponent={
				<View style={styles.mainContainer}>
					{/* Баннер с изображением */}
					<Image
						source={require('./../../assets/images/med-history.jpg')}
						style={styles.imgBanner}
					/>

					{/* Заголовок страницы */}
					<Text style={styles.header}>История приема лекарств</Text>

					{/* Горизонтальный список дат */}
					<FlatList
						data={dateRange}
						horizontal
						style={{ marginTop: 15 }}
						showsHorizontalScrollIndicator={false}
						renderItem={({ item, index }) => (
							<TouchableOpacity
								style={[
									styles.dateGroup,
									{
										backgroundColor: item?.formattedDate == selectedDate
											? Colors.PRIMARY
											: Colors.LIGHT_GRAY_BORDER
									}
								]}
								onPress={() => {
									setSelectedDate(item.formattedDate);
								}}
							>
								<Text style={[styles.day, { color: item?.formattedDate == selectedDate ? 'white' : 'black' }]}>
									{item.day}
								</Text>
								<Text style={[styles.date, { color: item?.formattedDate == selectedDate ? 'white' : 'black' }]}>
									{item.date}
								</Text>
							</TouchableOpacity>
						)}
					/>

					{/* Условный рендеринг списка лекарств или сообщения об отсутствии данных */}
					{medList.length > 0 ? (
						<>
							<FlatList
								data={medList}
								onRefresh={() => GetMedicationList(selectedDate)}
								refreshing={loading}
								renderItem={({ item, index }) => (
									<TouchableOpacity onPress={() => handleMedicationPress(item)}>
										<MedicationCardItem medicine={item} selectedDate={selectedDate} />
									</TouchableOpacity>
								)}
							/>
							{/* Отображение выбранной даты */}
							<Text style={styles.selectedDateText}>
								{moment(selectedDate, ['MM/DD/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY')}
							</Text>
						</>
					) : (
						<>
							<Text style={{
								fontSize: 25,
								padding: 30,
								fontWeight: 'bold',
								color: Colors.GRAY,
								textAlign: 'center'
							}}>
								История пуста
							</Text>
							{/* Отображение выбранной даты даже при пустой истории */}
							<Text style={styles.selectedDateText}>
								{moment(selectedDate, ['MM/DD/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY')}
							</Text>
						</>
					)}
				</View>
			}
		/>
	);
}

// Стили компонента
const styles = StyleSheet.create({
	mainContainer: {
		padding: 25,
		backgroundColor: 'white',
	},
	imgBanner: {
		width: '100%',
		height: 200,
		borderRadius: 15,
		marginTop: 10
	},
	header: {
		fontSize: 25,
		fontWeight: 'bold',
		marginTop: 20
	},
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
	selectedDateText: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.DARK_GRAY,
		textAlign: 'center',
		marginTop: 10,
	}
});