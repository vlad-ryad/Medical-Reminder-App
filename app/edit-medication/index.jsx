// Импорт необходимых библиотек и компонентов
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import React from 'react';
import EditMedHeader from '../../components/EditMedHeader';
import EditMedForm from '../../components/EditMedForm';
import { useLocalSearchParams } from 'expo-router';


/**
 * Компонент EditMedication отвечает за экран редактирования информации о лекарстве.
 * Он включает:
 * - заголовок (EditMedHeader),
 * - форму редактирования (EditMedForm),
 * - передачу данных о лекарстве через параметры маршрута.
 */

/**
 * Основной компонент для редактирования лекарства
 * @returns {JSX.Element} - экран с формой редактирования лекарства
 */

export default function EditMedication() {
	const params = useLocalSearchParams();

	return (
		<ScrollView>

			{/* Заголовок экрана */}
			<EditMedHeader />

			{/* Форма редактирования лекарства с передачей данных через props */}
			<EditMedForm
				medicationData={{
					id: params.id,
					name: params.name,
					type: params.type,
					dose: params.dose,
					when: params.when,
					...params,
					dates: params.dates ? JSON.parse(params.dates) : [],
					reminder: params.reminder
				}}
			/>
		</ScrollView>
	);
}