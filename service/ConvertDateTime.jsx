import moment from "moment";
import "moment/locale/ru";

// Устанавливаем локаль на русский
moment.locale("ru");

/**
 * Файл: ConvertDateTime.js
 * Назначение: предоставляет функции форматирования дат, времени и генерации диапазонов дат.
 * Использует библиотеку `moment` с русской локалью для корректного отображения на русском языке.
 */

/**
 * Преобразует таймстамп в объект Date
 * @param {number} timestamp - число в миллисекундах
 * @returns {Date} - объект Date
 */
export const FormatDate = (timestamp) => new Date(timestamp);

/**
 * Форматирует дату для отображения (например, "05.04.2025")
 * @param {string|Date} date - исходная дата
 * @returns {string} - отформатированная дата
 */
export const formatDateForText = (date) => moment(date).format('ll');

/**
 * Форматирует время для отображения (HH:mm)
 * @param {number} timestamp - таймстамп в миллисекундах
 * @returns {string} - отформатированное время
 */
export const formatTime = (timestamp) => {
	const date = new Date(timestamp);
	return date.toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	});
};

/**
 * Генерирует массив всех дат между startDate и endDate (включительно)
 * @param {string} startDate - начальная дата в формате DD.MM.YYYY
 * @param {string} endDate - конечная дата в формате DD.MM.YYYY
 * @returns {string[]} - массив дат в формате DD.MM.YYYY
 * @throws {Error} - если даты не заданы или невалидны
 */

export const getDatesRange = (startDate, endDate) => {
	if (!startDate || !endDate) throw new Error("Необходимо указать начальную и конечную даты.");
	const start = moment(startDate, 'DD.MM.YYYY');
	const end = moment(endDate, 'DD.MM.YYYY');

	if (!start.isValid() || !end.isValid()) return "Некорректный диапазон дат";

	const dates = [];
	while (start.isSameOrBefore(end)) {
		dates.push(start.format('DD.MM.YYYY'));
		start.add(1, 'days');
	}
	return dates;
};

// Получаем диапазон дат на 14 дней вперед (например, для отображения в календаре)
export const GetDateRangeToDisplay = () => {
	const dateList = [];
	for (let i = 0; i < 14; i++) {
		dateList.push({
			date: moment().add(i, 'days').format('DD'),
			day: moment().add(i, 'days').format('dd'),
			formattedDate: moment().add(i, 'days').format('L'),
		})
	}
	return dateList;
}

// Получаем диапазон дат на 14 дней назад
export const GetPreviousDateRangeToDisplay = () => {
	const dateList = [];
	for (let i = 0; i < 24; i++) {
		dateList.push({
			date: moment().subtract(i, 'days').format('DD'),
			day: moment().subtract(i, 'days').format('dd'),
			formattedDate: moment().subtract(i, 'days').format('L'),
		});
	}
	return dateList;
};

// Форматирует дату для отображения в UI
export const formatDateForDisplay = (dateString) => {
	if (!dateString) return 'Не указана';

	const date = moment(dateString, ['MM/DD/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD']);
	return date.isValid() ? date.format('DD.MM.YYYY') : 'Некорректная дата';
};