// Импорт необходимых библиотек и модулей
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constant/Colors';
import { getLocalStorage, setLocalStorage } from '../../service/Storage';
import { updateProfile, updatePassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config/FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';


/**
 * Компонент EditProfile позволяет пользователю:
 * - изменить имя,
 * - загрузить аватар,
 * - изменить пароль,
 * - сохранить изменения в Firebase Auth, Firestore и локальном хранилище.
 *
 * Обязательно требует авторизации. Если пользователь не авторизован — перенаправляет на экран входа.
 */
export default function EditProfile() {
	const [displayName, setDisplayName] = useState('');
	const [avatar, setAvatar] = useState(null);
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	/**
	 * Загружает данные текущего пользователя при монтировании компонента
	 */
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				const storedUser = await getLocalStorage('userDetail');
				setDisplayName(firebaseUser.displayName || storedUser?.displayName || '');
				setAvatar(firebaseUser.photoURL || storedUser?.photoURL || null);
			} else {
				// Пользователь не авторизован — показываем ошибку и отправляем на вход
				Alert.alert('Ошибка', 'Вы не авторизованы. Пожалуйста, войдите снова.');
				router.replace('/login');
			}
		});
		return () => unsubscribe();
	}, []);

	/**
   * Открывает галерею для выбора изображения
   */
	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.5,
		});

		if (!result.canceled) {
			setAvatar(result.assets[0].uri);
		}
	};

	/**
	* Сохраняет изменения профиля (имя, аватар, пароль)
	*/
	const saveChanges = async () => {
		if (newPassword && newPassword !== confirmPassword) {
			Alert.alert('Ошибка', 'Пароли не совпадают');
			return;
		}

		try {
			setLoading(true);
			const user = auth.currentUser;
			if (!user) throw new Error('Вы не авторизованы');

			// Обновляем Firebase Auth
			await updateProfile(user, {
				displayName: displayName.trim(),
				photoURL: avatar || null,
			});

			if (newPassword.trim().length > 0) {
				await updatePassword(user, newPassword);
			}

			// Обновляем локальное хранилище
			await setLocalStorage('userDetail', {
				uid: user.uid,
				userEmail: user.email,
				displayName: displayName.trim(),
				photoURL: avatar || null,
			});

			// Обновляем Firestore
			await setDoc(doc(db, 'users', user.uid), {
				displayName: displayName.trim(),
				email: user.email,
				photoURL: avatar || null,
				password: newPassword || null, //
				updatedAt: new Date().toISOString(),
			}, { merge: true });

			Alert.alert('Успешно', 'Профиль обновлён');
			router.back();
		} catch (error) {
			console.error('Ошибка при обновлении профиля:', error);
			Alert.alert('Ошибка', error.message || 'Не удалось обновить профиль');
		} finally {
			setLoading(false);
		}
	};

	// JSX-разметка
	return (
		<View style={styles.container}>
			<Text style={styles.header}>Редактировать профиль</Text>

			<TouchableOpacity onPress={pickImage}>
				<Image
					source={avatar ? { uri: avatar } : require('../../assets/images/happy.png')}
					style={styles.avatar}
				/>
				<Ionicons name="pencil" size={22} color={Colors.PRIMARY} style={styles.editIcon} />
			</TouchableOpacity>

			<TextInput
				style={styles.input}
				placeholder="Имя"
				value={displayName}
				onChangeText={setDisplayName}
			/>

			<TextInput
				style={styles.input}
				placeholder="Новый пароль"
				value={newPassword}
				onChangeText={setNewPassword}
				secureTextEntry
			/>

			<TextInput
				style={styles.input}
				placeholder="Подтвердите пароль"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
				secureTextEntry
			/>

			<TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={loading}>
				{loading ? (
					<ActivityIndicator color="white" />
				) : (
					<Text style={styles.saveButtonText}>Сохранить</Text>
				)}
			</TouchableOpacity>
		</View>
	);
}

// Стили
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 25,
		backgroundColor: '#fff',
		alignItems: 'center',
		marginTop: 10
	},
	header: {
		fontSize: 26,
		fontWeight: 'bold',
		marginBottom: 20,
		color: Colors.BLACK,
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		marginBottom: 10,
		borderWidth: 2,
		borderColor: Colors.PRIMARY,
	},
	editIcon: {
		position: 'absolute',
		right: -10,
		bottom: 0,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 4,
	},
	input: {
		width: '100%',
		borderWidth: 1,
		borderColor: Colors.GRAY,
		borderRadius: 10,
		padding: 12,
		fontSize: 16,
		marginVertical: 8,
	},
	saveButton: {
		backgroundColor: Colors.PRIMARY,
		padding: 15,
		borderRadius: 10,
		marginTop: 20,
		width: '100%',
		alignItems: 'center',
	},
	saveButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: '600',
	},
});
