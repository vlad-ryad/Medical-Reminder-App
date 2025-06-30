// Импорт необходимых библиотек и модулей
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import React, { useState, useRef } from 'react';
import { shareAsync } from 'expo-sharing'; // Библиотека для экспорта файлов
import * as FileSystem from 'expo-file-system'; // Работа с файловой системой
import { getLocalStorage } from '../../service/Storage'; // Получение данных пользователя
import { collection, getDocs, query, where } from 'firebase/firestore'; // Firebase Firestore
import { db } from '../../config/FirebaseConfig'; // Конфигурация подключения к Firebase
import moment from 'moment'; // Работа с датами
import 'moment/locale/ru'; // Локализация на русский язык
import Colors from '../../constant/Colors'; // Цветовая палитра

/**
 * Компонент Reports — формирует отчеты о приеме лекарств за разные периоды времени.
 * Отчет можно:
 * - сгенерировать за неделю, месяц, год и т.д.
 * - экспортировать в CSV для печати или анализа
 */
export default function Reports() {
	// Состояния
	const [loading, setLoading] = useState(false); // Состояние загрузки
	const [reportData, setReportData] = useState(null); // Данные отчета
	const [userDetails, setUserDetails] = useState(null); // Информация о пользователе
	const [selectedPeriod, setSelectedPeriod] = useState(null); // Выбранный временной интервал
	const scrollViewRef = useRef(null); // Для прокрутки экрана

	/**
	 * Перевод статуса приёма на русский
	 * @param status - строка ('Taken' или 'Missed')
	 * @returns {'Принято'|'Пропущено'}
	 */
	const translateStatus = (status) => {
		return status === 'Taken' ? 'Принято' : 'Пропущено';
	};

	/**
	 * Перевод временных меток приёма в строку
	 * @param whenToTakeArray - массив временных меток
	 * @returns строка с перечислением
	 */
	const translateWhenToTake = (whenToTakeArray) => {
		if (!whenToTakeArray || !Array.isArray(whenToTakeArray) || whenToTakeArray.length === 0) {
			return '';
		}
		return whenToTakeArray.join(', ');
	};

	/**
	 * Перевод типа частоты приёма на русский
	 * @param frequency - тип частоты ('daily', 'every2', 'weekdays')
	 */
	const translateFrequency = (frequency) => {
		const translations = {
			'daily': 'Ежедневно',
			'every2': 'Через день',
			'weekdays': 'По дням недели'
		};
		return translations[frequency] || frequency;
	};

	/**
	 * Перевод дней недели в строку
	 * @param weekdays - массив дней недели
	 */
	const translateWeekdays = (weekdays) => {
		if (!weekdays || !Array.isArray(weekdays) || weekdays.length === 0) {
			return '';
		}
		return weekdays.join(', ');
	};

	/**
	 * Получает название типа лекарства
	 * @param type - объект типа лекарства
	 */
	const getMedicationType = (type) => {
		if (!type || typeof type !== 'object') return '';
		return type.name || '';
	};

	/**
	 * Генерирует отчет за выбранный период
	 * @param period - временной интервал
	 */
	const generateReport = async (period) => {
		setLoading(true);
		setSelectedPeriod(period);

		try {
			const user = await getLocalStorage('userDetail');
			if (!user?.email) {
				Alert.alert('Ошибка', 'Пользователь не авторизован');
				return;
			}

			setUserDetails(user);

			// Запрос к Firestore: получаем все лекарства пользователя
			const q = query(collection(db, "medication"), where("userEmail", "==", user.email));
			const querySnapshot = await getDocs(q);
			const medsData = [];

			querySnapshot.forEach((doc) => {
				const data = doc.data();
				const medInfo = {
					name: data.name,
					dose: data.dose,
					whenToTake: data.whenToTake,
					when: data.when,
					type: getMedicationType(data.type),
					frequency: data.frequency,
					weekdays: data.weekdays,
					times: data.times || [],
					mealOffset: data.mealOffset,
					startDate: data.startDate,
					endDate: data.endDate,
					actions: []
				};

				// Обрабатываем действия по приёму лекарства
				if (data.action) {
					medInfo.actions = data.action.map(action => ({
						...action,
						date: moment(action.date, ['MM/DD/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD']).format('DD.MM.YYYY')
					}));
				}

				medsData.push(medInfo);
			});

			// Группируем данные по датам и временам приёма
			const groupedByDate = {};
			medsData.forEach(med => {
				med.actions.forEach(action => {
					if (!groupedByDate[action.date]) {
						groupedByDate[action.date] = {};
					}

					const medKey = `${med.name}_${action.time || 'unknown'}`;
					if (!groupedByDate[action.date][medKey]) {
						groupedByDate[action.date][medKey] = {
							name: med.name,
							dose: med.dose,
							whenToTake: med.whenToTake,
							when: med.when,
							type: med.type,
							frequency: med.frequency,
							weekdays: med.weekdays,
							times: med.times,
							mealOffset: med.mealOffset,
							intakes: [] // Массив всех действий по приёму
						};
					}

					groupedByDate[action.date][medKey].intakes.push({
						status: action.status,
						time: action.time
					});
				});
			});

			// Определяем начальную дату в зависимости от выбранного периода
			const now = moment();
			let startDate;

			switch (period) {
				case 'week':
					startDate = now.clone().subtract(1, 'weeks');
					break;
				case 'twoWeeks':
					startDate = now.clone().subtract(2, 'weeks');
					break;
				case 'month':
					startDate = now.clone().subtract(1, 'months');
					break;
				case 'threeMonths':
					startDate = now.clone().subtract(3, 'months');
					break;
				case 'halfYear':
					startDate = now.clone().subtract(6, 'months');
					break;
				case 'year':
					startDate = now.clone().subtract(1, 'years');
					break;
				default:
					startDate = now.clone().subtract(1, 'months');
			}

			// Фильтруем данные по дате
			const filteredData = {};
			Object.keys(groupedByDate).forEach(date => {
				const momentDate = moment(date, 'DD.MM.YYYY');
				if (momentDate.isSameOrAfter(startDate)) {
					filteredData[date] = groupedByDate[date];
				}
			});

			setReportData(filteredData);

			// Прокручиваем вниз после загрузки отчета
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 300);

			return filteredData;

		} catch (error) {
			console.error('Ошибка генерации отчета:', error);
			Alert.alert('Ошибка', 'Не удалось сформировать отчет');
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Экспорт отчета в формате CSV
	 */
	const exportToCSV = async () => {
		if (!reportData || !userDetails) return;
		setLoading(true);

		try {
			let csvContent = '\uFEFF'; // BOM для UTF-8
			csvContent += 'sep=;\n'; // Разделитель для Excel Windows

			csvContent += `Отчет о приеме лекарств\n`;
			csvContent += `Период: ${getPeriodName(selectedPeriod)}\n`;
			csvContent += `Пациент: ${userDetails.displayName || userDetails.email}\n`;

			csvContent += "Дата;Лекарство;Тип;Дозировка;Когда принимать;Частота приема;Дни недели;Времена приема;Статус;Время приема\n";

			// Сортируем и формируем содержимое CSV
			Object.keys(reportData)
				.sort((a, b) => moment(a, 'DD.MM.YYYY').diff(moment(b, 'DD.MM.YYYY')))
				.forEach(date => {
					if (reportData[date]) {
						Object.values(reportData[date]).forEach(med => {
							if (med.intakes && med.intakes.length > 0) {
								med.intakes.forEach(intake => {
									csvContent += `"${date}";`;
									csvContent += `"${med.name}";`;
									csvContent += `"${med.type || ''}";`;
									csvContent += `"${med.dose}";`;
									csvContent += `"${translateWhenToTake(med.whenToTake) || med.when || ''}";`;
									csvContent += `"${translateFrequency(med.frequency)}";`;
									csvContent += `"${translateWeekdays(med.weekdays)}";`;
									csvContent += `"${med.times ? med.times.join(', ') : ''}";`;
									csvContent += `"${translateStatus(intake.status)}";`;
									csvContent += `"${intake.time}"\n`;
								});
							}
						});
					}
				});

			// Сохраняем файл
			const fileUri = FileSystem.documentDirectory + `Отчет_приёма_лекарств_${moment().format('DD-MM-YYYY')}.csv`;
			await FileSystem.writeAsStringAsync(fileUri, csvContent, {
				encoding: FileSystem.EncodingType.UTF8
			});

			// Открываем диалог экспорта файла
			await shareAsync(fileUri, {
				mimeType: 'text/csv',
				dialogTitle: 'Экспортировать отчет',
				UTI: 'public.comma-separated-values-text'
			});
		} catch (error) {
			console.error('Ошибка экспорта:', error);
			Alert.alert('Ошибка', 'Не удалось экспортировать отчет');
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Возвращает человекочитаемое название периода
	 * @param period - ключевой период
	 */
	const getPeriodName = (period) => {
		const periods = {
			'week': 'За неделю',
			'twoWeeks': 'За 2 недели',
			'month': 'За месяц',
			'threeMonths': 'За 3 месяца',
			'halfYear': 'За полгода',
			'year': 'За год'
		};
		return periods[period] || '';
	};

	// JSX-разметка
	return (
		<ScrollView
			ref={scrollViewRef}
			style={styles.scrollContainer}
			contentContainerStyle={styles.scrollContent}
		>
			<View style={styles.container}>
				{/* Заголовок */}
				<Text style={styles.title}>Отчеты о приеме лекарств</Text>

				{/* Информация о пользователе */}
				{userDetails && (
					<Text style={styles.userInfo}>
						Пользователь: {userDetails.displayName || userDetails.email}
					</Text>
				)}

				{/* Кнопки выбора периода */}
				<View style={styles.buttonsContainer}>
					<View style={styles.buttonRow}>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'week' && styles.selectedButton]}
							onPress={() => generateReport('week')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>Неделя</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'twoWeeks' && styles.selectedButton]}
							onPress={() => generateReport('twoWeeks')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>2 недели</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.buttonRow}>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'month' && styles.selectedButton]}
							onPress={() => generateReport('month')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>Месяц</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'threeMonths' && styles.selectedButton]}
							onPress={() => generateReport('threeMonths')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>3 месяца</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.buttonRow}>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'halfYear' && styles.selectedButton]}
							onPress={() => generateReport('halfYear')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>Полгода</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.periodButton, selectedPeriod === 'year' && styles.selectedButton]}
							onPress={() => generateReport('year')}
							disabled={loading}
						>
							<Text style={styles.periodButtonText}>Год</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Отображение отчета и кнопки экспорта */}
				{reportData && (
					<>
						{/* Кнопка экспорта в CSV */}
						<TouchableOpacity
							style={styles.exportButton}
							onPress={exportToCSV}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="white" size="small" />
							) : (
								<Text style={styles.buttonText}>Экспорт отчета</Text>
							)}
						</TouchableOpacity>

						{/* Тело отчета */}
						<View style={styles.reportContainer}>
							<Text style={styles.reportTitle}>
								Отчет: {getPeriodName(selectedPeriod)} ({moment().subtract(1, selectedPeriod.replace('threeMonths', 'months').replace('halfYear', 'months')).format('DD.MM.YYYY')} - {moment().format('DD.MM.YYYY')})
							</Text>
							{Object.keys(reportData).sort((a, b) => moment(a, 'DD.MM.YYYY').diff(moment(b, 'DD.MM.YYYY'))).map(date => (
								<View key={date} style={styles.dateSection}>
									<Text style={styles.dateHeader}>{date}</Text>
									{reportData[date] && Object.values(reportData[date]).map((med, index) => (
										<View key={index} style={styles.medItem}>
											<View style={styles.medMainInfo}>
												<View style={styles.medHeader}>
													<Text style={styles.medName}>{med.name}</Text>
													{med.type && <Text style={styles.medType}>({med.type})</Text>}
												</View>
												<Text style={styles.medDose}>Дозировка: {med.dose}</Text>
												{med.whenToTake && med.whenToTake.length > 0 ? (
													<Text style={styles.medWhen}>
														{translateWhenToTake(med.whenToTake)}
														{med.mealOffset && <Text style={styles.mealOffset}> ({med.mealOffset} мин)</Text>}
													</Text>
												) : med.when && (
													<Text style={styles.medWhen}>
														{med.when}
														{med.mealOffset && <Text style={styles.mealOffset}> ({med.mealOffset} мин)</Text>}
													</Text>
												)}
												<View style={styles.additionalInfo}>
													{med.frequency && <Text style={styles.infoText}>Частота приема: {translateFrequency(med.frequency)}</Text>}
													{med.weekdays && med.weekdays.length > 0 && <Text style={styles.infoText}>Дни: {translateWeekdays(med.weekdays)}</Text>}
													{med.times && med.times.length > 0 && <Text style={styles.infoText}>Время приема: {med.times.join(', ')}</Text>}
												</View>
											</View>
											<View style={styles.medStatusContainer}>
												{med.intakes && med.intakes.length > 0 ? (
													<>
														{med.intakes.map((intake, intakeIndex) => (
															<View key={intakeIndex} style={styles.intakeItem}>
																<Text style={[
																	styles.medStatus,
																	intake.status === 'Taken' ? styles.taken : styles.missed
																]}>
																	{translateStatus(intake.status)}
																</Text>
																<Text style={styles.medTime}>в {intake.time}</Text>
															</View>
														))}
														{med.intakes.length > 1 && (
															<Text style={styles.intakeCount}>
																Всего приемов: {med.intakes.length}
															</Text>
														)}
													</>
												) : (
													<Text style={styles.noData}>Нет данных</Text>
												)}
											</View>
										</View>
									))}
								</View>
							))}
						</View>
					</>
				)}
			</View>
		</ScrollView>
	);
}

