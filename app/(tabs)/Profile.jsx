import { View, Text, StyleSheet, Alert, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constant/Colors';
import { getLocalStorage, RemoveLocalStorage } from '../../service/Storage';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth } from '../../config/FirebaseConfig';
import { signOut } from 'firebase/auth';
import * as Notifications from 'expo-notifications';

/**
 * Компонент Profile - экран профиля пользователя
 * Отображает:
 * - Информацию о пользователе
 * - Кнопки основных действий
 * - Возможность выхода из системы
 */
export default function Profile() {
	// Состояния компонента
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [logoutLoading, setLogoutLoading] = useState(false);
	const router = useRouter();

	/**
	 * Эффект для загрузки данных пользователя при фокусе на экран
	 * Использует useFocusEffect вместо useEffect для обработки возврата на экран
	 */
	useFocusEffect(
		React.useCallback(() => {
			let isActive = true;

			const fetchUserDetails = async () => {
				try {
					setLoading(true);
					const userDetails = await getLocalStorage('userDetail');

					// Проверка наличия данных пользователя
					if (userDetails && isActive) {
						setUser(userDetails);
					} else {
						Alert.alert('Ошибка', 'Данные пользователя не найдены');
						router.replace('/login');
					}
				} catch (error) {
					console.error('Ошибка загрузки данных пользователя:', error);
					Alert.alert('Ошибка', 'Не удалось загрузить данные пользователя');
				} finally {
					if (isActive) setLoading(false);
				}
			};

			fetchUserDetails();

			// Функция очистки эффекта
			return () => {
				isActive = false;
			};
		}, [])
	);

	/**
	 * Функция handleLogout - обработчик выхода из системы
	 * Выполняет:
	 * - Сброс бейджей уведомлений
	 * - Выход из Firebase Auth
	 * - Очистку локального хранилища
	 * - Перенаправление на экран входа
	 */
	const handleLogout = async () => {
		try {
			setLogoutLoading(true);
			// Очистка уведомлений
			await Notifications.setBadgeCountAsync(0);
			await Notifications.dismissAllNotificationsAsync();

			// Выход из системы
			await signOut(auth);
			await RemoveLocalStorage();

			// Перенаправление на экран входа
			router.replace('/login');
		} catch (error) {
			console.error('Ошибка при выходе:', error);
			Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
		} finally {
			setLogoutLoading(false);
		}
	};

	// Отображение индикатора загрузки при получении данных
	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={Colors.PRIMARY} />
			</View>
		);
	}

	// Основной рендер компонента
	return (
		<View style={styles.container}>
			{/* Шапка с заголовком и кнопкой выхода */}
			<View style={styles.headerContainer}>
				<Text style={styles.profileTitle}>Профиль</Text>
				<TouchableOpacity
					onPress={handleLogout}
					style={styles.logoutButton}
					disabled={logoutLoading}
				>
					{logoutLoading ? (
						<ActivityIndicator size="small" color={Colors.PRIMARY} />
					) : (
						<Ionicons name="exit-outline" size={28} color={Colors.PRIMARY} />
					)}
				</TouchableOpacity>
			</View>

			{/* Секция с информацией о пользователе */}
			<View style={styles.profileSection}>
				<TouchableOpacity
					onPress={() => router.push('/profile/edit-profile')}
					style={styles.editButton}
				>
					<Ionicons name="pencil" size={20} color={Colors.PRIMARY} />
				</TouchableOpacity>

				{/* Аватар пользователя */}
				<Image
					source={user?.photoURL ? { uri: user.photoURL } : require('./../../assets/images/happy.png')}
					style={styles.profilePic}
				/>

				{/* Имя и email пользователя */}
				<Text style={styles.userName}>{user?.displayName || 'Имя не указано'}</Text>
				<Text style={styles.userEmail}>{user?.email || 'Email не указан'}</Text>
			</View>

			{/* Секция с кнопками действий */}
			<View style={styles.buttonsContainer}>
				{/* Кнопка управления лекарствами */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={() => router.push('/manage-medications')}
						style={styles.button}
					>
						<Ionicons name="medical" size={22} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.buttonText}>Управление лекарствами</Text>
				</View>

				{/* Кнопка перехода к списку лекарств */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={() => router.push('/(tabs)')}
						style={styles.button}
					>
						<Ionicons name="medkit-outline" size={22} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.buttonText}>Мои лекарства</Text>
				</View>

				{/* Кнопка перехода к истории */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={() => router.push('/History')}
						style={styles.button}
					>
						<Ionicons name="time-outline" size={22} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.buttonText}>История</Text>
				</View>

				{/* Кнопка перехода к статистике */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={() => router.push('/Statistics')}
						style={styles.button}
					>
						<Ionicons name="stats-chart" size={22} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.buttonText}>Статистика</Text>
				</View>

				{/* Кнопка перехода к отчетам */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={() => router.push('/Report')}
						style={styles.button}
					>
						<Ionicons name="document-text-outline" size={22} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.buttonText}>Отчеты</Text>
				</View>
			</View>
		</View>
	);
}

// Стили компонента
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f7f7f7',
		paddingHorizontal: 20,
		paddingTop: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
	},
	profileTitle: {
		fontSize: 26,
		fontWeight: 'bold',
		color: Colors.BLACK,
	},
	logoutButton: {
		padding: 8,
	},
	profileSection: {
		alignItems: 'center',
		marginBottom: 15,
		paddingVertical: 20,
		paddingHorizontal: 25,
		backgroundColor: '#fff',
		borderRadius: 20,
		shadowColor: Colors.BLACK,
		shadowOpacity: 0.1,
		shadowRadius: 15,
		elevation: 6,
	},
	profilePic: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 4,
		borderColor: Colors.BLUE_VIOLET,
		marginBottom: 15,
	},
	userName: {
		fontSize: 24,
		fontWeight: '600',
		color: Colors.BLACK,
		marginBottom: 5,
	},
	userEmail: {
		fontSize: 16,
		color: '#555',
		marginBottom: 20,
	},
	buttonsContainer: {
		width: '100%',
		marginTop: 20,
	},
	buttonContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 15,
	},
	button: {
		backgroundColor: Colors.PRIMARY,
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 15,
		elevation: 5,
		shadowOpacity: 0.2,
		marginRight: 10,
	},
	buttonText: {
		fontSize: 16,
		color: Colors.BLUE_VIOLET,
		fontWeight: '700',
	},
	editButton: {
		position: 'absolute',
		top: 15,
		right: 15,
		backgroundColor: 'white',
		padding: 8,
		borderRadius: 20,
		zIndex: 1,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
});
