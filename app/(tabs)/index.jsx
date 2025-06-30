// Импорт необходимых компонентов и библиотек
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native'
import React from 'react'
import { Redirect } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../config/FirebaseConfig'
import Header from '../../components/Header'
import EmptyState from '../../components/EmptyState';
import MedicationList from '../../components/MedicationList'
import { useRouter } from 'expo-router';

/**
 * Компонент HomeScreen - главный экран приложения
 * Отображает:
 * - Шапку (Header)
 * - Список лекарств (MedicationList)
 * Использует FlatList для оптимизации рендеринга
 */
export default function HomeScreen() {
	const router = useRouter(); // Хук навигации

	// Рендер главного экрана
	return (
		/**
		 * FlatList используется даже для статического контента для:
		 * - Оптимизации производительности
		 * - Единообразия с другими экранами
		 * 
		 * data={[]} - пустой массив данных, так как весь контент в ListHeaderComponent
		 */
		<FlatList
			data={[]} // Пустые данные, так как используем только ListHeaderComponent
			ListHeaderComponent={
				<View style={{
					padding: 25,
					backgroundColor: 'white',
					height: '100%',
					width: '100%'
				}}>
					{/* Компонент заголовка экрана */}
					<Header />

					{/* Компонент списка лекарств - основной контент страницы */}
					<MedicationList />
				</View>
			}
		/>
	);
}
