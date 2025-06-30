// Импорт необходимных библиотек и модулей
import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

/**
 * Компонент AddMedHeader отвечает за отображение шапки экрана добавления лекарства.
 * Он включает:
 * - фоновое изображение,
 * - кнопку "Назад" для навигации на предыдущий экран.
 */
export default function AddMedHeader() {
	const router = useRouter();
	return (
		<View>
			<Image source={require('./../assets/images/consult.jpg')}
				style={{
					height: "270",
					width: '100%',
					marginTop: 37,
				}}
			/>
			<TouchableOpacity style={{
				position: 'absolute',
				padding: 25,
				marginTop: 37,
			}}
				onPress={() => router.back()}
			>
				<Ionicons name="arrow-back" size={24} color="black" />
			</TouchableOpacity>
		</View>
	)
}