// Стили компонента
const styles = StyleSheet.create({
	scrollContainer: {
		flex: 1,
		backgroundColor: 'white',
	},
	scrollContent: {
		paddingBottom: 40,
	},
	container: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: Colors.BLACK,
		textAlign: 'center',
		marginTop: 35,
	},
	userInfo: {
		fontSize: 16,
		marginBottom: 15,
		textAlign: 'center',
		color: Colors.BLACK,
	},
	buttonsContainer: {
		marginBottom: 20,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	periodButton: {
		backgroundColor: Colors.LIGHT_GRAY_BORDER,
		padding: 12,
		borderRadius: 10,
		alignItems: 'center',
		flex: 1,
		marginHorizontal: 5,
	},
	selectedButton: {
		backgroundColor: Colors.PRIMARY,
	},
	periodButtonText: {
		color: Colors.BLACK,
		fontSize: 16,
		fontWeight: '500',
	},
	exportButton: {
		backgroundColor: Colors.GREEN,
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 20,
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '500',
	},
	reportContainer: {
		borderWidth: 1,
		borderColor: Colors.LIGHT_GRAY_BORDER,
		borderRadius: 10,
		padding: 15,
		marginBottom: 20,
	},
	reportTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 10,
		color: Colors.BLACK,
		textAlign: 'center',
	},
	dateSection: {
		marginBottom: 15,
	},
	dateHeader: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.PRIMARY,
		marginBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: Colors.LIGHT_GRAY_BORDER,
		paddingBottom: 4,
	},
	medItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingLeft: 10,
		paddingRight: 5,
		paddingVertical: 8,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
		borderLeftWidth: 3,
		borderLeftColor: Colors.PRIMARY,
	},
	medMainInfo: {
		flex: 1,
		marginRight: 10,
	},
	medHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	medName: {
		fontSize: 16,
		color: Colors.BLACK,
		fontWeight: 'bold',
	},
	medType: {
		fontSize: 12,
		color: Colors.DARK_GRAY,
		marginLeft: 5,
		fontStyle: 'italic',
	},
	medDose: {
		fontSize: 14,
		color: Colors.BLACK,
		marginBottom: 2,
	},
	medWhen: {
		fontSize: 13,
		color: Colors.DARK_GRAY,
		marginBottom: 6,
	},
	mealOffset: {
		fontSize: 12,
		color: Colors.PRIMARY,
		fontWeight: '500',
	},
	additionalInfo: {
		backgroundColor: '#ffffff',
		padding: 6,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	infoText: {
		fontSize: 12,
		color: Colors.DARK_GRAY,
		marginBottom: 2,
	},
	medStatusContainer: {
		alignItems: 'flex-end',
		justifyContent: 'center',
		minWidth: 100,
	},
	intakeItem: {
		alignItems: 'flex-end',
		marginBottom: 4,
		paddingVertical: 2,
		paddingHorizontal: 6,
		backgroundColor: 'rgba(255,255,255,0.7)',
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	medStatus: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 1,
	},
	medTime: {
		fontSize: 11,
		color: Colors.DARK_GRAY,
	},
	intakeCount: {
		fontSize: 10,
		color: Colors.PRIMARY,
		fontWeight: '500',
		marginTop: 4,
		textAlign: 'center',
	},
	noData: {
		fontSize: 12,
		color: Colors.DARK_GRAY,
		fontStyle: 'italic',
	},
	taken: {
		color: Colors.GREEN,
	},
	missed: {
		color: Colors.RED,
	},
});