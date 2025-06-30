/**
 * Компонент AddNewMedication отвечает за экран добавления нового лекарства.
 * Он включает:
 * - заголовок (AddMedHeader),
 * - форму для заполнения данных о лекарстве (AddMedForm).
 */

// Импорт необходимых компонентов
import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import AddMedHeader from '../../components/AddMedHeader'
import AddMedForm from '../../components/AddMedForm'
export default function AddNewMedication() {
	return (
		<ScrollView >

			{/* Заголовок экрана */}
			<AddMedHeader />

			{/* Форма для добавления информации о лекарстве */}
			<AddMedForm />
		</ScrollView>
	)
}