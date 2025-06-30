// Импорт необходимых библиотек и модулей
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constant/Colors';
import { useRouter } from 'expo-router';
import { auth } from './../../config/FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { setLocalStorage } from '../../service/Storage'; // Импортируем функцию для сохранения данных

/**
 * Компонент SignIn отвечает за экран входа пользователя в приложение.
 * Он позволяет:
 * - ввести email и пароль,
 * - проверить данные через Firebase Auth,
 * - перенаправить пользователя на главный экран,
 * - сохранить данные пользователя в AsyncStorage.
 */

export default function SignIn() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState({});

	/**
	* Валидация формы перед отправкой
	* @returns {boolean} — true, если форма прошла проверку
	*/

	const validateForm = () => {
		let errors = {};

		if (!email) {
			errors.email = 'Пожалуйста, введите email';
		} else if (!/\S+@\S+\.\S+/.test(email)) {
			errors.email = 'Некорректный формат email';
		}

		if (!password) {
			errors.password = 'Пожалуйста, введите пароль';
		} else if (password.length < 6) {
			errors.password = 'Пароль должен содержать минимум 6 символов';
		}

		setErrors(errors);
		return Object.keys(errors).length === 0;
	};

	/**
	 * Обработчик нажатия на кнопку "Войти"
	 * Выполняет вход через Firebase Auth и сохраняет данные пользователя
	 */
	const OnSignInClick = () => {
		if (validateForm()) {
			signInWithEmailAndPassword(auth, email, password)
				.then(async (userCredential) => {
					// Успешный вход
					const user = userCredential.user;

					// Сохраняем данные пользователя в AsyncStorage
					await setLocalStorage('userDetail', user);

					Alert.alert('Успешно', 'Вход выполнен успешно!');
					router.push('(tabs)'); // Переход на главный экран
				})
				.catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;

					// Обработка ошибок Firebase
					switch (errorCode) {
						case 'auth/invalid-email':
							Alert.alert('Ошибка', 'Некорректный email.');
							break;
						case 'auth/user-not-found':
							Alert.alert('Ошибка', 'Пользователь с таким email не найден.');
							break;
						case 'auth/wrong-password':
							Alert.alert('Ошибка', 'Неверный пароль.');
							break;
						default:
							Alert.alert('Ошибка', 'Произошла ошибка при входе.');
							console.error(errorCode, errorMessage);
					}
				});
		}
	};

	// JSX-разметка
	return (
		<View style={styles.container}>
			<Text style={styles.textHeader}>Давайте войдем</Text>
			<Text style={styles.subText}>Добро пожаловать обратно</Text>
			<Text style={styles.subText}>Мы скучали по вам!</Text>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Email</Text>
				<TextInput
					placeholder="Введите ваш email"
					style={styles.textInput}
					accessible
					accessibilityLabel="Поле для ввода email"
					keyboardType="email-address"
					textContentType="emailAddress"
					onChangeText={(value) => setEmail(value)}
				/>
				{errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
			</View>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Пароль</Text>
				<TextInput
					placeholder="Введите ваш пароль"
					style={styles.textInput}
					secureTextEntry={true}
					accessible
					accessibilityLabel="Поле для ввода пароля"
					textContentType="password"
					onChangeText={(value) => setPassword(value)}
				/>
				{errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
			</View>

			<TouchableOpacity style={styles.button} onPress={OnSignInClick} accessible accessibilityLabel="Кнопка входа">
				<Text style={styles.buttonText}>Войти</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.buttonCreate}
				onPress={() => router.push('login/signUp')}
				accessible
				accessibilityLabel="Кнопка создания аккаунта"
			>
				<Text style={styles.buttonCreateText}>Создать аккаунт</Text>
			</TouchableOpacity>
		</View>
	);
}

// Стили
const styles = StyleSheet.create({
	container: {
		padding: 25,
		backgroundColor: Colors.BACKGROUND,
		flex: 1,
	},
	textHeader: {
		fontSize: 30,
		fontWeight: 'bold',
		marginBottom: 10,
		marginTop: 15,
	},
	subText: {
		fontSize: 18,
		fontWeight: '500',
		marginTop: 10,
		color: Colors.GRAY,
	},
	inputContainer: {
		marginTop: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5,
		color: Colors.PRIMARY,
	},
	textInput: {
		padding: 10,
		borderWidth: 1,
		borderColor: Colors.GRAY,
		borderRadius: 10,
		fontSize: 17,
		backgroundColor: 'white',
		marginTop: 5,
	},
	button: {
		padding: 15,
		backgroundColor: Colors.PRIMARY,
		borderRadius: 15,
		marginTop: 35,
	},
	buttonText: {
		fontSize: 17,
		color: 'white',
		textAlign: 'center',
	},
	buttonCreate: {
		padding: 15,
		backgroundColor: 'white',
		borderRadius: 15,
		marginTop: 20,
		borderWidth: 1,
		borderColor: Colors.PRIMARY,
	},
	buttonCreateText: {
		fontSize: 17,
		color: Colors.PRIMARY,
		textAlign: 'center',
	},
	errorText: {
		color: 'red',
		fontSize: 14,
		marginTop: 5,
	},
});