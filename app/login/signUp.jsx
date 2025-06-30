// Импорт необходимых модулей и библиотек
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constant/Colors';
import { useRouter } from 'expo-router';
import { auth } from './../../config/FirebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setLocalStorage } from '../../service/Storage'; // Импортируем функцию для сохранения данных
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/FirebaseConfig';
import moment from "moment";

/**
 * Компонент SignUp отвечает за экран регистрации нового пользователя.
 * Он позволяет:
 * - ввести имя, email и пароль,
 * - проверить корректность данных,
 * - создать аккаунт через Firebase Auth,
 * - сохранить дополнительные данные пользователя в Firestore и AsyncStorage.
 */
export default function SignUp() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [userName, setUserName] = useState('');
	const [errors, setErrors] = useState({});

	/**
	 * Валидация формы перед отправкой
	 * @returns {boolean} — true, если форма прошла проверку
	 */
	const validateForm = () => {
		let errors = {};

		if (!userName) {
			errors.userName = 'Пожалуйста, введите ваше имя';
		}

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

		if (!confirmPassword) {
			errors.confirmPassword = 'Пожалуйста, подтвердите пароль';
		} else if (password !== confirmPassword) {
			errors.confirmPassword = 'Пароли не совпадают';
		}

		setErrors(errors);
		return Object.keys(errors).length === 0;
	};

	/**
	 * Обработчик нажатия на кнопку "Создать аккаунт"
	 * Выполняет регистрацию через Firebase Auth и Firestore
	 */
	const onCreateAccount = () => {
		if (validateForm()) {
			createUserWithEmailAndPassword(auth, email, password)
				.then(async (userCredential) => {

					const user = userCredential.user;
					// Создаем запись в коллекции `users`
					await setDoc(doc(db, 'users', user.uid), {
						uid: user.uid,
						userEmail: user.email,
						displayName: userName,
						createdAt: moment().format("DD.MM.YYYY, HH:mm:ss"),
					});
					// Обновляем профиль пользователя с именем
					await updateProfile(user, {
						displayName: userName,
					});

					// Сохраняем данные пользователя в AsyncStorage
					await setLocalStorage('userDetail', user);

					Alert.alert('Успешно', 'Аккаунт успешно создан!');
					router.push('(tabs)'); // Переход на главный экран
				})
				.catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;

					// Обработка ошибок Firebase
					switch (errorCode) {
						case 'auth/email-already-in-use':
							Alert.alert('Ошибка', 'Этот email уже используется.');
							break;
						case 'auth/invalid-email':
							Alert.alert('Ошибка', 'Некорректный email.');
							break;
						case 'auth/weak-password':
							Alert.alert('Ошибка', 'Пароль слишком слабый.');
							break;
						default:
							Alert.alert('Ошибка', 'Произошла ошибка при регистрации.');
							console.error(errorCode, errorMessage);
					}
				});
		}
	};

	// JSX-разметка
	return (
		<View style={styles.container}>
			<Text style={styles.textHeader}>Создать аккаунт</Text>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Имя</Text>
				<TextInput
					placeholder="Введите ваше имя"
					style={styles.textInput}
					onChangeText={(value) => setUserName(value)}
				/>
				{errors.userName && <Text style={styles.errorText}>{errors.userName}</Text>}
			</View>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Email</Text>
				<TextInput
					placeholder="Введите ваш email"
					style={styles.textInput}
					keyboardType="email-address"
					onChangeText={(value) => setEmail(value)}
				/>
				{errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
			</View>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Пароль</Text>
				<TextInput
					placeholder="Введите ваш пароль"
					style={styles.textInput}
					secureTextEntry={true}
					onChangeText={(value) => setPassword(value)}
				/>
				{errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
			</View>

			<View style={styles.inputContainer}>
				<Text style={styles.label}>Подтвердите пароль</Text>
				<TextInput
					placeholder="Повторите ваш пароль"
					style={styles.textInput}
					secureTextEntry={true}
					onChangeText={(value) => setConfirmPassword(value)}
				/>
				{errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
			</View>

			<TouchableOpacity style={styles.button} onPress={onCreateAccount}>
				<Text style={styles.buttonText}>Создать аккаунт</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.buttonLogin}
				onPress={() => router.push('login/signIn')}
			>
				<Text style={styles.buttonLoginText}>Уже есть аккаунт? Войти</Text>
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
		marginBottom: 5,
		marginTop: 15,
	},
	inputContainer: {
		marginTop: 15,
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
	buttonLogin: {
		padding: 15,
		backgroundColor: 'white',
		borderRadius: 15,
		marginTop: 20,
		borderWidth: 1,
		borderColor: Colors.PRIMARY,
	},
	buttonLoginText: {
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