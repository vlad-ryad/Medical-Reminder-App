// Импорт необходимых модулей и компонентов
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import Colors from '../../constant/Colors';
import { useRouter } from 'expo-router';

/**
 * Компонент LoginScreen — это начальный экран приложения, который приветствует пользователя.
 * Он содержит:
 * - изображение,
 * - заголовок и описание,
 * - кнопку для продолжения на экран входа/регистрации.
 *
 * Цель: мотивировать пользователя начать использовать приложение и перейти к авторизации.
 */
export default function LoginScreen() {

	const router = useRouter();
	return (
		<View style={styles.container}>

			{/* Блок с изображением сверху */}
			<View style={styles.imageContainer}>
				<Image
					source={require('./../../assets/images/login.jpg')}
					style={styles.image}
				/>
			</View>

			{/* Основной контент: заголовок, текст, кнопка и примечание */}
			<View style={styles.contentContainer}>
				<Text style={styles.title}>Оставайтесь на верном пути, будьте здоровы!</Text>
				<Text style={styles.subtitle}>
					Контролируйте прием лекарств вместе с нами. Будьте последовательны и уверены в себе
				</Text>

				{/* Кнопка перехода на экран входа */}
				<TouchableOpacity style={styles.button} onPress={() => router.push('login/signIn')}>
					<Text style={styles.buttonText}>Продолжить</Text>
				</TouchableOpacity>

				{/* Текст с соглашением */}
				<Text style={styles.note}>
					Примечание: Нажимая кнопку Продолжить, Вы соглашаетесь с нашими положениями и условиями
				</Text>
			</View>
		</View>
	);
}

// Стили для компонента
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.PRIMARY,
	},
	imageContainer: {
		display: 'flex',
		alignItems: 'center',
		marginTop: 36,
	},
	image: {
		width: 350,
		height: 325,
		borderRadius: 23,
	},
	contentContainer: {
		flex: 1,
		padding: 20,
		backgroundColor: Colors.PRIMARY,
	},
	title: {
		fontSize: 30,
		fontWeight: 'bold',
		color: 'white',
		textAlign: 'center',
		padding: 5,
	},
	subtitle: {
		color: 'white',
		fontSize: 17,
		textAlign: 'center',
		marginTop: 15,
	},
	button: {
		padding: 15,
		backgroundColor: 'white',
		borderRadius: 23,
		marginTop: 25,
	},
	buttonText: {
		textAlign: 'center',
		fontSize: 16,
		color: Colors.PRIMARY,
	},
	note: {
		color: 'white',
		marginTop: 4,
		textAlign: 'center',
	},
});