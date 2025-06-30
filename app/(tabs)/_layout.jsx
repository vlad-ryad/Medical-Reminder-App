// Импорт необходимых компонентов и библиотек
import { View, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/FirebaseConfig';
import { getLocalStorage } from '../../service/Storage';

/**
 * Основной компонент TabLayout - реализует нижнюю панель навигации (табы) в приложении
 * Проверяет авторизацию пользователя и перенаправляет на страницу входа при необходимости
 */
export default function TabLayout() {
	const router = useRouter(); // Хук для навигации

	// Эффект для проверки авторизации при монтировании компонента
	useEffect(() => {
		GetUserDetail();
	}, []);

	/**
	 * Функция GetUserDetail - проверяет наличие данных пользователя в локальном хранилище
	 * Если данные отсутствуют - перенаправляет на страницу входа
	 */
	const GetUserDetail = async () => {
		const userInfo = await getLocalStorage('userDetail');
		if (!userInfo) {
			router.replace('/login');
		}
	};

	// Рендер компонента с настройками табов
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: '#9966CC',
			}}
		>
			{/* Главная страница */}
			<Tabs.Screen
				name="index"
				options={{
					tabBarLabel: "Главная",
					tabBarIcon: ({ color, size }) => (
						<FontAwesome name="home" size={size} color={color} />
					),
				}}
			/>

			{/* Страница истории */}
			<Tabs.Screen
				name="History"
				options={{
					tabBarLabel: "История",
					tabBarIcon: ({ color, size }) => (
						<FontAwesome name="history" size={size} color={color} />
					),
				}}
			/>

			{/* Страница статистики */}
			<Tabs.Screen
				name="Statistics"
				options={{
					tabBarLabel: "Статистика",
					tabBarIcon: ({ color, size }) => (
						<FontAwesome name="bar-chart" size={size} color={color} />
					),
				}}
			/>

			{/* Страница отчетов */}
			<Tabs.Screen
				name="Report"
				options={{
					tabBarLabel: "Отчеты",
					tabBarIcon: ({ color, size }) => (
						<FontAwesome name="file-text-o" size={size} color={color} />
					),
				}}
			/>

			{/* Страница профиля */}
			<Tabs.Screen
				name="Profile"
				options={{
					tabBarLabel: "Профиль",
					tabBarIcon: ({ color, size }) => (
						<FontAwesome name="user" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}