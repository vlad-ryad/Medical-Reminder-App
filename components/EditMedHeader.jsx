// Импорт необходимых библиотек и модулей
import { View, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Компонент EditMedHeader отвечает за отображение заголовка на экране редактирования лекарства.
 * Он включает:
 * - фоновое изображение,
 * - кнопку "Назад", которая возвращает пользователя на предыдущий экран.
 */
export default function EditMedHeader() {
	const router = useRouter();
	return (
		<View>
			<Image
				source={require('../assets/images/consult.jpg')}
				style={{ height: 270, width: '100%', marginTop: 37, }}
			/>
			<TouchableOpacity
				style={{ position: 'absolute', padding: 25, marginTop: 37, }}
				onPress={() => router.back()}
			>
				<Ionicons name="arrow-back" size={24} color="black" />
			</TouchableOpacity>
		</View>
	);
}