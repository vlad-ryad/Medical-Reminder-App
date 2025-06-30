// Импорт необходимных библиотек и модулей
import { View, Text, Image, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getLocalStorage } from '../service/Storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../constant/Colors';
import { useRouter } from 'expo-router';

/**
 * Компонент Header — это шапка приложения, отображающая:
 * - приветствие с именем пользователя,
 * - изображение,
 * - кнопку добавления нового лекарства.
 *
 * Данные пользователя загружаются из локального хранилища.
 */

export default function Header() {
	const [user, setUser] = useState(null);
	const router = useRouter();


	/**
	* Загружает данные текущего пользователя при монтировании компонента
	*/
	useEffect(() => {
		GetUserDetail();
	}, []);


	/**
	 * Получает данные пользователя из локального хранилища
	 */
	const GetUserDetail = async () => {
		try {
			const userInfo = await getLocalStorage('userDetail');
			console.log(userInfo);
			setUser(userInfo);
		} catch (error) {
			console.error('Ошибка при получении сведений о пользователе:', error);
		}
	};
	return (

		<View style={{
			marginTop: 20
		}}>
			<View style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				width: '100%'
			}}>
				<View style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 10,
				}}>
					<Image
						source={require('./../assets/images/happy.png')}
						style={{
							width: 34,
							height: 34,
						}}
					/>
					<Text style={{
						fontSize: 25,
						fontWeight: 'bold',
					}}>Привет, {user?.displayName} 👋</Text>
				</View>
				<TouchableOpacity onPress={() => router.push('/add-new-medication')}>
					<Ionicons name="add-circle-sharp" size={38} color={Colors.PRIMARY} />
				</TouchableOpacity>
			</View>
		</View>
	);
}
